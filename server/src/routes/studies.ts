import { Router } from 'express';
import multer from 'multer';
import { parseDICOM } from '../services/dicom-parser';
import { indexDICOMFile } from '../services/study-indexer';
import {
  getStudies,
  getStudyById,
  getSeriesByStudyId,
  getInstancesBySeriesId,
} from '../db/cloudbase';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload single DICOM file → parse, dedup, index
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const meta = parseDICOM(req.file.buffer);
    const result = await indexDICOMFile(meta, req.body.fileID || '');

    res.json({
      status: result.status,
      meta: {
        patientName: meta.patientName,
        studyInstanceUID: meta.studyInstanceUID,
        seriesInstanceUID: meta.seriesInstanceUID,
        sopInstanceUID: meta.sopInstanceUID,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Batch upload
router.post('/upload/batch', upload.array('files', 10000), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    let success = 0;
    let duplicate = 0;
    let errors = 0;

    for (const file of req.files) {
      try {
        const meta = parseDICOM(file.buffer);
        const result = await indexDICOMFile(meta, '');
        results.push({
          filename: file.originalname,
          status: result.status,
          sopInstanceUID: meta.sopInstanceUID,
        });
        if (result.status === 'success') success++;
        else if (result.status === 'duplicate') duplicate++;
      } catch {
        errors++;
        results.push({
          filename: file.originalname,
          status: 'error',
        });
      }
    }

    res.json({ total: req.files.length, success, duplicate, errors, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Get all studies
router.get('/studies', async (_req, res) => {
  try {
    const studies = await getStudies();
    res.json(studies);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Get study detail
router.get('/studies/:id', async (req, res) => {
  try {
    const study = await getStudyById(req.params.id);
    if (!study) return res.status(404).json({ error: 'Study not found' });
    res.json(study);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Get series for a study
router.get('/studies/:studyId/series', async (req, res) => {
  try {
    const series = await getSeriesByStudyId(req.params.studyId);
    res.json(series);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Get instances for a series
router.get('/series/:seriesId/instances', async (req, res) => {
  try {
    const instances = await getInstancesBySeriesId(req.params.seriesId);
    res.json(instances);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
