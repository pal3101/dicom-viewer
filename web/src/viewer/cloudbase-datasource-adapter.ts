import { app } from '../config/cloudbase';
import type { DICOMInstance } from '../types';

/**
 * Register a custom image loader that fetches DICOM files from CloudBase storage.
 *
 * How it works:
 * 1. The viewer requests images using a URL like `cloudbase://<instance._id>`
 * 2. This loader converts the fileID to a temporary download URL via getTempFileURL
 * 3. The temporary URL is fed to cornerstone's existing wadouri loader
 */

const cloudBaseCache = new Map<string, string>();

/**
 * Load a single DICOM instance file from CloudBase storage.
 * Returns the cornerstone image object.
 */
export async function loadDICOMFromCloudBase(
  instance: DICOMInstance,
): Promise<string> {
  // Check cache first (temp URLs are valid for up to 24h)
  if (cloudBaseCache.has(instance._id)) {
    return cloudBaseCache.get(instance._id)!;
  }

  const tempResult = await app.getTempFileURL({
    fileList: [{ fileID: instance.fileID, maxAge: 86400 }],
  });

  const tempURL =
    tempResult?.fileList?.[0]?.tempFileURL ||
    tempResult?.fileList?.[0]?.download_url;

  if (!tempURL) {
    throw new Error(
      `Failed to get temp URL for instance ${instance._id}`,
    );
  }

  cloudBaseCache.set(instance._id, tempURL);
  return tempURL;
}

/**
 * Preload all instances for a series, caching their temp URLs.
 * This avoids per-image network roundtrips during scrolling.
 */
export async function preloadSeriesTempURLs(
  instances: DICOMInstance[],
): Promise<void> {
  const uncached = instances.filter(
    (inst) => inst.fileID && !cloudBaseCache.has(inst._id),
  );

  if (uncached.length === 0) return;

  // Batch get temp URLs (CloudBase supports batch of up to 50)
  const batches: DICOMInstance[][] = [];
  for (let i = 0; i < uncached.length; i += 50) {
    batches.push(uncached.slice(i, i + 50));
  }

  for (const batch of batches) {
    const fileList = batch.map((inst) => ({
      fileID: inst.fileID,
      maxAge: 86400,
    }));

    const result = await app.getTempFileURL({ fileList });

    if (result?.fileList) {
      for (let i = 0; i < result.fileList.length; i++) {
        const tempURL =
          result.fileList[i].tempFileURL || result.fileList[i].download_url;
        if (tempURL) {
          cloudBaseCache.set(batch[i]._id, tempURL);
        }
      }
    }
  }
}

/**
 * Get the cornerstone-compatible URL for an instance.
 * After preloading, this just returns the cached temp URL.
 */
export function getCornerstoneURL(instance: DICOMInstance): string {
  const url = cloudBaseCache.get(instance._id);
  if (!url) {
    throw new Error(
      `Temp URL not loaded for instance ${instance._id}. Call preloadSeriesTempURLs first.`,
    );
  }
  // dicomImageLoader supports standard HTTP(S) URLs via wadouri
  return url;
}

/**
 * Clear the temp URL cache (useful when switching studies).
 */
export function clearCloudBaseCache(): void {
  cloudBaseCache.clear();
}
