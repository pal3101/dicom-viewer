export interface Study {
  _id: string;
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  seriesCount: number;
  instanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  _id: string;
  studyId: string;
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  instanceCount: number;
  thumbnailFileID?: string;
}

export interface DICOMInstance {
  _id: string;
  seriesId: string;
  sopInstanceUID: string;
  instanceNumber: number;
  sliceThickness: number;
  rows: number;
  columns: number;
  pixelSpacing: number[];
  imagePositionPatient: number[];
  imageOrientationPatient: number[];
  fileID: string;
}

export interface UploadProgress {
  total: number;
  uploaded: number;
  success: number;
  duplicate: number;
  errors: number;
  currentFile: string;
}
