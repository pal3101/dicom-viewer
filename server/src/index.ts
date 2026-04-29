import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import studiesRouter from './routes/studies';
import dicomJsonRouter from './routes/dicom-json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', studiesRouter);
app.use('/api', dicomJsonRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve OHIF static assets
const OHIF_DIST_PATH = path.join(__dirname, '../../ohif-viewer/dist');
app.use('/ohif', express.static(OHIF_DIST_PATH));
app.get('/ohif*', (_req, res) => {
  res.sendFile(path.join(OHIF_DIST_PATH, 'index.html'));
});

// Serve web app static assets (production)
const WEB_DIST_PATH = path.join(__dirname, '../../web/dist');
app.use(express.static(WEB_DIST_PATH));
app.get('*', (_req, res) => {
  res.sendFile(path.join(WEB_DIST_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DICOM Viewer server running on port ${PORT}`);
});
