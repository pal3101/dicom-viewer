import { useCallback, useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';

export function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { isUploading, progress, result, error, uploadFiles } = useUpload();

  const handleFiles = useCallback(
    (files: File[]) => {
      const dcmFiles = files.filter(
        (f) =>
          f.name.toLowerCase().endsWith('.dcm') ||
          f.name.toLowerCase().endsWith('.dicom') ||
          !f.name.includes('.'),
      );
      if (dcmFiles.length > 0) {
        uploadFiles(dcmFiles);
      }
    },
    [uploadFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles],
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-white mb-4">上传 DICOM 文件</h1>

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom,*"
          className="hidden"
          onChange={handleInputChange}
        />

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

        <p className="text-dark-300 mb-2">拖拽 DICOM 文件到此处，或</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm font-medium transition-colors"
        >
          选择文件
        </button>
        <p className="text-dark-500 text-xs mt-3">支持批量上传，自动解析元数据并去重</p>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mt-6 bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-300">
              正在处理: {progress.currentFile}
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

      {/* Result */}
      {result && !isUploading && (
        <div className="mt-6 bg-dark-800 rounded-xl p-4 border border-dark-700">
          <h3 className="text-white font-medium mb-2">上传完成</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{result.success}</p>
              <p className="text-xs text-dark-400">成功</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{result.duplicate}</p>
              <p className="text-xs text-dark-400">去重</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{result.errors}</p>
              <p className="text-xs text-dark-400">失败</p>
            </div>
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
