import type { Series, DICOMInstance } from '../types';

/**
 * OHIF-compatible metadata shape that the viewer expects.
 * We convert our DB records into this shape for the viewer to consume.
 */
export interface OHIFSeriesMetadata {
  SeriesInstanceUID: string;
  SeriesNumber: number;
  SeriesDescription: string;
  Modality: string;
  instances: OHIFInstanceMetadata[];
}

export interface OHIFInstanceMetadata {
  StudyInstanceUID: string;
  SeriesInstanceUID: string;
  SOPInstanceUID: string;
  InstanceNumber: number;
  Rows: number;
  Columns: number;
  SliceThickness: number;
  PixelSpacing: number[];
  ImagePositionPatient: number[];
  ImageOrientationPatient: number[];
  fileID: string;
}

/**
 * Convert our DB data into OHIF-compatible metadata.
 */
export function seriesToOHIFMetadata(
  studyUID: string,
  series: Series,
  instances: DICOMInstance[],
): OHIFSeriesMetadata {
  return {
    SeriesInstanceUID: series.seriesInstanceUID,
    SeriesNumber: series.seriesNumber,
    SeriesDescription: series.seriesDescription,
    Modality: series.modality,
    instances: instances.map((inst) => ({
      StudyInstanceUID: studyUID,
      SeriesInstanceUID: inst.seriesId ? '' : series.seriesInstanceUID,
      SOPInstanceUID: inst.sopInstanceUID,
      InstanceNumber: inst.instanceNumber,
      Rows: inst.rows,
      Columns: inst.columns,
      SliceThickness: inst.sliceThickness,
      PixelSpacing: inst.pixelSpacing || [1, 1],
      ImagePositionPatient: inst.imagePositionPatient || [0, 0, 0],
      ImageOrientationPatient: inst.imageOrientationPatient || [1, 0, 0, 0, 1, 0],
      fileID: inst.fileID,
    })),
  };
}
