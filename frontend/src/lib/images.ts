type Size = { width: number; height?: number; fit?: "fill" | "limit" };

/**
 * Asks Cloudinary for a copy sized for where it's shown, in the best format the
 * browser supports. Sizes are in pixels; pass about double the displayed size.
 */
export function imageUrl(url: string, { width, height, fit = "fill" }: Size) {
  const crop = fit === "fill" ? "c_fill,g_auto" : "c_limit";
  const size = [`w_${width}`, height && `h_${height}`].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,${crop},${size}/`);
}
