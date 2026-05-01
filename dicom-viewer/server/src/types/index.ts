export interface DICOMMeta {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  seriesDescription: string;
  seriesNumber: number;
  instanceNumber: number;
  sliceThickness: number;
  rows: number;
  columns: number;
  pixelSpacing: number[];
  imagePositionPatient: number[];
  imageOrientationPatient: number[];
  frameOfReferenceUID: string;
  windowCenter: number;
  windowWidth: number;
  rescaleIntercept: number;
  rescaleSlope: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number;
}

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
  createdAt: Date;
  updatedAt: Date;
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

export interface Instance {
  _id: string;
  seriesId: string;
  sopInstanceUID: string;
  instanceNumber: number;
  sliceThickness?: number;
  rows: number;
  columns: number;
  pixelSpacing?: number[];
  imagePositionPatient?: number[];
  imageOrientationPatient?: number[];
  frameOfReferenceUID: string;
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
  fileID: string;
}

export interface UploadResult {
  status: 'success' | 'duplicate' | 'error';
  sopInstanceUID?: string;
  fileID?: string;
  error?: string;
}
