// Resized product images via Supabase Storage image transformations.
// Product photos are uploaded at up to 5000×5000 px but rendered at a few
// hundred pixels, so phones download megabytes for a thumbnail. The
// /render/image endpoint resizes on the fly (and serves WebP to browsers
// that accept it), so we point <img> at a size that matches the slot.

const OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_SEGMENT = "/storage/v1/render/image/public/";

export function isTransformableImage(url: string | null | undefined): url is string {
  return !!url && url.includes(OBJECT_SEGMENT) && !url.toLowerCase().split("?")[0].endsWith(".svg");
}

/** URL of `url` resized to `width` px wide (aspect ratio kept). Non-Supabase URLs are returned unchanged. */
export function resizedImage(url: string | null | undefined, width: number, quality = 75): string {
  if (!url) return "";
  if (!isTransformableImage(url)) return url;
  const base = url.replace(OBJECT_SEGMENT, RENDER_SEGMENT).split("?")[0];
  return `${base}?width=${Math.round(width)}&quality=${quality}`;
}

/** `srcset` value for the given widths, or undefined for non-Supabase URLs. */
export function imageSrcSet(url: string | null | undefined, widths: number[], quality = 75): string | undefined {
  if (!isTransformableImage(url)) return undefined;
  return widths.map((w) => `${resizedImage(url, w, quality)} ${w}w`).join(", ");
}
