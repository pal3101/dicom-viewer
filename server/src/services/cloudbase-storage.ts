import cloudbase from '@cloudbase/node-sdk';

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
});

// In-memory cache for temp URLs (valid up to 24h)
const tempUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get temporary download URLs for a batch of CloudBase file IDs.
 * CloudBase supports up to 50 file IDs per call.
 * Results are cached for 24 hours.
 */
export async function getTempFileURLBatch(fileIDs: string[]): Promise<string[]> {
  const results: string[] = [];

  // Process in batches of 50 (CloudBase limit)
  for (let i = 0; i < fileIDs.length; i += 50) {
    const batch = fileIDs.slice(i, i + 50);
    const uncached = batch.filter((id) => !tempUrlCache.has(id));

    if (uncached.length > 0) {
      const fileList = uncached.map((fileID) => ({ fileID, maxAge: 86400 }));
      const result = await app.getTempFileURL({ fileList });

      if (result?.fileList) {
        for (const item of result.fileList) {
          const url = item.tempFileURL;
          if (url) {
            tempUrlCache.set(item.fileID, { url, expiresAt: Date.now() + 86400000 });
          }
        }
      }
    }

    // Build results in order
    for (const fileID of batch) {
      const cached = tempUrlCache.get(fileID);
      results.push(cached?.url || '');
    }
  }

  return results;
}
