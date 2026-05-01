import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ViewerPage } from './pages/ViewerPage';
import { UploadPage } from './pages/UploadPage';
import { Header } from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/viewer/:studyId" element={<ViewerPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
