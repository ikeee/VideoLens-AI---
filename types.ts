export enum ProcessingStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface VideoFrame {
  id: string;
  timestamp: number; // Time in seconds
  imageUrl: string; // Base64 data URL
  prompt: string | null;
  status: ProcessingStatus;
  errorMessage?: string;
}

export interface AnalysisConfig {
  interval: number; // Extract frame every N seconds
  customInstructions: string;
}
