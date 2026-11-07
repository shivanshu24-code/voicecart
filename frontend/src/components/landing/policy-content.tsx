import { useTranslations } from "next-intl";

type Section = { title: string; body?: string; points?: string[] };

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/** The policy text, shared by the public page and the agree step after sign-in. */
export function PolicyContent() {
  const t = useTranslations("privacy");
  const sections = t.raw("sections") as Section[];

  return (
    <div className="space-y-10">
      {sections.map(({ title, body, points }, index) => (
        <section key={title}>
          <h2 className="font-display text-2xl">
            {index + 1}. {title}
          </h2>
          {body && <p className="mt-3 leading-relaxed text-muted">{body}</p>}
          {points && (
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-line">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section>
        <h2 className="font-display text-2xl">
          {sections.length + 1}. {t("contactTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">
          {t("contactBody")}{" "}
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="text-brand underline underline-offset-4">
              {contactEmail}
            </a>
          )}
        </p>
      </section>
    </div>
  );
}
