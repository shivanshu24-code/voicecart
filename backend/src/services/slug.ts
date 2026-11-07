const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v",
  श: "sh", ष: "sh", स: "s", ह: "h",
};

const VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "i", उ: "u", ऊ: "u", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऋ: "ri",
};

const MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri",
};

const VIRAMA = "्";
const NUKTA = "़";
const NASALS = ["ं", "ँ"];

/** Spells a Hindi word in Latin letters, dropping the silent final "a" (शर्मा → sharma, स्टोर → stor). */
function transliterateWord(word: string) {
  const letters = [...word].filter((letter) => letter !== NUKTA);
  let result = "";

  letters.forEach((letter, index) => {
    const next = letters[index + 1];
    const consonant = CONSONANTS[letter];

    if (consonant) {
      const hasVowelSign = next === VIRAMA || (next !== undefined && next in MATRAS);
      const isLast = next === undefined;
      result += consonant + (hasVowelSign || isLast ? "" : "a");
    } else if (MATRAS[letter]) {
      result += MATRAS[letter];
    } else if (VOWELS[letter]) {
      result += VOWELS[letter];
    } else if (NASALS.includes(letter)) {
      result += "n";
    } else if (letter !== VIRAMA && letter !== "ः") {
      result += letter;
    }
  });

  return result;
}

export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "dashboard", "help", "login", "preview", "shop", "shops",
  "signup", "support", "voicecart", "www",
]);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isValidSlug = (slug: string) =>
  slug.length >= 3 && slug.length <= 60 && SLUG.test(slug) && !RESERVED_SLUGS.has(slug);

/** Builds a web-safe address from a shop name in English or Hindi. */
export function slugify(name: string) {
  const slug = name
    .normalize("NFC")
    .split(/\s+/)
    .map(transliterateWord)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

  return isValidSlug(slug) ? slug : "";
}
