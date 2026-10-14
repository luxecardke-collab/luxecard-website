// Shrinks a photo in the browser before it's uploaded: JPG, PNG, WebP and
// HEIC larger than MAX_SIDE on their longest side are redrawn at MAX_SIDE
// (keeping their orientation). PDF and SVG files, and photos already small
// enough, are returned untouched. A photo the browser can't open (HEIC
// outside Safari) is also returned as it is.

const MAX_SIDE = 2000;
const RESIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function resizePhoto(file: File, contentType: string): Promise<{ file: Blob; contentType: string }> {
  if (!RESIZABLE.has(contentType)) return { file, contentType };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { file, contentType };
  }
  try {
    const scale = MAX_SIDE / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1) return { file, contentType };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, contentType };
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // PNG and WebP keep their format (a logo's transparency); JPG and HEIC
    // become JPG, which every device can open.
    const outType = contentType === 'image/png' || contentType === 'image/webp' ? contentType : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, 0.9));
    return blob ? { file: blob, contentType: outType } : { file, contentType };
  } finally {
    bitmap.close();
  }
}
