import type { BusinessProfile } from "../schemas/onboarding.schema.js";

type Language = "en" | "hi";
type MissingField = "name" | "category" | "hours" | "products" | "contact" | "address";

/** Decided by code rather than the model, so setup can't finish with a gap. */
export function missingFields(profile: BusinessProfile): MissingField[] {
  const missing: MissingField[] = [];
  if (!profile.name) missing.push("name");
  if (!profile.category) missing.push("category");
  if (profile.hours.length === 0) missing.push("hours");
  if (profile.products.length === 0) missing.push("products");
  if (!profile.phone && !profile.whatsapp) missing.push("contact");
  if (!profile.address) missing.push("address");
  return missing;
}

const questions: Record<Language, Record<MissingField | "done", string>> = {
  en: {
    name: "What is your shop called?",
    category: "What kind of shop is it: grocery, clothing, electronics, bakery or something else?",
    hours: "Which days are you open, and from what time to what time?",
    products: "What are the main things you sell, and their prices? Tell me about any sizes, flavours or price ranges too.",
    contact: "Which phone or WhatsApp number should customers use?",
    address: "What is your shop's address?",
    done: "I have everything I need. Please review the details.",
  },
  hi: {
    name: "आपकी दुकान का नाम क्या है?",
    category: "आपकी दुकान किस तरह की है: किराना, कपड़े, इलेक्ट्रॉनिक्स, बेकरी या कुछ और?",
    hours: "आपकी दुकान किन दिनों में और कितने बजे से कितने बजे तक खुलती है?",
    products: "आप मुख्य रूप से क्या-क्या बेचते हैं और उनके दाम क्या हैं? अलग-अलग साइज़, फ़्लेवर या दाम की रेंज हो तो वह भी बताइए।",
    contact: "ग्राहक किस फ़ोन या WhatsApp नंबर पर संपर्क करें?",
    address: "आपकी दुकान का पता क्या है?",
    done: "मुझे सारी जानकारी मिल गई है। कृपया इसे जाँच लें।",
  },
};

export function nextQuestion(profile: BusinessProfile, language: Language) {
  return questions[language][missingFields(profile)[0] ?? "done"];
}

export const firstQuestion = (language: Language) =>
  language === "hi"
    ? "अपनी दुकान के बारे में बताइए: नाम, क्या बेचते हैं और कब खुली रहती है।"
    : "Tell me about your shop: its name, what you sell and when you're open.";
