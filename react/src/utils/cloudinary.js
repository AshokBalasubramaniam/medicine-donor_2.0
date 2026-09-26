/**
 * Returns a resized, auto-format/quality version of a Cloudinary image URL
 * (face-centred square crop). Non-Cloudinary URLs and local previews
 * (blob:/data:) are returned unchanged.
 */
export function cloudinaryThumb(url, size = 240) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`);
}
