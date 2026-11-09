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

/** Widths a phone, tablet or laptop might pick from, smallest first. */
const STEPS = [480, 800, 1200];

/**
 * Smaller copies of a large photo, so a phone downloads a 480px banner instead
 * of the 1920px one a wide screen needs. Returns undefined for small photos.
 */
export function imageSrcSet(url: string, { width, height, fit = "fill" }: Size) {
  if (width <= STEPS[0]) return undefined;
  const widths = [...STEPS.filter((step) => step < width), width];
  return widths
    .map((w) => {
      const h = height && Math.round((height * w) / width);
      return `${imageUrl(url, { width: w, height: h, fit })} ${w}w`;
    })
    .join(", ");
}
