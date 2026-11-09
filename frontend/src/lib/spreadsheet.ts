import { blankDraft, type ProductDraft } from "@/lib/product-draft";

/** A shop can hold 200 products, so a bigger sheet can't be saved in one go. */
export const MAX_ROWS = 200;

type Column = "name" | "price" | "category" | "unit" | "description" | "stock";

/**
 * Header words owners are likely to use, in English and Hindi. Headers are
 * compared lowercased with spaces and punctuation removed.
 */
const HEADERS: Record<Column, string[]> = {
  name: ["name", "product", "productname", "item", "itemname", "naam", "नाम", "उत्पाद", "सामान"],
  price: ["price", "rate", "mrp", "sellingprice", "priceinrupees", "pricers", "rs", "rupees", "daam", "keemat", "दाम", "कीमत", "मूल्य", "रेट"],
  category: ["category", "group", "section", "type", "shelf", "श्रेणी", "समूह"],
  unit: ["unit", "size", "pack", "packsize", "quantity", "qty", "weight", "per", "मात्रा", "वजन", "पैक"],
  description: ["description", "details", "about", "note", "notes", "विवरण"],
  stock: ["stock", "instock", "available", "availability", "स्टॉक"],
};

const normalise = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[\s_\-().:₹/]/g, "");

const cellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

/** Works out which column holds what. Returns null when there's no name column. */
function mapColumns(header: unknown[]) {
  const columns: Partial<Record<Column, number>> = {};
  header.forEach((cell, index) => {
    const key = normalise(cell);
    for (const [column, words] of Object.entries(HEADERS) as [Column, string[]][]) {
      if (columns[column] === undefined && words.includes(key)) columns[column] = index;
    }
  });
  return columns.name === undefined ? null : columns;
}

/** "₹1,250", "1250.00" or "100 - 200" as rupee numbers, kept as text for the form. */
function parsePrice(text: string): Pick<ProductDraft, "kind" | "price" | "priceMax"> {
  const numbers = (text.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const [low, high] = numbers;
  if (low === undefined) return { kind: "request", price: "", priceMax: "" };
  if (high !== undefined && high > low) return { kind: "range", price: String(low), priceMax: String(high) };
  return { kind: "fixed", price: String(low), priceMax: "" };
}

const OUT_OF_STOCK = ["no", "n", "false", "0", "out", "outofstock", "नहीं", "nahi"];

export type SheetResult =
  | { ok: true; drafts: ProductDraft[]; skipped: number; truncated: boolean }
  | { ok: false; code: "sheetEmpty" | "sheetNoName" };

/** Turns spreadsheet rows, header first, into product forms for the owner to check. */
export function draftsFromRows(rows: unknown[][]): SheetResult {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cellText(cell) !== ""));
  if (headerIndex === -1) return { ok: false, code: "sheetEmpty" };

  const columns = mapColumns(rows[headerIndex] ?? []);
  if (!columns) return { ok: false, code: "sheetNoName" };

  const read = (row: unknown[], column: Column) => {
    const index = columns[column];
    return index === undefined ? "" : cellText(row[index]);
  };

  const drafts: ProductDraft[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const name = read(row, "name").slice(0, 120);
    if (!name) {
      if (row.some((cell) => cellText(cell) !== "")) skipped += 1;
      continue;
    }
    // Names must be unique in a shop, so a repeated row would only fail to save.
    if (seen.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    seen.add(name.toLowerCase());

    const stock = normalise(read(row, "stock"));
    drafts.push({
      ...blankDraft,
      name,
      ...parsePrice(read(row, "price")),
      category: read(row, "category").slice(0, 60),
      unit: read(row, "unit").slice(0, 40),
      description: read(row, "description").slice(0, 500),
      is_available: !OUT_OF_STOCK.includes(stock),
    });
  }

  if (drafts.length === 0) return { ok: false, code: "sheetEmpty" };
  return { ok: true, drafts: drafts.slice(0, MAX_ROWS), skipped, truncated: drafts.length > MAX_ROWS };
}

/** Splits CSV text into rows, handling quoted cells with commas, quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
