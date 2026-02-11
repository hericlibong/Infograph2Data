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
  timeout: 300000, // 5 minutes for Vision LLM calls
});

// Debug interceptors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response [${response.config.method?.toUpperCase()} ${response.config.url}]:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, error.message, error.response?.data);
    return Promise.reject(error);
  }
);

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

// Get file preview URL - uses /content for images, /pages/{page}/preview for PDFs
// For PDFs, use scale=2.0 to match identification analysis
export const getFilePreviewUrl = (fileId: string, page: number = 1, isPdf: boolean = false): string => {
  if (isPdf) {
    return `/api/files/${fileId}/pages/${page}/preview?scale=2`;
  }
  return `/api/files/${fileId}/content`;
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

// Run extraction with retry
export const runExtraction = async (
  identificationId: string,
  options: ExtractionOptions
): Promise<ExtractRunResponse> => {
  const selectedItems = options.selectedItems || [];
  
  if (selectedItems.length === 0) {
    throw new Error('No items selected for extraction');
  }
  
  console.log('runExtraction called with:', { identificationId, selectedItems });
  
  // Extract ONE item at a time for stability
  const allDatasets: ExtractRunResponse['datasets'] = [];
  let totalDuration = 0;
  let lastJobId = '';
  
  for (const itemId of selectedItems) {
    console.log(`Extracting item: ${itemId}`);
    
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        const { data } = await api.post('/extract/run', {
          identification_id: identificationId,
          items: [{ item_id: itemId }],
          options: {
            granularity: options.granularity,
            merge_datasets: false,
            output_language: options.output_language,
          },
        });
        
        console.log(`✅ Item ${itemId} extracted:`, data.datasets?.length, 'datasets');
        
        if (data.datasets) {
          allDatasets.push(...data.datasets);
        }
        totalDuration += data.duration_ms || 0;
        lastJobId = data.job_id;
        success = true;
      } catch (err) {
        console.warn(`⚠️ Attempt ${attempts}/${maxAttempts} failed for ${itemId}:`, err);
        
        // Extract detailed error message from backend
        let errorDetail = 'Unknown error';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { detail?: string } } };
          errorDetail = axiosErr.response?.data?.detail || errorDetail;
        }
        
        if (attempts >= maxAttempts) {
          console.error(`❌ Giving up on item ${itemId}: ${errorDetail}`);
          // Store the last error for reporting
          if (allDatasets.length === 0) {
            throw new Error(errorDetail);
          }
          // Continue with other items if we have some results
        } else {
          // Wait before retry (exponential backoff)
          const waitTime = 2000 * attempts;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  }
  
  if (allDatasets.length === 0) {
    throw new Error('Failed to extract any data. Please try again.');
  }
  
  const result: ExtractRunResponse = {
    job_id: lastJobId,
    identification_id: identificationId,
    status: 'completed',
    datasets: allDatasets,
    duration_ms: totalDuration,
    created_at: new Date().toISOString(),
  };
  
  console.log('✅ Extraction completed:', result.datasets.length, 'total datasets');
  return result;
};

// Export dataset as ZIP
export const exportDataset = async (
  datasetId: string,
  formats: string[] = ['csv', 'json'],
  sourceFilter: 'all' | 'annotated' | 'estimated' = 'all'
): Promise<Blob> => {
  const { data } = await api.get(`/export/${datasetId}`, {
    params: { 
      formats: formats.join(','),
      source_filter: sourceFilter,
    },
    responseType: 'blob',
  });
  return data;
};

export default api;
