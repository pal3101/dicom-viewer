/// <reference types="vite/client" />

declare module '@cloudbase/js-sdk' {
  interface UploadFileParams {
    cloudPath: string;
    filePath: File | string;
    onUploadProgress?: (progress: { loaded: number; total: number }) => void;
  }

  interface UploadFileResult {
    fileID: string;
  }

  interface TempFileURLParams {
    fileID: string;
    maxAge?: number;
  }

  interface TempFileURLResult {
    tempFileURL?: string;
    download_url?: string;
    code?: string;
  }

  interface GetTempFileURLParams {
    fileList: TempFileURLParams[];
  }

  interface GetTempFileURLResult {
    fileList: TempFileURLResult[];
  }

  interface Auth {
    signInAnonymously(): Promise<void>;
    signOut(): Promise<void>;
    onAuthStateChanged(callback: (user: unknown) => void): void;
    hasLoginState(): boolean;
    getCurrentUser(): Promise<unknown>;
  }

  interface Database {
    collection(name: string): Collection;
    command: Record<string, unknown>;
  }

  interface Collection {
    doc(id: string): DocumentRef;
    where(query: Record<string, unknown>): Query;
    orderBy(field: string, direction: 'asc' | 'desc'): Query;
    limit(n: number): Query;
    skip(n: number): Query;
    field(fields: Record<string, boolean>): Query;
    add(data: Record<string, unknown>): Promise<{ _id: string; id?: string; ids?: string[] }>;
    get(): Promise<{ data: Record<string, unknown>[] }>;
  }

  interface Query {
    orderBy(field: string, direction: 'asc' | 'desc'): Query;
    limit(n: number): Query;
    skip(n: number): Query;
    field(fields: Record<string, boolean>): Query;
    get(): Promise<{ data: Record<string, unknown>[] }>;
    update(data: Record<string, unknown>): Promise<unknown>;
    remove(): Promise<unknown>;
  }

  interface DocumentRef {
    get(): Promise<{ data: Record<string, unknown>[] }>;
    update(data: Record<string, unknown>): Promise<unknown>;
    remove(): Promise<unknown>;
  }

  interface App {
    database(): Database;
    auth(): Auth;
    uploadFile(params: UploadFileParams): Promise<UploadFileResult>;
    getTempFileURL(params: GetTempFileURLParams): Promise<GetTempFileURLResult>;
    downloadFile(params: { fileID: string }): Promise<{ fileContent: Blob; fileID: string }>;
    deleteFile(params: { fileList: string[] }): Promise<void>;
  }

  interface CloudbaseInitOptions {
    env: string;
  }

  const cloudbase: {
    init(options: CloudbaseInitOptions): App;
  };

  export default cloudbase;
}
