import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();

  const navClass = (path: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-medical-600 text-white'
        : 'text-dark-300 hover:text-white hover:bg-dark-800'
    }`;

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <svg className="w-8 h-8 text-medical-400" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="currentColor" />
          </svg>
          <span className="text-lg font-semibold text-white">DICOM Viewer</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/" className={navClass('/')}>
            病例列表
          </Link>
          <Link to="/upload" className={navClass('/upload')}>
            上传
          </Link>
        </nav>
      </div>
    </header>
  );
}
