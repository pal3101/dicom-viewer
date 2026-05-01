import cloudbase from '@cloudbase/node-sdk';

let _storageApp: ReturnType<typeof cloudbase.init> | null = null;

function getStorageApp(): ReturnType<typeof cloudbase.init> {
  if (!_storageApp) {
    const envId = process.env.CLOUDBASE_ENV_ID;
    const secretId = process.env.TENCENTCLOUD_SECRETID;
    const secretKey = process.env.TENCENTCLOUD_SECRETKEY;

    if (!envId || !secretId || !secretKey) {
      throw new Error(
        'Missing CloudBase credentials. Set CLOUDBASE_ENV_ID, TENCENTCLOUD_SECRETID, and TENCENTCLOUD_SECRETKEY environment variables.',
      );
    }

    _storageApp = cloudbase.init({ env: envId, secretId, secretKey });
  }
  return _storageApp;
}

const tempUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function uploadFileToStorage(
  cloudPath: string,
  buffer: Buffer,
): Promise<string> {
  const app = getStorageApp();
  const result = await app.uploadFile({
    cloudPath,
    fileContent: buffer,
  });
  if (!result?.fileID) {
    throw new Error('Upload failed: no fileID returned');
  }
  return result.fileID;
}

export async function getTempFileURLBatch(fileIDs: string[]): Promise<string[]> {
  const results: string[] = [];
  const app = getStorageApp();

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

    for (const fileID of batch) {
      const cached = tempUrlCache.get(fileID);
      results.push(cached?.url || '');
    }
  }

  return results;
}
