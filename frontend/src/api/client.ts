import axios from 'axios';
import type { 
  FileMetadata, 
  IdentificationResponse, 
  ExtractRunResponse, 
  ExtractionOptions,
  HealthResponse 
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get('/health');
  return data;
};

// File upload
export const uploadFile = async (file: File): Promise<FileMetadata> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await api.post('/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// Get file metadata
export const getFile = async (fileId: string): Promise<FileMetadata> => {
  const { data } = await api.get(`/files/${fileId}`);
  return data;
};

// Get file preview URL
export const getFilePreviewUrl = (fileId: string, page?: number): string => {
  const pageParam = page ? `?page=${page}` : '';
  return `/api/files/${fileId}/preview${pageParam}`;
};

// Identify elements in file
export const identifyElements = async (
  fileId: string, 
  page: number = 1
): Promise<IdentificationResponse> => {
  const { data } = await api.post('/extract/identify', {
    file_id: fileId,
    page,
  });
  return data;
};

// Get existing identification
export const getIdentification = async (
  identificationId: string
): Promise<IdentificationResponse> => {
  const { data } = await api.get(`/extract/identify/${identificationId}`);
  return data;
};

// Run extraction
export const runExtraction = async (
  identificationId: string,
  options: ExtractionOptions
): Promise<ExtractRunResponse> => {
  const { data } = await api.post('/extract/run', {
    identification_id: identificationId,
    options,
  });
  return data;
};

// Export dataset
export const exportDataset = async (
  datasetId: string,
  format: 'csv' | 'json' = 'csv'
): Promise<Blob> => {
  const { data } = await api.get(`/datasets/${datasetId}/export`, {
    params: { format },
    responseType: 'blob',
  });
  return data;
};

export default api;
