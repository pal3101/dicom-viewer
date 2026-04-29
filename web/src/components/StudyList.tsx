import { Link } from 'react-router-dom';
import type { Study } from '../types';

interface StudyListProps {
  studies: Study[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const modalityColors: Record<string, string> = {
  CT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  PET: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CR: 'bg-green-500/20 text-green-300 border-green-500/30',
  DX: 'bg-green-500/20 text-green-300 border-green-500/30',
  US: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

export function StudyList({ studies, loading, error, onRefresh }: StudyListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-medical-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-400 text-sm">加载病例列表中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-red-400">{error}</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="w-16 h-16 text-dark-600" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="8" width="48" height="48" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M20 32h24M32 20v24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-dark-400">暂无病例数据</p>
        <Link
          to="/upload"
          className="px-4 py-2 bg-medical-600 hover:bg-medical-500 rounded-lg text-sm transition-colors"
        >
          上传 DICOM 文件
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {studies.map((study) => (
        <StudyCard key={study._id} study={study} />
      ))}
    </div>
  );
}

function StudyCard({ study }: { study: Study }) {
  const modalityClass = modalityColors[study.modality] || 'bg-dark-500/20 text-dark-300 border-dark-500/30';

  return (
    <Link
      to={`/viewer/${study._id}`}
      className="group block bg-dark-800 rounded-xl border border-dark-700 hover:border-medical-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-medical-500/10"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate group-hover:text-medical-300 transition-colors">
              {study.patientName || '无名氏'}
            </h3>
            <p className="text-dark-400 text-sm mt-0.5">ID: {study.patientId}</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${modalityClass}`}>
            {study.modality}
          </span>
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm text-dark-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {study.studyDate || '未知日期'}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="2" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 2v16M12 2v16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {study.seriesCount} 序列
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {study.instanceCount} 图像
          </span>
        </div>

        {/* Description */}
        {study.description && (
          <p className="mt-2 text-dark-400 text-sm truncate">{study.description}</p>
        )}

        {/* Arrow indicator */}
        <div className="mt-3 flex justify-end">
          <svg className="w-4 h-4 text-dark-500 group-hover:text-medical-400 group-hover:translate-x-1 transition-all" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
