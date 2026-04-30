import cloudbase from '@cloudbase/node-sdk';
import type { Study, Series, Instance } from '../types';

let _app: ReturnType<typeof cloudbase.init> | null = null;
let _db: ReturnType<ReturnType<typeof cloudbase.init>['database']> | null = null;

function getApp(): ReturnType<typeof cloudbase.init> {
  if (!_app) {
    const envId = process.env.CLOUDBASE_ENV_ID;
    const secretId = process.env.TENCENTCLOUD_SECRETID;
    const secretKey = process.env.TENCENTCLOUD_SECRETKEY;

    if (!envId || !secretId || !secretKey) {
      throw new Error(
        'Missing CloudBase credentials. Set CLOUDBASE_ENV_ID, TENCENTCLOUD_SECRETID, and TENCENTCLOUD_SECRETKEY environment variables.',
      );
    }

    _app = cloudbase.init({ env: envId, secretId, secretKey });
  }
  return _app;
}

export function getDb(): ReturnType<ReturnType<typeof cloudbase.init>['database']> {
  if (!_db) {
    _db = getApp().database();
  }
  return _db;
}

export async function checkDuplicate(sopInstanceUID: string): Promise<boolean> {
  const result = await getDb().collection('instances')
    .where({ sopInstanceUID })
    .limit(1)
    .get();
  return result.data.length > 0;
}

export async function addInstance(instance: Omit<Instance, '_id'>): Promise<string> {
  const result = await getDb().collection('instances').add(instance);
  return result.id || result.ids?.[0] || '';
}

export async function findOrCreateStudy(meta: {
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
}): Promise<string> {
  const existing = await getDb().collection('studies')
    .where({ studyInstanceUID: meta.studyInstanceUID })
    .limit(1)
    .get();

  if (existing.data.length > 0) {
    await getDb().collection('studies').doc(existing.data[0]._id).update({
      updatedAt: new Date(),
    });
    return existing.data[0]._id;
  }

  const result = await getDb().collection('studies').add({
    studyInstanceUID: meta.studyInstanceUID,
    patientName: meta.patientName,
    patientId: meta.patientId,
    studyDate: meta.studyDate,
    modality: meta.modality,
    description: meta.description,
    seriesCount: 0,
    instanceCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.id || result.ids?.[0] || '';
}

export async function findOrCreateSeries(params: {
  seriesInstanceUID: string;
  studyId: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
}): Promise<string> {
  const existing = await getDb().collection('series')
    .where({ seriesInstanceUID: params.seriesInstanceUID })
    .limit(1)
    .get();

  if (existing.data.length > 0) {
    return existing.data[0]._id;
  }

  const result = await getDb().collection('series').add({
    seriesInstanceUID: params.seriesInstanceUID,
    studyId: params.studyId,
    seriesNumber: params.seriesNumber,
    seriesDescription: params.seriesDescription,
    modality: params.modality,
    instanceCount: 0,
  });
  return result.id || result.ids?.[0] || '';
}

export async function incrementStudyCounts(studyId: string, _seriesId: string): Promise<void> {
  await getDb().collection('studies').doc(studyId).update({
    instanceCount: getDb().command.inc(1),
  });
}

export async function getStudies(): Promise<Study[]> {
  const result = await getDb().collection('studies')
    .orderBy('studyDate', 'desc')
    .get();
  return result.data as Study[];
}

export async function getStudyById(studyId: string): Promise<Study | null> {
  const result = await getDb().collection('studies').doc(studyId).get();
  return result.data?.[0] as Study | undefined || null;
}

export async function getSeriesByStudyId(studyId: string): Promise<Series[]> {
  const result = await getDb().collection('series')
    .where({ studyId })
    .orderBy('seriesNumber', 'asc')
    .get();
  return result.data as Series[];
}

export async function getInstancesBySeriesId(seriesId: string): Promise<Instance[]> {
  const result = await getDb().collection('instances')
    .where({ seriesId })
    .orderBy('instanceNumber', 'asc')
    .get();
  return result.data as Instance[];
}
