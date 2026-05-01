import type { DICOMMeta } from '../types/index.js';
import {
  findOrCreateStudy,
  findOrCreateSeries,
  addInstance,
  incrementStudyCounts,
  checkDuplicate,
} from '../db/cloudbase.js';

export async function indexDICOMFile(
  meta: DICOMMeta,
  fileID: string,
): Promise<{ status: string; studyId?: string; seriesId?: string }> {
  // Dedup check
  if (await checkDuplicate(meta.sopInstanceUID)) {
    return { status: 'duplicate', studyId: undefined, seriesId: undefined };
  }

  // Build study and series hierarchy
  const studyId = await findOrCreateStudy({
    studyInstanceUID: meta.studyInstanceUID,
    patientName: meta.patientName,
    patientId: meta.patientId,
    studyDate: meta.studyDate,
    modality: meta.modality,
    description: meta.seriesDescription,
  });

  const seriesId = await findOrCreateSeries({
    seriesInstanceUID: meta.seriesInstanceUID,
    studyId,
    seriesNumber: meta.seriesNumber,
    seriesDescription: meta.seriesDescription,
    modality: meta.modality,
  });

  // Add instance
  await addInstance({
    seriesId,
    sopInstanceUID: meta.sopInstanceUID,
    instanceNumber: meta.instanceNumber,
    sliceThickness: meta.sliceThickness,
    rows: meta.rows,
    columns: meta.columns,
    pixelSpacing: meta.pixelSpacing,
    imagePositionPatient: meta.imagePositionPatient,
    imageOrientationPatient: meta.imageOrientationPatient,
    frameOfReferenceUID: meta.frameOfReferenceUID,
    windowCenter: meta.windowCenter,
    windowWidth: meta.windowWidth,
    rescaleIntercept: meta.rescaleIntercept,
    rescaleSlope: meta.rescaleSlope,
    samplesPerPixel: meta.samplesPerPixel,
    photometricInterpretation: meta.photometricInterpretation,
    bitsAllocated: meta.bitsAllocated,
    bitsStored: meta.bitsStored,
    highBit: meta.highBit,
    pixelRepresentation: meta.pixelRepresentation,
    fileID,
  });

  // Update counts
  await incrementStudyCounts(studyId, seriesId);

  return { status: 'success', studyId, seriesId };
}
