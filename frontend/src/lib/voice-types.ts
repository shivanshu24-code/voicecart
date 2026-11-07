export type Hour = {
  day_of_week: number;
  slot: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type Product = {
  name: string;
  description: string | null;
  category: string | null;
  price_rupees: number | null;
  price_max_rupees: number | null;
  price_from: boolean;
  unit: string | null;
  options: { label: string; price_rupees: number; is_available: boolean; image_url: string | null }[];
  choices: { name: string; values: string[]; images: Record<string, string> }[];
  images: string[];
};

export type Profile = {
  name: string | null;
  category: "grocery" | "clothing" | "electronics" | "bakery" | "other" | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: Hour[];
  products: Product[];
};

export type Session = {
  id: string;
  status: string;
  profile: Profile;
  missing: string[];
  messages: { id: string; role: "user" | "assistant"; content: string }[];
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string };
