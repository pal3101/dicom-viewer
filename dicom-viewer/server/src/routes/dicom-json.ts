import { Router } from 'express';
import {
  getStudyById,
  getSeriesByStudyId,
  getInstancesBySeriesId,
} from '../db/cloudbase';

const router = Router();

// GET /api/studies/:id/dicom-json
// Returns OHIF dicomjson format with proxy URLs for image loading
router.get('/studies/:id/dicom-json', async (req, res) => {
  try {
    const study = await getStudyById(req.params.id);
    if (!study) return res.status(404).json({ error: 'Study not found' });

    const seriesList = await getSeriesByStudyId(req.params.id);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const ohifSeries = await Promise.all(
      seriesList.map(async (series) => {
        const instances = await getInstancesBySeriesId(series._id);

        const ohifInstances = instances
          .filter((inst) => inst.fileID)
          .map((inst) => {
            const imageUrl = `${baseUrl}/api/dicom-image?fileID=${encodeURIComponent(inst.fileID)}`;

            return {
              metadata: {
                StudyInstanceUID: study.studyInstanceUID,
                SeriesInstanceUID: series.seriesInstanceUID,
                SOPInstanceUID: inst.sopInstanceUID,
                Modality: series.modality || 'CT',
                InstanceNumber: inst.instanceNumber || 1,
                Rows: inst.rows || 512,
                Columns: inst.columns || 512,
                SamplesPerPixel: inst.samplesPerPixel || 1,
                PhotometricInterpretation: inst.photometricInterpretation || 'MONOCHROME2',
                BitsAllocated: inst.bitsAllocated || 16,
                BitsStored: inst.bitsStored || 16,
                HighBit: inst.highBit ?? (inst.bitsAllocated ? inst.bitsAllocated - 1 : 15),
                PixelRepresentation: inst.pixelRepresentation ?? 0,
                RescaleIntercept: inst.rescaleIntercept ?? 0,
                RescaleSlope: inst.rescaleSlope ?? 1,
                ...(inst.frameOfReferenceUID && { FrameOfReferenceUID: inst.frameOfReferenceUID }),
                ...(inst.windowCenter !== undefined && { WindowCenter: inst.windowCenter }),
                ...(inst.windowWidth !== undefined && { WindowWidth: inst.windowWidth }),
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
              url: imageUrl,
              imageId: `wadouri:${imageUrl}`,
            };
          });

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
