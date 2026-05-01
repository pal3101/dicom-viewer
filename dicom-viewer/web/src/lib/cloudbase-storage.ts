import { app } from '../config/cloudbase';

/**
 * Upload a DICOM file directly to CloudBase cloud storage.
 * Returns the fileID and temporary URL.
 */
export async function uploadToCloudStorage(
  file: File,
  studyUID: string,
  seriesUID: string,
  onProgress?: (pct: number) => void,
): Promise<{ fileID: string; tempURL: string }> {
  // Use patient ID + instance filename as cloud path for organization
  const cloudPath = `dicom/${studyUID}/${seriesUID}/${file.name}`;

  const uploadResult = await app.uploadFile({
    cloudPath,
    filePath: file,
    onUploadProgress: ({ loaded, total }) => {
      if (onProgress) {
        onProgress(Math.round((loaded / total) * 100));
      }
    },
  });

  if (!uploadResult?.fileID) {
    throw new Error('Upload failed: no fileID returned');
  }

  // Get temporary download URL
  const tempResult = await app.getTempFileURL({
    fileList: [{ fileID: uploadResult.fileID, maxAge: 86400 }],
  });

  const tempURL =
    tempResult?.fileList?.[0]?.tempFileURL ||
    tempResult?.fileList?.[0]?.download_url;

  if (!tempURL) {
    throw new Error('Failed to get temporary URL');
  }

  return { fileID: uploadResult.fileID, tempURL };
}
