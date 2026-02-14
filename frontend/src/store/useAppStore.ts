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
  
  // UX: Track unsaved changes for navigation guards
  hasUnsavedChanges: boolean;
  
  // UX: Global loading state
  isLoading: boolean;
  loadingMessage: string | null;
  loadingProgress: number | null;
  
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
  setHasUnsavedChanges: (value: boolean) => void;
  setLoading: (isLoading: boolean, message?: string | null, progress?: number | null) => void;
  reset: () => void;
  
  // Navigation helpers
  canNavigateTo: (step: WorkflowStep) => boolean;
  navigateToStep: (step: WorkflowStep) => void;
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
  hasUnsavedChanges: false,
  isLoading: false,
  loadingMessage: null as string | null,
  loadingProgress: null as number | null,
};

// Step order for navigation logic
const stepOrder: WorkflowStep[] = ['upload', 'identify', 'select', 'review', 'export'];

export const useAppStore = create<AppState>((set, get) => ({
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
  
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
  
  setLoading: (isLoading, message = null, progress = null) => set({ 
    isLoading, 
    loadingMessage: message, 
    loadingProgress: progress 
  }),
  
  reset: () => set(initialState),
  
  // Check if user can navigate to a specific step
  canNavigateTo: (step) => {
    const state = get();
    const targetIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(state.currentStep);
    
    // Can always go back
    if (targetIndex < currentIndex) return true;
    
    // Check requirements for forward navigation
    switch (step) {
      case 'upload':
        return true;
      case 'identify':
      case 'select':
        return state.currentFile !== null;
      case 'review':
        return state.extraction !== null;
      case 'export':
        return state.extraction !== null;
      default:
        return false;
    }
  },
  
  // Navigate to a step (with validation)
  navigateToStep: (step) => {
    const state = get();
    if (state.canNavigateTo(step)) {
      set({ currentStep: step });
    }
  },
}));
