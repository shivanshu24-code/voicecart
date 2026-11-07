"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { matchesSearch, type StorefrontProduct } from "@/lib/storefront";

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  /** Names of matching products, or null when nothing is being searched. */
  matches: Set<string> | null;
};

const SearchContext = createContext<SearchState>({ query: "", setQuery: () => {}, matches: null });

export function SearchProvider({ products, children }: { products: StorefrontProduct[]; children: ReactNode }) {
  const [query, setQuery] = useState("");

  const value = useMemo(() => {
    const matches = query.trim()
      ? new Set(products.filter((product) => matchesSearch(product, query)).map((product) => product.name))
      : null;
    return { query, setQuery, matches };
  }, [products, query]);

  return <SearchContext value={value}>{children}</SearchContext>;
}

export function SearchBox({ className = "mt-6 max-w-md" }: { className?: string }) {
  const t = useTranslations("storefront");
  const { query, setQuery } = useContext(SearchContext);

  return (
    <div role="search" className={`relative w-full ${className}`}>
      <Search aria-hidden size={17} strokeWidth={1.5} className="absolute top-1/2 left-3.5 -translate-y-1/2 opacity-50" />
      <input
        type="search"
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-11 w-full rounded-[inherit] border border-current/20 bg-transparent pr-10 pl-10 text-base outline-none placeholder:opacity-50 focus:border-current/50 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          aria-label={t("searchClear")}
          onClick={() => setQuery("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 opacity-60 hover:opacity-100"
        >
          <X aria-hidden size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/** The group links would point at hidden sections during a search. */
export function HideWhileSearching({ children }: { children: ReactNode }) {
  const { matches } = useContext(SearchContext);
  return matches ? null : children;
}

export function SearchResults() {
  const t = useTranslations("storefront");
  const { query, matches } = useContext(SearchContext);
  if (!matches) return null;

  return (
    <p role="status" className="mt-4 text-sm opacity-70">
      {matches.size === 0 ? t("searchEmpty", { query: query.trim() }) : t("searchCount", { count: matches.size })}
    </p>
  );
}

type GroupProps = { id: string; className?: string; names: string[]; children: ReactNode };

export function SearchGroup({ id, className, names, children }: GroupProps) {
  const { matches } = useContext(SearchContext);
  if (matches && !names.some((name) => matches.has(name))) return null;
  return <div id={id} className={className}>{children}</div>;
}

export function SearchItem({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  const { matches } = useContext(SearchContext);
  if (matches && !matches.has(name)) return null;
  return <li className={className}>{children}</li>;
}
