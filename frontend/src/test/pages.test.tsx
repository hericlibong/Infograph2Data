import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from '@/store/useAppStore'
import { UploadPage } from '@/pages/UploadPage'
import { IdentifyPage } from '@/pages/IdentifyPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { ExportPage } from '@/pages/ExportPage'
import { vi } from 'vitest'

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  useAppStore.getState().reset()
  sessionStorage.clear()
})

describe('Page integration tests', () => {
  it('UploadPage uploads file via file input and sets currentFile', async () => {
    const { container } = renderWithQuery(<UploadPage />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })

    // Simulate selecting a file
    fireEvent.change(input, { target: { files: [file] } } as any)

    await waitFor(() => {
      const f = useAppStore.getState().currentFile
      expect(f).toBeTruthy()
      expect(f?.id).toBe('file-123')
    })
  })

  it('UploadPage uploads file via drag-and-drop', async () => {
    const { getByText } = renderWithQuery(<UploadPage />)
    const dropHint = getByText(/Drag and drop a file here/)
    const file = new File(['dummy'], 'drag.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropHint, { dataTransfer: { files: [file] } } as any)

    await waitFor(() => expect(useAppStore.getState().currentFile?.id).toBe('file-123'))
  })

  it('IdentifyPage shows no-file state when no file selected', () => {
    const { getByText } = renderWithQuery(<IdentifyPage />)
    expect(getByText(/No file selected/)).toBeTruthy()
    const btn = getByText(/Go to Upload/)
    fireEvent.click(btn)
    expect(useAppStore.getState().currentStep).toBe('upload')
  })

  it('IdentifyPage Identify Elements populates identification', async () => {
    // Prepare store with a file
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf', mime_type: 'application/pdf', size_bytes: 102400, pages: 1, created_at: new Date().toISOString() } as any)

    const { getByText } = renderWithQuery(<IdentifyPage />)
    const identifyBtn = getByText('Identify Elements')
    fireEvent.click(identifyBtn)

    await waitFor(() => expect(useAppStore.getState().identification).toBeTruthy())
  })

  it('IdentifyPage Re-analyze respects confirmation (cancel)', async () => {
    // Setup: file + existing identification
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setIdentification({ identification_id: 'old', file_id: 'file-123', page: 1, image_dimensions: { width: 1, height: 1 }, detected_items: [], status: 'completed', expires_at: new Date(Date.now()+3600000).toISOString(), created_at: new Date().toISOString(), duration_ms: 10 } as any)

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const { getByText } = renderWithQuery(<IdentifyPage />)
    const reanalyzeBtn = getByText(/Re-analyze/)
    fireEvent.click(reanalyzeBtn)

    // Should remain unchanged
    expect(useAppStore.getState().identification?.identification_id).toBe('old')
    confirmSpy.mockRestore()
  })

  it('IdentifyPage Re-analyze proceeds when confirmed', async () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setIdentification({ identification_id: 'old', file_id: 'file-123', page: 1, image_dimensions: { width: 1, height: 1 }, detected_items: [], status: 'completed', expires_at: new Date(Date.now()+3600000).toISOString(), created_at: new Date().toISOString(), duration_ms: 10 } as any)

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const { getByText } = renderWithQuery(<IdentifyPage />)
    fireEvent.click(getByText(/Re-analyze/))

    await waitFor(() => expect(useAppStore.getState().identification?.identification_id).toBe('ident-1'))
    confirmSpy.mockRestore()
  })

  it('IdentifyPage Extract All triggers extraction and navigates to review', async () => {
    // Use identify flow to populate identification
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf', mime_type: 'application/pdf', size_bytes: 102400, pages: 1, created_at: new Date().toISOString() } as any)

    const { getByText } = renderWithQuery(<IdentifyPage />)
    fireEvent.click(getByText('Identify Elements'))

    await waitFor(() => expect(useAppStore.getState().identification).toBeTruthy())

    // Extract All
    fireEvent.click(getByText('Extract All'))

    await waitFor(() => expect(useAppStore.getState().extraction).toBeTruthy())
    expect(useAppStore.getState().currentStep).toBe('review')
  })

  it('ReviewPage shows EmptyState when no extraction', () => {
    const { getByText } = renderWithQuery(<ReviewPage />)
    expect(getByText(/No Extraction Data/)).toBeTruthy()
    fireEvent.click(getByText(/Go to Identify/))
    expect(useAppStore.getState().currentStep).toBe('identify')
  })

  it('ReviewPage Export button navigates to Export', () => {
    // Prepare extraction
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const { getByText } = renderWithQuery(<ReviewPage />)
    fireEvent.click(getByText(/Export/))
    expect(useAppStore.getState().currentStep).toBe('export')
  })

  it('ReviewPage SourceFilter toggles store value', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' }, { Month: 'Feb', Revenue: '12000', source: 'estimated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const { getByText } = renderWithQuery(<ReviewPage />)
    fireEvent.click(getByText(/Annotated Only/))
    expect(useAppStore.getState().sourceFilter).toBe('annotated')
  })

  it('ExportPage shows EmptyState without extraction and Start New triggers reset', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const { getByText } = renderWithQuery(<ExportPage />)
    expect(getByText(/No Data to Export/)).toBeTruthy()
    fireEvent.click(getByText(/Start New Extraction/))
    // After reset, no currentFile
    expect(useAppStore.getState().currentFile).toBeNull()
    confirmSpy.mockRestore()
  })

  it('ExportPage Download triggers createObjectURL', async () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const createSpy = vi.spyOn(URL, 'createObjectURL')
    const { getByText } = renderWithQuery(<ExportPage />)

    // Click download
    fireEvent.click(getByText(/Download ZIP/))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    createSpy.mockRestore()
  })

  it('ExportPage shows error when no format selected', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const { getByLabelText, getByText } = renderWithQuery(<ExportPage />)
    // Uncheck CSV and JSON
    const csv = getByLabelText('CSV') as HTMLInputElement
    const json = getByLabelText('JSON') as HTMLInputElement
    fireEvent.click(csv)
    fireEvent.click(json)

    const downloadBtn = getByText(/Download ZIP/).closest('button') as HTMLButtonElement
    expect(downloadBtn).toBeDisabled()
    expect(getByText(/Select at least one format to export/)).toBeTruthy()
  })
})
