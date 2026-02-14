import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/useAppStore'
import type { IdentificationResponse, ExtractRunResponse } from '@/types'

// Mock data
const mockFileMetadata = {
  id: 'file-123',
  original_name: 'test.pdf',
  stored_name: 'stored-test.pdf',
  mime_type: 'application/pdf',
  size_bytes: 102400,
  page_count: 3,
  uploaded_at: '2026-02-14T10:00:00Z',
}

const mockIdentification: IdentificationResponse = {
  file_id: 'file-123',
  page_number: 1,
  detected_items: [
    {
      item_id: 'item-1',
      item_type: 'bar_chart',
      label: 'Revenue Chart',
      confidence: 0.95,
      bounding_box: { x: 100, y: 100, width: 300, height: 200 },
    },
    {
      item_id: 'item-2',
      item_type: 'table',
      label: 'Sales Table',
      confidence: 0.88,
      bounding_box: { x: 100, y: 350, width: 300, height: 150 },
    },
  ],
  processing_time_ms: 2500,
}

const mockExtraction: ExtractRunResponse = {
  file_id: 'file-123',
  page_number: 1,
  granularity: 'full_with_source',
  extracted_data: [
    {
      item_id: 'item-1',
      item_type: 'bar_chart',
      label: 'Revenue Chart',
      data: {
        headers: ['Month', 'Revenue'],
        rows: [
          { cells: [{ value: 'Jan', source: 'annotated' }, { value: '10000', source: 'estimated' }] },
          { cells: [{ value: 'Feb', source: 'annotated' }, { value: '12000', source: 'estimated' }] },
        ],
      },
    },
  ],
  processing_time_ms: 3200,
}

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAppStore.getState().reset()
    // Clear sessionStorage
    sessionStorage.clear()
  })

  // STORE-001
  it('should have correct initial state', () => {
    const state = useAppStore.getState()
    
    expect(state.currentStep).toBe('upload')
    expect(state.currentFile).toBeNull()
    expect(state.currentFileId).toBeNull()
    expect(state.currentPage).toBe(1)
    expect(state.options.granularity).toBe('full_with_source')
    expect(state.options.selectedElements).toEqual([])
    expect(state.identification).toBeNull()
    expect(state.extraction).toBeNull()
    expect(state.hasUnsavedChanges).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  // STORE-002
  it('should set current file and navigate to identify step', () => {
    useAppStore.getState().setCurrentFile(mockFileMetadata)
    
    const state = useAppStore.getState()
    expect(state.currentFile).toEqual(mockFileMetadata)
    expect(state.currentFileId).toBe('file-123')
    expect(state.currentStep).toBe('identify')
    expect(state.currentPage).toBe(1)
  })

  // STORE-003
  it('should reset identification when changing page', () => {
    // Setup: set file and identification
    useAppStore.getState().setCurrentFile(mockFileMetadata)
    useAppStore.getState().setIdentification(mockIdentification)
    
    expect(useAppStore.getState().identification).not.toBeNull()
    
    // Change page
    useAppStore.getState().setCurrentPage(2)
    
    const state = useAppStore.getState()
    expect(state.currentPage).toBe(2)
    expect(state.identification).toBeNull()
    expect(state.options.selectedElements).toEqual([])
  })

  // STORE-004
  it('should toggle element selection', () => {
    useAppStore.getState().setSelectedElements(['item-1'])
    expect(useAppStore.getState().options.selectedElements).toEqual(['item-1'])
    
    // Add element
    useAppStore.getState().toggleElement('item-2')
    expect(useAppStore.getState().options.selectedElements).toEqual(['item-1', 'item-2'])
    
    // Remove element
    useAppStore.getState().toggleElement('item-1')
    expect(useAppStore.getState().options.selectedElements).toEqual(['item-2'])
  })

  // STORE-005
  it('should set identification and auto-select all elements', () => {
    useAppStore.getState().setIdentification(mockIdentification)
    
    const state = useAppStore.getState()
    expect(state.identification).toEqual(mockIdentification)
    expect(state.currentStep).toBe('select')
    expect(state.options.selectedElements).toEqual(['item-1', 'item-2'])
  })

  // STORE-006
  it('should set extraction and navigate to review step', () => {
    useAppStore.getState().setExtraction(mockExtraction)
    
    const state = useAppStore.getState()
    expect(state.extraction).toEqual(mockExtraction)
    expect(state.currentStep).toBe('review')
    expect(state.sourceFilter).toBe('all')
  })

  // STORE-007
  it('should reset to initial state', () => {
    // Setup: populate state
    useAppStore.getState().setCurrentFile(mockFileMetadata)
    useAppStore.getState().setIdentification(mockIdentification)
    useAppStore.getState().setExtraction(mockExtraction)
    useAppStore.getState().setHasUnsavedChanges(true)
    
    // Reset
    useAppStore.getState().reset()
    
    const state = useAppStore.getState()
    expect(state.currentStep).toBe('upload')
    expect(state.currentFile).toBeNull()
    expect(state.identification).toBeNull()
    expect(state.extraction).toBeNull()
    expect(state.hasUnsavedChanges).toBe(false)
  })

  // STORE-008
  it('should correctly validate navigation with canNavigateTo', () => {
    const { canNavigateTo, setCurrentFile, setExtraction } = useAppStore.getState()
    
    // Initial state: only upload accessible
    expect(canNavigateTo('upload')).toBe(true)
    expect(canNavigateTo('identify')).toBe(false)
    expect(canNavigateTo('review')).toBe(false)
    
    // After file upload: identify accessible
    setCurrentFile(mockFileMetadata)
    expect(useAppStore.getState().canNavigateTo('identify')).toBe(true)
    expect(useAppStore.getState().canNavigateTo('review')).toBe(false)
    
    // After extraction: review accessible
    setExtraction(mockExtraction)
    expect(useAppStore.getState().canNavigateTo('review')).toBe(true)
    expect(useAppStore.getState().canNavigateTo('export')).toBe(true)
  })

  // STORE-009
  it('should set loading state with message and progress', () => {
    useAppStore.getState().setLoading(true, 'Processing...', 50)
    
    const state = useAppStore.getState()
    expect(state.isLoading).toBe(true)
    expect(state.loadingMessage).toBe('Processing...')
    expect(state.loadingProgress).toBe(50)
  })

  it('should clear loading state', () => {
    useAppStore.getState().setLoading(true, 'Loading')
    useAppStore.getState().setLoading(false)
    
    const state = useAppStore.getState()
    expect(state.isLoading).toBe(false)
    // Values become null when cleared (from implementation)
    expect(state.loadingMessage).toBeFalsy()
    expect(state.loadingProgress).toBeFalsy()
  })

  // STORE-010
  it('should persist state to sessionStorage', () => {
    // Set some state
    useAppStore.getState().setCurrentFile(mockFileMetadata)
    useAppStore.getState().setIdentification(mockIdentification)
    
    // Check sessionStorage
    const stored = sessionStorage.getItem('infograph2data-session')
    expect(stored).not.toBeNull()
    
    const parsed = JSON.parse(stored!)
    expect(parsed.state.currentFileId).toBe('file-123')
    expect(parsed.state.currentStep).toBe('select')
    
    // Loading state should NOT be persisted
    useAppStore.getState().setLoading(true, 'Loading')
    const stored2 = JSON.parse(sessionStorage.getItem('infograph2data-session')!)
    expect(stored2.state.isLoading).toBeUndefined()
  })
})
