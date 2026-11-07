/** The API's address. Local development has a default; production must set it. */
export function apiUrl() {
  const url = process.env.API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") throw new Error("API_URL is not set");
  return "http://localhost:4000";
}
