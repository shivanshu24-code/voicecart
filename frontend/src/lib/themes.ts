import type { Layout, ShopKind } from "./storefront";

export type Theme = {
  page: string;
  ink: string;
  surface: string;
  accent: string;
  onAccent: string;
  tint: string;
  line: string;
  radius: string;
  serif: boolean;
  /** For white pop-ups and bars, on themes whose accent is too pale to sit on white. */
  solid?: string;
};

const theme = (
  page: string,
  ink: string,
  surface: string,
  accent: string,
  tint: string,
  line: string,
  radius: string,
  serif: boolean,
  dark?: { onAccent: string; solid: string },
): Theme => ({ page, ink, surface, accent, tint, line, radius, serif, onAccent: "#ffffff", ...dark });

/** Each shop kind gets its own colours and type in every layout. */
export const themes: Record<ShopKind, Record<Layout, Theme>> = {
  grocery: {
    storefront: theme("#f6f8f4", "#18241c", "#ffffff", "#1f7a4d", "#e6f0e6", "#dfe6dd", "0.75rem", false),
    shelves: theme("#fbf7ee", "#2b2417", "#ffffff", "#b85f17", "#f6e7d2", "#eadfca", "0.5rem", false),
    menucard: theme("#dfe9dc", "#1c2a20", "#fbfaf5", "#2f5d46", "#e4ecdf", "#dcdfd2", "1rem", true),
    lookbook: theme("#12201a", "#eff2e8", "#1b2c24", "#d7b45a", "#24382e", "#2e4438", "0", true, {
      onAccent: "#1a1a10",
      solid: "#2f5d46",
    }),
  },
  bakery: {
    storefront: theme("#fdf6f0", "#3a2418", "#ffffff", "#b3543b", "#f8e3d8", "#f0dfd2", "1rem", true),
    shelves: theme("#fff7f9", "#3b2130", "#ffffff", "#b4476d", "#fbe2ea", "#f3dbe3", "1.25rem", false),
    menucard: theme("#e9dccb", "#33241a", "#fffaf2", "#7a4a2b", "#f1e4d2", "#e4d6c2", "0.25rem", true),
    lookbook: theme("#241713", "#f6ece2", "#30201a", "#e0a96d", "#3a2820", "#46322a", "0", true, {
      onAccent: "#241713",
      solid: "#7a4a2b",
    }),
  },
  clothing: {
    storefront: theme("#f7f6f3", "#141414", "#ffffff", "#141414", "#ece9e3", "#e5e2dc", "0", false),
    shelves: theme("#f3f1f7", "#211c33", "#ffffff", "#5a45a8", "#e7e2f5", "#e1dcef", "0.75rem", false),
    menucard: theme("#e7e3da", "#24211b", "#faf8f3", "#8a5a3c", "#eee6d9", "#ddd6c8", "0", true),
    lookbook: theme("#0f0f0f", "#f2efe9", "#1a1a1a", "#f2efe9", "#232323", "#2c2c2c", "0", true, {
      onAccent: "#0f0f0f",
      solid: "#141414",
    }),
  },
  electronics: {
    storefront: theme("#f2f5f9", "#0f1b2d", "#ffffff", "#1763d1", "#e1ebf8", "#dde5ef", "0.75rem", false),
    shelves: theme("#0e141c", "#e8eef5", "#172230", "#37c2b0", "#1f2d3e", "#27384c", "0.75rem", false, {
      onAccent: "#06231f",
      solid: "#0f7a6d",
    }),
    menucard: theme("#dde3ea", "#16202c", "#f9fbfd", "#33506f", "#e6ecf3", "#d7dfe8", "0.5rem", false),
    lookbook: theme("#0b0d12", "#f1f3f7", "#151923", "#8fa8ff", "#1c2230", "#262d3d", "0.25rem", false, {
      onAccent: "#0b0d12",
      solid: "#3a55c9",
    }),
  },
  generic: {
    storefront: theme("#f7f5f0", "#20261f", "#ffffff", "#2f4a3f", "#e8ebe3", "#e3dfd6", "0.75rem", false),
    shelves: theme("#f5f7fa", "#1d2430", "#ffffff", "#3d5a80", "#e3e9f2", "#dfe4ec", "0.75rem", false),
    menucard: theme("#ece6da", "#2b2620", "#fbf8f1", "#8c5a2b", "#f0e6d6", "#e2d9c9", "0.5rem", true),
    lookbook: theme("#171a1d", "#f0efe9", "#21262a", "#e2b973", "#2a3035", "#333a40", "0", true, {
      onAccent: "#171a1d",
      solid: "#8c5a2b",
    }),
  },
};
