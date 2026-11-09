"use client";

import { ArrowDown, ArrowUp, Camera, Copy, FileSpreadsheet, Mic, Plus, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createProduct,
  deleteProduct,
  extractProducts,
  readProductPhoto,
  reorderProducts,
  transcribeProducts,
  updateProduct,
} from "@/app/product-actions";
import { Price, ProductThumb, Variety } from "@/components/storefront/parts";
import { MAX_SECONDS, useRecorder } from "@/components/voice/use-recorder";
import {
  blankDraft,
  draftFromProduct,
  draftFromRow,
  payloadFromDraft,
  type ProductDraft,
  type ProductPayload,
} from "@/lib/product-draft";
import { draftsFromRows, parseCsv, type SheetResult } from "@/lib/spreadsheet";
import type { ProductRow } from "@/lib/storefront";
import { shrink, UploadTracker } from "./photo-upload";
import { ProductFields, type ShopKind } from "./product-fields";

const button = "rounded-md px-4 py-2 font-medium transition-colors disabled:opacity-40";
const primary = `${button} bg-brand text-paper hover:bg-brand-dark`;
const secondary = `${button} border border-line bg-card hover:border-muted`;
const quiet = "text-sm text-muted underline-offset-4 hover:text-ink hover:underline";

const errorKey = (code: string) => {
  if (code === "product_exists") return "exists";
  if (code === "product_limit") return "limit";
  if (code === "ai_quota_exceeded") return "quota";
  if (code === "audio_too_large") return "tooLong";
  if (code === "photo_unsupported") return "photoType";
  if (code === "photo_too_large") return "photoSize";
  return "failed";
};

type EditorProps = {
  shopId: string;
  initial: ProductDraft;
  shopKind: ShopKind;
  groups: string[];
  onSave: (payload: ProductPayload) => Promise<string | null>;
  onCancel: () => void;
  /** Lets "Save all" save this form, under saveKey. Returns an unregister function. */
  register?: (key: number, save: () => Promise<boolean>) => () => void;
  saveKey?: number;
};

/** One product's form. Saving reports an error key, or null when it worked. */
function ProductEditor({ shopId, initial, shopKind, groups, onSave, onCancel, register, saveKey }: EditorProps) {
  const t = useTranslations("products");
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState(0);
  const trackUpload = useCallback((change: number) => setUploads((count) => count + change), []);

  /** Saves the form. Reports whether it worked, so "Save all" can count failures. */
  async function save() {
    if (uploads > 0) {
      setError("stillUploading");
      return false;
    }
    setSaving(true);
    setError(null);
    const failure = await onSave(payloadFromDraft(draft));
    setSaving(false);
    setError(failure);
    return failure === null;
  }

  // "Save all" calls whatever this render's save is, with the latest draft.
  const latestSave = useRef(save);
  useEffect(() => {
    latestSave.current = save;
  });
  useEffect(() => {
    if (register && saveKey !== undefined) return register(saveKey, () => latestSave.current());
  }, [register, saveKey]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await save();
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-card p-4 md:p-5">
      <UploadTracker value={trackUpload}>
        <ProductFields value={draft} onChange={setDraft} shopKind={shopKind} groups={groups} shopId={shopId} />
      </UploadTracker>
      {error && (
        <p role="alert" className="mt-4 text-sm text-accent">
          {t(`errors.${error}`)}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={saving || uploads > 0} className={primary}>
          {uploads > 0 ? t("uploading") : saving ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={onCancel} className={quiet}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

function VoiceAdd({ shopId, onDrafts }: { shopId: string; onDrafts: (drafts: ProductDraft[]) => void }) {
  const t = useTranslations("products");
  const consent = useTranslations("setup.consent");
  const locale = useLocale();

  const [agreed, setAgreed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"transcribe" | "photo" | "read" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onAudio = useCallback(
    async (audio: Blob) => {
      setBusy("transcribe");
      setError(null);
      const form = new FormData();
      form.append("audio", audio, "speech");
      const result = await transcribeProducts(shopId, form);
      setBusy(null);
      if (!result.ok) setError(errorKey(result.code));
      else if (!result.data.text) setError("noSpeech");
      else setText((current) => [current, result.data.text].filter(Boolean).join(" "));
    },
    [shopId],
  );
  const onDenied = useCallback(() => setError("micDenied"), []);

  /** A photo of a rate list or bill becomes text here, so the owner can fix misreads first. */
  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("photoType");
      return;
    }
    setBusy("photo");
    setError(null);
    const form = new FormData();
    form.append("photo", await shrink(file), file.name);
    const result = await readProductPhoto(shopId, form);
    setBusy(null);
    if (!result.ok) setError(errorKey(result.code));
    else if (!result.data.text) setError("photoNothing");
    else setText((current) => [current, result.data.text].filter(Boolean).join("\n"));
  }
  const { recording, seconds, start, stop } = useRecorder(onAudio, onDenied);

  async function read() {
    setBusy("read");
    setError(null);
    const result = await extractProducts(shopId, text, locale);
    setBusy(null);
    if (!result.ok) setError(errorKey(result.code));
    else if (result.data.length === 0) setError("nothingFound");
    else {
      setText("");
      onDrafts(result.data.map(draftFromProduct));
    }
  }

  if (!agreed) {
    return (
      <section className="rounded-md bg-panel p-4 md:p-5">
        <p className="text-sm leading-relaxed text-muted">{t("aiConsent")}</p>
        <button type="button" onClick={() => setAgreed(true)} className={`${primary} mt-4`}>
          {consent("agree")}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-md bg-panel p-4 md:p-5">
      <p className="font-medium">{t("voiceTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("voiceExample")}</p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={busy !== null}
          aria-label={recording ? t("stop") : t("record")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-paper transition-colors hover:bg-brand-dark disabled:opacity-40"
        >
          {recording ? <Square aria-hidden size={15} /> : <Mic aria-hidden size={18} strokeWidth={1.5} />}
        </button>
        <span className="text-sm text-muted tabular-nums">
          {recording ? `${seconds}s / ${MAX_SECONDS}s` : busy === "transcribe" ? t("transcribing") : t("voiceHint")}
        </span>
      </div>
      <label className={`${secondary} mt-3 inline-flex cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-default has-[:disabled]:opacity-40`}>
        <Camera aria-hidden size={16} strokeWidth={1.5} />
        {busy === "photo" ? t("photoReading") : t("photoButton")}
        <input type="file" accept="image/*" onChange={onPhoto} disabled={busy !== null || recording} className="sr-only" />
      </label>
      <p className="mt-1 text-xs text-muted">{t("photoHint")}</p>
      <textarea
        aria-label={t("voiceTitle")}
        rows={text.includes("\n") ? 8 : 3}
        maxLength={2000}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-3 w-full rounded-md border border-line bg-card p-3"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {t(`errors.${error}`)}
        </p>
      )}
      <button type="button" onClick={read} disabled={!text.trim() || busy !== null || recording} className={`${primary} mt-2`}>
        {busy === "read" ? t("reading") : t("readItems")}
      </button>
    </section>
  );
}

/** Reads a CSV or Excel file in the browser. Nothing is sent anywhere until the owner saves. */
async function readSpreadsheet(file: File): Promise<SheetResult> {
  if (/\.xlsx$/i.test(file.name)) {
    // Loaded only when someone uploads a sheet, so the page stays light for everyone else.
    const { readSheet } = await import("read-excel-file/browser");
    return draftsFromRows(await readSheet(file));
  }
  return draftsFromRows(parseCsv(await file.text()));
}

function SheetUpload({ onDrafts }: { onDrafts: (drafts: ProductDraft[]) => void }) {
  const t = useTranslations("products");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setMessage({ error: true, text: t("errors.sheetType") });
      return;
    }
    setBusy(true);
    setMessage(null);
    let result: SheetResult;
    try {
      result = await readSpreadsheet(file);
    } catch {
      result = { ok: false, code: "sheetEmpty" };
    }
    setBusy(false);
    if (!result.ok) {
      setMessage({ error: true, text: t(`errors.${result.code}`) });
      return;
    }
    onDrafts(result.drafts);
    const notes = [t("sheetFound", { count: result.drafts.length })];
    if (result.skipped > 0) notes.push(t("sheetSkipped", { count: result.skipped }));
    if (result.truncated) notes.push(t("sheetTruncated"));
    setMessage({ error: false, text: notes.join(" ") });
  }

  return (
    <section className="rounded-md bg-panel p-4 md:p-5">
      <p className="font-medium">{t("sheetTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("sheetBody")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className={`${primary} inline-flex cursor-pointer items-center gap-2 has-[:disabled]:cursor-default has-[:disabled]:opacity-40`}>
          <FileSpreadsheet aria-hidden size={16} strokeWidth={1.5} />
          {busy ? t("reading") : t("sheetChoose")}
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFile}
            disabled={busy}
            className="sr-only"
          />
        </label>
        <a href="/sample-products.csv" download className={quiet}>
          {t("sheetSample")}
        </a>
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`mt-3 text-sm ${message.error ? "text-accent" : "text-ink"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

/** A single price can be changed right in the list, the most common edit. */
function QuickPrice({ product, onSave }: { product: ProductRow; onSave: (rupees: number) => void }) {
  const t = useTranslations("products");
  const current = product.price_paise === null ? "" : String(product.price_paise / 100);
  const [value, setValue] = useState(current);
  // Follows saves and roll-backs made elsewhere, such as a failed save.
  const [shown, setShown] = useState(current);
  if (shown !== current) {
    setShown(current);
    setValue(current);
  }

  function commit() {
    const rupees = Number(value);
    if (value.trim() === "" || !Number.isFinite(rupees) || rupees < 0) {
      setValue(current);
      return;
    }
    if (value !== current) onSave(rupees);
  }

  return (
    <label className="flex items-center gap-1 text-sm text-muted">
      <span aria-hidden>₹</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={t("priceOf", { product: product.name })}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setValue(current);
        }}
        className="h-9 w-20 rounded-md border border-line bg-card px-2 text-base text-ink tabular-nums"
      />
      {product.unit && <span>/ {product.unit}</span>}
    </label>
  );
}

/** Products with one plain price, which is what the quick price box can change. */
const hasSinglePrice = (product: ProductRow) =>
  product.price_paise !== null &&
  product.options.length === 0 &&
  (product.price_max_paise === null || product.price_max_paise === product.price_paise);

type NewItem = { key: number; draft: ProductDraft };
type Props = { shopId: string; shopKind: ShopKind; initialProducts: ProductRow[] };

export function ProductManager({ shopId, shopKind, initialProducts }: Props) {
  const t = useTranslations("products");

  const [products, setProducts] = useState(initialProducts);
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [sheet, setSheet] = useState(false);
  const newListTop = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [bulkFailed, setBulkFailed] = useState(0);

  // Each open new-product form, keyed like newItems, so "Save all" can save them.
  const savers = useRef(new Map<number, () => Promise<boolean>>());
  const register = useCallback((key: number, save: () => Promise<boolean>) => {
    savers.current.set(key, save);
    return () => {
      savers.current.delete(key);
    };
  }, []);

  /** Saves every new product in order, one after another, so the shop keeps their order. */
  async function saveAll() {
    const keys = newItems.map((item) => item.key);
    setBulkFailed(0);
    setBulk({ done: 0, total: keys.length });
    let failed = 0;
    for (const [index, key] of keys.entries()) {
      const save = savers.current.get(key);
      if (!(await save?.())) failed += 1;
      setBulk({ done: index + 1, total: keys.length });
    }
    setBulk(null);
    setBulkFailed(failed);
  }

  const groups = [...new Set(products.flatMap((product) => product.category?.trim() || []))];

  function addDrafts(drafts: ProductDraft[]) {
    setNewItems((current) => [...current, ...drafts.map((draft, i) => ({ key: nextKey + i, draft }))]);
    setNextKey((key) => key + drafts.length);
  }

  const replace = (row: ProductRow) =>
    setProducts((current) => current.map((product) => (product.id === row.id ? row : product)));

  async function save(id: string, payload: ProductPayload) {
    const result = await updateProduct(shopId, id, payload);
    if (!result.ok) return errorKey(result.code);
    replace(result.data);
    setEditing(null);
    return null;
  }

  async function create(key: number, payload: ProductPayload) {
    const result = await createProduct(shopId, payload);
    if (!result.ok) return errorKey(result.code);
    setProducts((current) => [...current, result.data]);
    setNewItems((current) => current.filter((item) => item.key !== key));
    return null;
  }

  async function quickPrice(product: ProductRow, rupees: number) {
    setError(null);
    const draft = { ...draftFromRow(product), price: String(rupees) };
    replace({ ...product, price_paise: Math.round(rupees * 100) });
    const result = await updateProduct(shopId, product.id, payloadFromDraft(draft));
    if (result.ok) {
      replace(result.data);
    } else {
      replace(product);
      setError("failed");
    }
  }

  function copy(product: ProductRow) {
    addDrafts([{ ...draftFromRow(product), name: t("copyName", { name: product.name }) }]);
    newListTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function toggleStock(product: ProductRow) {
    setError(null);
    const is_available = !product.is_available;
    // Changes on screen straight away, and goes back if the save fails.
    replace({ ...product, is_available });
    const result = await updateProduct(shopId, product.id, { ...payloadFromDraft(draftFromRow(product)), is_available });
    if (result.ok) {
      replace(result.data);
    } else {
      replace(product);
      setError("failed");
    }
  }

  async function remove(id: string) {
    setError(null);
    const result = await deleteProduct(shopId, id);
    setDeleting(null);
    if (result.ok) setProducts((current) => current.filter((product) => product.id !== id));
    else setError("failed");
  }

  async function move(index: number, offset: number) {
    const reordered = [...products];
    const [item] = reordered.splice(index, 1);
    if (!item) return;
    reordered.splice(index + offset, 0, item);

    const previous = products;
    setError(null);
    setProducts(reordered);
    const result = await reorderProducts(shopId, reordered.map((product) => product.id));
    if (!result.ok) {
      setProducts(previous);
      setError("failed");
    }
  }

  return (
    <div className="mt-8 space-y-6 border-t border-line pt-8">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => addDrafts([blankDraft])} className={`${primary} inline-flex items-center gap-2`}>
          <Plus aria-hidden size={16} strokeWidth={1.75} />
          {t("add")}
        </button>
        <button type="button" onClick={() => setVoice(!voice)} aria-expanded={voice} className={`${secondary} inline-flex items-center gap-2`}>
          <Mic aria-hidden size={16} strokeWidth={1.5} />
          {t("addByVoice")}
        </button>
        <button type="button" onClick={() => setSheet(!sheet)} aria-expanded={sheet} className={`${secondary} inline-flex items-center gap-2`}>
          <FileSpreadsheet aria-hidden size={16} strokeWidth={1.5} />
          {t("addBySheet")}
        </button>
      </div>

      {voice && <VoiceAdd shopId={shopId} onDrafts={addDrafts} />}
      {sheet && <SheetUpload onDrafts={addDrafts} />}

      <div ref={newListTop} className="scroll-mt-4" />

      {newItems.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-brand/30 bg-panel p-4">
          <button type="button" onClick={saveAll} disabled={bulk !== null} className={primary}>
            {bulk ? t("savingAll", { done: bulk.done, total: bulk.total }) : t("saveAll", { count: newItems.length })}
          </button>
          <span className="text-sm text-muted">{t("saveAllHint")}</span>
        </div>
      )}
      {bulkFailed > 0 && newItems.length > 0 && (
        <p role="alert" className="text-sm text-accent">
          {t("saveAllFailed", { count: bulkFailed })}
        </p>
      )}

      {newItems.map(({ key, draft }) => (
        <ProductEditor
          key={key}
          shopId={shopId}
          initial={draft}
          shopKind={shopKind}
          groups={groups}
          onSave={(payload) => create(key, payload)}
          register={register}
          saveKey={key}
          onCancel={() => setNewItems((current) => current.filter((item) => item.key !== key))}
        />
      ))}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {t(`errors.${error}`)}
        </p>
      )}

      {products.length === 0 && newItems.length === 0 ? (
        <p className="py-10 text-center text-muted">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {products.map((product, index) => (
            <li key={product.id} className="py-3">
              {editing === product.id ? (
                <ProductEditor
                  shopId={shopId}
                  initial={draftFromRow(product)}
                  shopKind={shopKind}
                  groups={groups}
                  onSave={(payload) => save(product.id, payload)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex shrink-0 flex-col">
                    <button type="button" aria-label={t("moveUp", { product: product.name })} disabled={index === 0} onClick={() => move(index, -1)} className="text-muted hover:text-ink disabled:opacity-25">
                      <ArrowUp aria-hidden size={15} strokeWidth={1.5} />
                    </button>
                    <button type="button" aria-label={t("moveDown", { product: product.name })} disabled={index === products.length - 1} onClick={() => move(index, 1)} className="text-muted hover:text-ink disabled:opacity-25">
                      <ArrowDown aria-hidden size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <ProductThumb product={product} className="size-12 rounded-md" />
                  <div className="min-w-48 flex-1">
                    <p className="font-medium break-words">{product.name}</p>
                    <p className="text-sm text-muted">
                      {product.category && <span>{product.category}</span>}
                      {!hasSinglePrice(product) && (
                        <>
                          {product.category && " · "}
                          <Price product={product} />
                        </>
                      )}
                    </p>
                    <Variety product={product} className="text-sm text-muted" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {hasSinglePrice(product) && (
                      <QuickPrice product={product} onSave={(rupees) => quickPrice(product, rupees)} />
                    )}
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <input type="checkbox" checked={product.is_available} onChange={() => toggleStock(product)} />
                      {t("inStock")}
                    </label>
                    <button type="button" onClick={() => setEditing(product.id)} className={quiet}>
                      {t("edit")}
                    </button>
                    <button type="button" onClick={() => copy(product)} className={`${quiet} inline-flex items-center gap-1`}>
                      <Copy aria-hidden size={13} strokeWidth={1.5} />
                      {t("copy")}
                    </button>
                    {deleting === product.id ? (
                      <>
                        <button type="button" onClick={() => remove(product.id)} className="text-sm font-medium text-accent">
                          {t("confirmDelete")}
                        </button>
                        <button type="button" onClick={() => setDeleting(null)} className={quiet}>
                          {t("cancel")}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setDeleting(product.id)} className={quiet}>
                        {t("delete")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
