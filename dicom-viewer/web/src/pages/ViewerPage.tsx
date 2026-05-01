import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { fetchStudyById } from '../lib/api';
import type { Study } from '../types';

const isDev = import.meta.env.DEV;
const API_ORIGIN =
  isDev ? 'http://localhost:3001' : (typeof window !== 'undefined' ? window.location.origin : '');
const OHIF_BASE_URL = import.meta.env.VITE_OHIF_URL || (isDev ? 'http://localhost:3001/ohif' : '/ohif');

const VIEW_MODES = [
  { id: 'fourUp', label: '四窗 MPR' },
  { id: 'mpr', label: '三视图 MPR' },
  { id: 'primary3D', label: '3D 骨骼' },
] as const;

const DEFAULT_VIEW_MODE = VIEW_MODES[0].id;

export function ViewerPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]['id']>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    let active = true;

    async function loadStudy(id: string) {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchStudyById(id);
        if (!active) return;
        setStudy(data);
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load study';
        setStudy(null);
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (!studyId) {
      setStudy(null);
      setLoading(false);
      setError('Study not found');
      return () => {
        active = false;
      };
    }

    loadStudy(studyId);

    return () => {
      active = false;
    };
  }, [studyId]);

  const jsonUrl = new URL(`/api/studies/${studyId}/dicom-json`, API_ORIGIN).toString();

  if (!studyId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="text-center">
          <p className="text-dark-400 mb-3">未找到检查</p>
          <Link to="/" className="text-medical-400 hover:text-medical-300">
            返回病例列表
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-medical-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-dark-400">正在加载影像检查...</p>
        </div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="text-center max-w-md px-6">
          <p className="text-red-400 mb-3">
            {error === 'Study not found' ? '未找到对应检查，可能是旧链接或当前环境中没有这条数据。' : (error || '未找到对应检查。')}
          </p>
          <Link to="/" className="text-medical-400 hover:text-medical-300">
            返回病例列表
          </Link>
        </div>
      </div>
    );
  }

  const ohifSrc = `${OHIF_BASE_URL}/viewer/dicomjson?url=${encodeURIComponent(jsonUrl)}&StudyInstanceUIDs=${encodeURIComponent(study.studyInstanceUID)}&hangingprotocolId=${encodeURIComponent(viewMode)}`;

  return (
    <div className="h-[calc(100vh-60px)] w-full flex flex-col">
      <div className="border-b border-dark-700 bg-dark-900/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white font-medium">{study.patientName || study.patientId}</p>
          <p className="text-xs text-dark-400">
            CT 重建视图切换。四窗适合联动观察，3D 骨骼适合快速查看骨结构。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {VIEW_MODES.map((mode) => {
            const active = mode.id === viewMode;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-medical-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <iframe
        src={ohifSrc}
        className="w-full flex-1 border-0"
        allow="clipboard-write"
        title="DICOM Viewer"
      />
    </div>
  );
}
