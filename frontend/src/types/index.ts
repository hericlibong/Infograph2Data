// Workflow steps
export type WorkflowStep = 'upload' | 'identify' | 'select' | 'review' | 'export';

// Granularity options for extraction
export type Granularity = 'annotated_only' | 'full' | 'full_with_source';

// File types
export interface FileMetadata {
  id: string;
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
  item_id: string;
  type: string;
  title: string | null;
  description: string;
  data_preview: string;
  bbox: BBox;
  confidence: number;
  warnings: string[];
}

// Image dimensions
export interface ImageDimensions {
  width: number;
  height: number;
}

// Identification response
export interface IdentificationResponse {
  identification_id: string;
  file_id: string;
  page: number;
  image_dimensions: ImageDimensions;
  detected_items: DetectedElement[];
  status: string;
  expires_at: string;
  created_at: string;
  duration_ms: number;
}

// Dataset from extraction
export interface Dataset {
  dataset_id: string;
  source_item_id?: string;
  title: string;
  type?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

// Extraction response
export interface ExtractRunResponse {
  job_id: string;
  identification_id: string;
  status: string;
  datasets: Dataset[];
  duration_ms: number;
  created_at: string;
}

// Extraction options
export interface ExtractionOptions {
  granularity: Granularity;
  selectedItems?: string[];
  merge_datasets?: boolean;
  output_language?: string;
}

// Health check response
export interface HealthResponse {
  status: string;
  version: string;
}
