/**
 * Storage abstraction for uploaded files (product images, avatars, voucher QRs).
 *
 * The former API used Cloudflare R2 bindings. On the self-hosted Hetzner server
 * we store files on local disk. The `Storage` interface keeps the call sites
 * identical so an S3-compatible backend (AWS S3, MinIO, Cloudflare R2 via S3
 * API) can be dropped in later without touching any route code.
 */
import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { dirname, normalize, resolve, extname } from 'node:path';

export interface StoredObject {
  body: Buffer;
  contentType: string;
  httpEtag: string;
}

export interface Storage {
  get(key: string): Promise<StoredObject | null>;
  put(
    key: string,
    data: Buffer | ArrayBuffer | Uint8Array | string,
    contentType: string
  ): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * Local-filesystem storage under a configurable upload directory.
 * Keys map to relative paths underneath the root; path traversal is rejected.
 */
export class LocalFileStorage implements Storage {
  constructor(private root: string) {}

  private resolveKey(key: string): string {
    // Reject path traversal attempts — keys must not contain ".." or start with "/".
    const normalized = normalize(key).replace(/^([/\\])+/, '');
    if (normalized.includes('..') || normalized !== key) {
      throw new Error('Invalid storage key');
    }
    return resolve(this.root, normalized);
  }

  async get(key: string): Promise<StoredObject | null> {
    const file = this.resolveKey(key);
    try {
      await access(file);
    } catch {
      return null;
    }
    const body = await readFile(file);
    return {
      body,
      contentType: mimeFromExt(extname(file)) ?? 'application/octet-stream',
      httpEtag: `"${body.length.toString(16)}"`,
    };
  }

  async put(
    key: string,
    data: Buffer | ArrayBuffer | Uint8Array | string,
    contentType: string
  ): Promise<void> {
    const file = this.resolveKey(key);
    await mkdir(dirname(file), { recursive: true });
    // Normalize to a Buffer regardless of the input shape.
    const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data as ArrayBuffer);
    await writeFile(file, buf);
  }

  async delete(key: string): Promise<void> {
    const file = this.resolveKey(key);
    try {
      await rm(file, { force: true });
    } catch {
      /* ignore */
    }
  }

  async exists(key: string): Promise<boolean> {
    const file = this.resolveKey(key);
    try {
      await access(file);
      return true;
    } catch {
      return false;
    }
  }
}

export function mimeFromExt(ext: string): string | null {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
  };
  return map[ext.toLowerCase()] ?? null;
}

/**
 * Get the shared file storage backend. Reads UPLOAD_DIR from the environment
 * (default ./uploads). Swap for an S3-compatible backend here if preferred.
 */
export function getStorage(): Storage {
  const root = process.env.UPLOAD_DIR || './uploads';
  return new LocalFileStorage(root);
}