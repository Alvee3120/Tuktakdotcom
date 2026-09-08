/**
 * Client-side image resize + re-encode before upload.
 *
 * Description-editor images and multi-MB camera photos would otherwise be
 * uploaded at full size (and blog/description images can end up base64).
 * Resizing to a max dimension and re-encoding to crisp WebP keeps R2 small
 * and pages fast.
 */

export const IMAGE_MAX_DIM = 1600;
export const IMAGE_QUALITY = 0.92;

/**
 * Resize/compress an image file in the browser.
 * Returns a new WebP File (or the original when the browser can't draw it).
 */
export async function resizeImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? IMAGE_MAX_DIM;
  const quality = opts.quality ?? IMAGE_QUALITY;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image'));
      el.src = objectUrl;
    });

    const longer = Math.max(img.naturalWidth, img.naturalHeight);
    if (longer <= 0) return file;

    const scale = Math.min(maxDim / longer, 1);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    let dataUrl: string;
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(img, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      bitmap.close();
      dataUrl = canvas.toDataURL('image/webp', quality);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      dataUrl = canvas.toDataURL('image/webp', quality);
    }

    const base64 = dataUrl.split(',')[1] ?? '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return new File([bytes], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
      type: 'image/webp',
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Resize (if larger than maxDim) then upload to R2 via the admin upload route.
 * Returns the public `/api/images/...` path.
 */
export async function uploadResizedImage(
  file: File,
  upload: (f: File) => Promise<string>,
  opts?: { maxDim?: number; quality?: number; folder?: string }
): Promise<string> {
  const resized = await resizeImage(file, opts).catch(() => file);
  return upload(resized);
}
