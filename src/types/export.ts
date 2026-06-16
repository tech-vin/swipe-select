export type ExportMode = 'copy' | 'move';
export type ExportCategory = 'selected' | 'rejected' | 'favorite' | 'skipped';

export interface ExportRequest {
  sessionId: string;
  categories: ExportCategory[];
  destinationRoot: string;
  mode: ExportMode;
  organizeByCategory: boolean;
  verifyHashes: boolean;
}

export interface ExportFailure {
  path: string;
  reason: string;
}

export interface ExportReport {
  totalRequested: number;
  succeeded: number;
  failed: ExportFailure[];
  missingSources: string[];
  skippedExisting: string[];
  verifiedHashes: number;
  durationMs: number;
}
