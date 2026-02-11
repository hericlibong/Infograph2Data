import { create } from 'zustand';
import type { WorkflowStep, Granularity, FileMetadata, IdentificationResponse, ExtractRunResponse } from '@/types';

// Source filter type for Review/Export pages
export type SourceFilter = 'all' | 'annotated' | 'estimated';

interface WorkflowOptions {
  granularity: Granularity;
  selectedElements: string[];
}

interface AppState {
  // Current workflow state
  currentStep: WorkflowStep;
  currentFileId: string | null;
  currentFile: FileMetadata | null;
  currentPage: number;
  
  // Workflow options
  options: WorkflowOptions;
  
  // Source filter for Review/Export
  sourceFilter: SourceFilter;
  
  // Identification result
  identification: IdentificationResponse | null;
  
  // Extraction result
  extraction: ExtractRunResponse | null;
  
  // Actions
  setCurrentStep: (step: WorkflowStep) => void;
  setCurrentFile: (file: FileMetadata) => void;
  setCurrentPage: (page: number) => void;
  setGranularity: (granularity: Granularity) => void;
  setSelectedElements: (elements: string[]) => void;
  toggleElement: (elementId: string) => void;
  setIdentification: (result: IdentificationResponse) => void;
  setExtraction: (result: ExtractRunResponse) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'upload' as WorkflowStep,
  currentFileId: null,
  currentFile: null,
  currentPage: 1,
  options: {
    granularity: 'full_with_source' as Granularity,
    selectedElements: [] as string[],
  },
  sourceFilter: 'all' as SourceFilter,
  identification: null,
  extraction: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setCurrentFile: (file) => set({ 
    currentFileId: file.id, 
    currentFile: file,
    currentStep: 'identify',
    currentPage: 1,
  }),
  
  setCurrentPage: (page) => set({ 
    currentPage: page,
    identification: null, // Reset when changing page
    options: { granularity: 'full_with_source', selectedElements: [] }
  }),
  
  setGranularity: (granularity) => set((state) => ({
    options: { ...state.options, granularity }
  })),
  
  setSelectedElements: (elements) => set((state) => ({
    options: { ...state.options, selectedElements: elements }
  })),
  
  toggleElement: (elementId) => set((state) => {
    const elements = state.options.selectedElements;
    const newElements = elements.includes(elementId)
      ? elements.filter((id) => id !== elementId)
      : [...elements, elementId];
    return { options: { ...state.options, selectedElements: newElements } };
  }),
  
  setIdentification: (result) => set({ 
    identification: result,
    currentStep: 'select',
    options: { 
      granularity: 'full_with_source',
      selectedElements: result.detected_items.map(e => e.item_id)
    }
  }),
  
  setExtraction: (result) => set({ 
    extraction: result,
    currentStep: 'review',
    sourceFilter: 'all', // Reset filter when new extraction
  }),
  
  setSourceFilter: (filter) => set({ sourceFilter: filter }),
  
  reset: () => set(initialState),
}));
