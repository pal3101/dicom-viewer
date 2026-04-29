import { Router } from 'express';
import {
  getStudyById,
  getSeriesByStudyId,
  getInstancesBySeriesId,
} from '../db/cloudbase';
import { getTempFileURLBatch } from '../services/cloudbase-storage';

const router = Router();

// GET /api/studies/:id/dicom-json
// Returns OHIF dicomjson format with temp URLs for direct image loading
router.get('/studies/:id/dicom-json', async (req, res) => {
  try {
    const study = await getStudyById(req.params.id);
    if (!study) return res.status(404).json({ error: 'Study not found' });

    const seriesList = await getSeriesByStudyId(req.params.id);

    // Collect all fileIDs for batch temp URL fetch
    const allFileIDs: { seriesId: string; instanceId: string; fileID: string }[] = [];
    const fileIDToInstance = new Map<string, { seriesId: string; instanceId: string }>();

    for (const series of seriesList) {
      const instances = await getInstancesBySeriesId(series._id);
      for (const inst of instances) {
        if (inst.fileID) {
          allFileIDs.push({ seriesId: series._id, instanceId: inst._id, fileID: inst.fileID });
          fileIDToInstance.set(inst.fileID, { seriesId: series._id, instanceId: inst._id });
        }
      }
    }

    // Batch get temp URLs (CloudBase supports up to 50 per call)
    const urlMap = new Map<string, string>();
    for (let i = 0; i < allFileIDs.length; i += 50) {
      const batch = allFileIDs.slice(i, i + 50);
      const results = await getTempFileURLBatch(batch.map((b) => b.fileID));
      for (let j = 0; j < batch.length && j < results.length; j++) {
        urlMap.set(batch[j].fileID, results[j]);
      }
    }

    // Build OHIF dicomjson structure
    const ohifSeries = await Promise.all(
      seriesList.map(async (series) => {
        const instances = await getInstancesBySeriesId(series._id);

        const ohifInstances = instances
          .map((inst) => {
            const imageUrl = urlMap.get(inst.fileID);
            if (!imageUrl) return null;

            return {
              metadata: {
                StudyInstanceUID: study.studyInstanceUID,
                SeriesInstanceUID: series.seriesInstanceUID,
                SOPInstanceUID: inst.sopInstanceUID,
                Modality: series.modality || 'CT',
                InstanceNumber: inst.instanceNumber || 1,
                Rows: inst.rows || 512,
                Columns: inst.columns || 512,
                SamplesPerPixel: 1,
                PhotometricInterpretation: 'MONOCHROME2',
                BitsAllocated: 16,
                BitsStored: 16,
                HighBit: 15,
                PixelRepresentation: 0,
                RescaleIntercept: 0,
                RescaleSlope: 1,
                ...(inst.sliceThickness && { SliceThickness: inst.sliceThickness }),
                ...(inst.pixelSpacing?.length === 2 && {
                  PixelSpacing: inst.pixelSpacing,
                }),
                ...(inst.imagePositionPatient?.length === 3 && {
                  ImagePositionPatient: inst.imagePositionPatient,
                }),
                ...(inst.imageOrientationPatient?.length === 6 && {
                  ImageOrientationPatient: inst.imageOrientationPatient,
                }),
              },
              url: `${imageUrl}?_cb=${Date.now()}`,
              imageId: `wadouri:${imageUrl}?_cb=${Date.now()}`,
            };
          })
          .filter(Boolean);

        return {
          SeriesInstanceUID: series.seriesInstanceUID,
          SeriesNumber: series.seriesNumber || 1,
          SeriesDescription: series.seriesDescription || '',
          Modality: series.modality,
          instances: ohifInstances,
        };
      }),
    );

    const response = {
      studies: [
        {
          StudyInstanceUID: study.studyInstanceUID,
          StudyDate: study.studyDate?.replace(/-/g, '') || '',
          StudyTime: '',
          StudyDescription: study.description || '',
          PatientName: study.patientName || '',
          PatientID: study.patientId || '',
          PatientBirthDate: '',
          PatientSex: '',
          AccessionNumber: '',
          ModalitiesInStudy: study.modality,
          NumberOfStudyRelatedSeries: seriesList.length,
          NumberOfStudyRelatedInstances: study.instanceCount || 0,
          series: ohifSeries,
        },
      ],
    };

    res.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
