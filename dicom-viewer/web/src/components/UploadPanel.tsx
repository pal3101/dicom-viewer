import { useCallback, useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';

function getFileKey(f: File): string {
  return (f as any).webkitRelativePath || f.name;
}

function filterDicom(files: File[]): File[] {
  return files.filter(
    (f) => {
      const name = f.name.split('/').pop()!;
      return name.toLowerCase().endsWith('.dcm') ||
        name.toLowerCase().endsWith('.dicom') ||
        !name.includes('.');
    },
  );
}

export function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { isUploading, progress, result, error, uploadFiles } = useUpload();

  const addFiles = useCallback((files: File[]) => {
    const dcmFiles = filterDicom(files);
    if (dcmFiles.length === 0) return;
    setPendingFiles((prev) => {
      const existing = new Set(prev.map((f) => getFileKey(f)));
      const unique = dcmFiles.filter((f) => !existing.has(getFileKey(f)));
      return [...prev, ...unique];
    });
  }, []);

  const startUpload = useCallback(() => {
    if (pendingFiles.length === 0) return;
    uploadFiles(pendingFiles);
    setPendingFiles([]);
  }, [pendingFiles, uploadFiles]);

  const clearPending = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      // Handle folder drops via DataTransferItemList
      const items = e.dataTransfer.items;
      if (items) {
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry();
          if (entry) entries.push(entry);
        }
        if (entries.length > 0) {
          void readAllEntries(entries).then(addFiles);
          return;
        }
      }

      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
      e.target.value = '';
    },
    [addFiles],
  );

  if (result && !isUploading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-white mb-4">上传完成</h1>
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-400">{result.success}</p>
              <p className="text-sm text-dark-400 mt-1">成功</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">{result.duplicate}</p>
              <p className="text-sm text-dark-400 mt-1">去重</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{result.errors}</p>
              <p className="text-sm text-dark-400 mt-1">失败</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full px-4 py-2 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm font-medium transition-colors"
          >
            继续上传
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-white mb-4">上传 DICOM 文件</h1>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".dcm,.dicom,*"
        className="hidden"
        title="选择 DICOM 文件"
        onChange={handleFileInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        /* @ts-expect-error webkitdirectory is not in React types */
        webkitdirectory=""
        directory=""
        className="hidden"
        title="选择 DICOM 文件夹"
        onChange={handleFileInput}
      />

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragActive
            ? 'border-medical-400 bg-medical-400/10'
            : 'border-dark-600 hover:border-dark-500 bg-dark-800'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <svg
          className="w-12 h-12 text-dark-500 mx-auto mb-4"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path
            d="M24 32V16m0 0l-6 6m6-6l6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 32v4a4 4 0 004 4h24a4 4 0 004-4v-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <p className="text-dark-300 mb-4">拖拽文件或文件夹到此处，或</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
          >
            选择文件
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm font-medium transition-colors"
          >
            选择文件夹
          </button>
        </div>
        <p className="text-dark-500 text-xs mt-3">
          支持批量上传，可多次选择不同文件夹和文件，自动去重
        </p>
      </div>

      {/* Pending files */}
      {pendingFiles.length > 0 && !isUploading && (
        <div className="mt-4 bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-300">
              已选择 <span className="text-white font-medium">{pendingFiles.length}</span> 个文件
            </span>
            <button
              onClick={clearPending}
              className="text-xs text-dark-400 hover:text-dark-300 transition-colors"
            >
              清空
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={startUpload}
              className="flex-1 px-4 py-2.5 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm font-medium transition-colors"
            >
              开始上传
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="mt-6 bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-300 truncate max-w-[75%]">
              {progress.currentFile}
            </span>
            <span className="text-sm text-dark-400">
              {progress.uploaded}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div
              className="bg-medical-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.uploaded / progress.total) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-dark-400">
            <span className="text-green-400">成功: {progress.success}</span>
            {progress.duplicate > 0 && (
              <span className="text-amber-400">去重: {progress.duplicate}</span>
            )}
            {progress.errors > 0 && (
              <span className="text-red-400">失败: {progress.errors}</span>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

async function readAllEntries(entries: FileSystemEntry[], basePath = ''): Promise<File[]> {
  const files: File[] = [];
  for (const entry of entries) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await fileEntryToFile(entry as FileSystemFileEntry);
      files.push(new File([file], entryPath, { lastModified: file.lastModified }));
    } else if (entry.isDirectory) {
      const children = await readDir(entry as FileSystemDirectoryEntry);
      const nested = await readAllEntries(children, entryPath);
      files.push(...nested);
    }
  }
  return files;
}

function readDir(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const reader = dir.createReader();
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
        } else {
          all.push(...batch);
          readBatch();
        }
      });
    };
    readBatch();
  });
}

function fileEntryToFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve) => entry.file(resolve));
}
