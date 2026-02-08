// Workflow steps
export type WorkflowStep = 'upload' | 'identify' | 'select' | 'review' | 'export';

// Granularity options for extraction
export type Granularity = 'annotated_only' | 'full' | 'full_with_source';

// File types
export interface FileMetadata {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  pages: number | null;
  created_at: string;
}

// Bounding box coordinates
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Detected element from identification
export interface DetectedElement {
  element_id: string;
  element_type: string;
  description: string;
  bbox: BBox;
  page?: number;
}

// Identification response
export interface IdentificationResponse {
  id: string;
  file_id: string;
  page: number;
  status: string;
  elements: DetectedElement[];
  duration_ms: number;
  created_at: string;
}

// Dataset from extraction
export interface Dataset {
  id: string;
  element_id: string;
  name: string;
  strategy_used: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

// Extraction response
export interface ExtractRunResponse {
  id: string;
  file_id: string;
  page: number;
  status: string;
  datasets: Dataset[];
  duration_ms: number;
  created_at: string;
}

// Extraction options
export interface ExtractionOptions {
  granularity: Granularity;
  merge_datasets?: boolean;
  output_language?: string;
}

// Health check response
export interface HealthResponse {
  status: string;
  timestamp: string;
}
