import { useState, useCallback } from 'react';
import type { UploadProgress } from '../types';
import { uploadDICOMFile } from '../lib/api';

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

        try {
          const result = await uploadDICOMFile(file);
          if (result.status === 'success') success++;
          else if (result.status === 'duplicate') duplicate++;
          else errors++;
        } catch {
          errors++;
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
