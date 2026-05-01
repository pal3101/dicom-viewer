import dicomParser from 'dicom-parser';
import type { DICOMMeta } from '../types/index.js';

function readTag(dataSet: dicomParser.DataSet, tag: string): string {
  return dataSet.string(tag) || '';
}

function readFloatStringTag(dataSet: dicomParser.DataSet, tag: string): number {
  return dataSet.floatString(tag) || 0;
}

function readIntTag(dataSet: dicomParser.DataSet, tag: string): number {
  return dataSet.intString(tag) || 0;
}

function readUint16Tag(dataSet: dicomParser.DataSet, tag: string): number {
  return dataSet.uint16(tag) || 0;
}

function readStringArray(dataSet: dicomParser.DataSet, tag: string): number[] {
  const str = readTag(dataSet, tag);
  if (!str) return [];
  return str.split('\\').map(Number);
}

function formatStudyDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

export function parseDICOM(buffer: Buffer): DICOMMeta {
  const byteArray = new Uint8Array(buffer);
  const dataSet = dicomParser.parseDicom(byteArray);

  return {
    studyInstanceUID: readTag(dataSet, 'x0020000d'),
    seriesInstanceUID: readTag(dataSet, 'x0020000e'),
    sopInstanceUID: readTag(dataSet, 'x00080018'),
    patientName: readTag(dataSet, 'x00100010').replace(/\^/g, ' ').trim(),
    patientId: readTag(dataSet, 'x00100020'),
    studyDate: formatStudyDate(readTag(dataSet, 'x00080020')),
    modality: readTag(dataSet, 'x00080060'),
    seriesDescription: readTag(dataSet, 'x0008103e'),
    seriesNumber: readIntTag(dataSet, 'x00200011'),
    instanceNumber: readIntTag(dataSet, 'x00200013'),
    sliceThickness: readFloatStringTag(dataSet, 'x00180050'),
    rows: readUint16Tag(dataSet, 'x00280010'),
    columns: readUint16Tag(dataSet, 'x00280011'),
    pixelSpacing: readStringArray(dataSet, 'x00280030'),
    imagePositionPatient: readStringArray(dataSet, 'x00200032'),
    imageOrientationPatient: readStringArray(dataSet, 'x00200037'),
    frameOfReferenceUID: readTag(dataSet, 'x00200052'),
    windowCenter: readIntTag(dataSet, 'x00281050'),
    windowWidth: readIntTag(dataSet, 'x00281051'),
    rescaleIntercept: readFloatStringTag(dataSet, 'x00281052'),
    rescaleSlope: readFloatStringTag(dataSet, 'x00281053') || 1,
    samplesPerPixel: readUint16Tag(dataSet, 'x00280002') || 1,
    photometricInterpretation: readTag(dataSet, 'x00280004') || 'MONOCHROME2',
    bitsAllocated: readUint16Tag(dataSet, 'x00280100') || 16,
    bitsStored: readUint16Tag(dataSet, 'x00280101') || 16,
    highBit: readUint16Tag(dataSet, 'x00280102'),
    pixelRepresentation: readUint16Tag(dataSet, 'x00280103'),
  };
}
