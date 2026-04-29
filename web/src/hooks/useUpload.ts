import { useState, useCallback } from 'react';
import type { UploadProgress } from '../types';
import { uploadToCloudStorage } from '../lib/cloudbase-storage';
import { uploadDICOMFile } from '../lib/api';
import dicomParser from 'dicom-parser';

function extractUIDs(file: File): Promise<{
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const byteArray = new Uint8Array(reader.result as ArrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);
        resolve({
          studyInstanceUID: dataSet.string('x0020000d') || '',
          seriesInstanceUID: dataSet.string('x0020000e') || '',
          sopInstanceUID: dataSet.string('x00080018') || '',
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  result: { total: number; success: number; duplicate: number; errors: number } | null;
  error: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    result: null,
    error: null,
  });

  const uploadFiles = useCallback(async (files: File[]) => {
    setState({ isUploading: true, progress: null, result: null, error: null });

    let success = 0;
    let duplicate = 0;
    let errors = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Extract UIDs locally
        let uids: { studyInstanceUID: string; seriesInstanceUID: string; sopInstanceUID: string };
        try {
          uids = await extractUIDs(file);
        } catch {
          errors++;
          continue;
        }

        // Upload to CloudBase storage
        let fileID = '';
        try {
          const uploadResult = await uploadToCloudStorage(
            file,
            uids.studyInstanceUID,
            uids.seriesInstanceUID,
          );
          fileID = uploadResult.fileID;
        } catch {
          errors++;
          continue;
        }

        // Send metadata to backend for indexing
        try {
          await uploadDICOMFile(file, fileID);
          success++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('duplicate')) {
            duplicate++;
          } else {
            errors++;
          }
        }

        setState({
          isUploading: true,
          progress: {
            total: files.length,
            uploaded: i + 1,
            success,
            duplicate,
            errors,
            currentFile: file.name,
          },
          result: null,
          error: null,
        });
      }

      setState((prev) => ({
        ...prev,
        isUploading: false,
        result: {
          total: files.length,
          success,
          duplicate,
          errors,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState({ isUploading: false, progress: null, result: null, error: msg });
    }
  }, []);

  return {
    ...state,
    uploadFiles,
  };
}
