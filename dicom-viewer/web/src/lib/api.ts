import type { Study, Series, DICOMInstance, UploadProgress } from '../types';

const API_BASE = '/api';

export async function fetchStudies(): Promise<Study[]> {
  const res = await fetch(`${API_BASE}/studies`);
  if (!res.ok) throw new Error('Failed to fetch studies');
  return res.json();
}

export async function fetchStudyById(id: string): Promise<Study> {
  const res = await fetch(`${API_BASE}/studies/${id}`);
  if (!res.ok) throw new Error('Study not found');
  return res.json();
}

export async function fetchSeriesByStudyId(studyId: string): Promise<Series[]> {
  const res = await fetch(`${API_BASE}/studies/${studyId}/series`);
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}

export async function fetchInstancesBySeriesId(seriesId: string): Promise<DICOMInstance[]> {
  const res = await fetch(`${API_BASE}/series/${seriesId}/instances`);
  if (!res.ok) throw new Error('Failed to fetch instances');
  return res.json();
}

export async function uploadDICOMFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ status: string; meta: Record<string, string> }> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.send(formData);
  });
}

export async function uploadDICOMBatch(
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ total: number; success: number; duplicate: number; errors: number }> {
  let success = 0;
  let duplicate = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress({
        total: files.length,
        uploaded: i + 1,
        success,
        duplicate,
        errors,
        currentFile: file.name,
      });
    }

    try {
      const result = await uploadDICOMFile(file);
      if (result.status === 'success') success++;
      else if (result.status === 'duplicate') duplicate++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { total: files.length, success, duplicate, errors };
}
