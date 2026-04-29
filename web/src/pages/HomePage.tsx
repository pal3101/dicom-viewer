import { StudyList } from '../components/StudyList';
import { useStudies } from '../hooks/useStudies';

export function HomePage() {
  const { studies, loading, error, refresh } = useStudies();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">病例列表</h1>
          <p className="text-dark-400 text-sm mt-1">共 {studies.length} 个检查</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
            <path d="M3 10a7 7 0 0112.5-4.5M17 10a7 7 0 01-12.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M15 2v4h-4M5 18v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <StudyList studies={studies} loading={loading} error={error} onRefresh={refresh} />
    </div>
  );
}
