import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

const isDev = import.meta.env.DEV;
const API_BASE = isDev ? 'http://localhost:3001' : '';
const OHIF_BASE_URL = import.meta.env.VITE_OHIF_URL || (isDev ? 'http://localhost:3001/ohif' : '/ohif');

export function ViewerPage() {
  const { studyId } = useParams<{ studyId: string }>();

  const jsonUrl = `${API_BASE}/api/studies/${studyId}/dicom-json`;
  const ohifSrc = `${OHIF_BASE_URL}/viewer/dicomjson?url=${encodeURIComponent(jsonUrl)}`;

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

  return (
    <div className="h-[calc(100vh-60px)] w-full">
      <iframe
        src={ohifSrc}
        className="w-full h-full border-0"
        allow="clipboard-write"
        title="DICOM Viewer"
      />
    </div>
  );
}
