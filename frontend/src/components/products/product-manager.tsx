"use client";

import { ArrowDown, ArrowUp, Mic, Plus, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type FormEvent } from "react";
import {
  createProduct,
  deleteProduct,
  extractProducts,
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
import type { ProductRow } from "@/lib/storefront";
import { UploadTracker } from "./photo-upload";
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
  return "failed";
};

type EditorProps = {
  shopId: string;
  initial: ProductDraft;
  shopKind: ShopKind;
  groups: string[];
  onSave: (payload: ProductPayload) => Promise<string | null>;
  onCancel: () => void;
};

/** One product's form. Saving reports an error key, or null when it worked. */
function ProductEditor({ shopId, initial, shopKind, groups, onSave, onCancel }: EditorProps) {
  const t = useTranslations("products");
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState(0);
  const trackUpload = useCallback((change: number) => setUploads((count) => count + change), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const failure = await onSave(payloadFromDraft(draft));
    setSaving(false);
    setError(failure);
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
  const [busy, setBusy] = useState<"transcribe" | "read" | null>(null);
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
        <p className="text-sm leading-relaxed text-muted">{consent("body")}</p>
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
      <textarea
        aria-label={t("voiceTitle")}
        rows={3}
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
  const [error, setError] = useState<string | null>(null);

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
      </div>

      {voice && <VoiceAdd shopId={shopId} onDrafts={addDrafts} />}

      {newItems.map(({ key, draft }) => (
        <ProductEditor
          key={key}
          shopId={shopId}
          initial={draft}
          shopKind={shopKind}
          groups={groups}
          onSave={(payload) => create(key, payload)}
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
                      {product.category && <span>{product.category} · </span>}
                      <Price product={product} />
                    </p>
                    <Variety product={product} className="text-sm text-muted" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-muted">
                      <input type="checkbox" checked={product.is_available} onChange={() => toggleStock(product)} />
                      {t("inStock")}
                    </label>
                    <button type="button" onClick={() => setEditing(product.id)} className={quiet}>
                      {t("edit")}
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
