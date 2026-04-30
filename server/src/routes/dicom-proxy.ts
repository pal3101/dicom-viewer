import { Router } from 'express';
import https from 'https';
import http from 'http';
import { getTempFileURLBatch } from '../services/cloudbase-storage';

const router = Router();

router.get('/dicom-image', async (req, res) => {
  const fileID = req.query.fileID as string;
  if (!fileID) return res.status(400).json({ error: 'Missing fileID' });

  try {
    const [tempUrl] = await getTempFileURLBatch([fileID]);
    if (!tempUrl) return res.status(404).json({ error: 'File not found' });

    const urlObj = new URL(tempUrl);
    const getter = urlObj.protocol === 'https:' ? https.get : http.get;

    getter(tempUrl, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        res.status(502).json({ error: `Upstream returned ${proxyRes.statusCode}` });
        return;
      }

      const contentType = proxyRes.headers['content-type'] || 'application/dicom';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      proxyRes.pipe(res);
    }).on('error', (err) => {
      res.status(502).json({ error: `Upstream error: ${err.message}` });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
