import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from './mocks/server'
import { http, HttpResponse } from 'msw'
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

describe('Additional page tests', () => {
  it('UploadPage shows error on upload failure', async () => {
    // Override handler to simulate server error
    server.use(
      http.post('/api/files', () => {
        return new HttpResponse(JSON.stringify({ detail: 'Server error' }), { status: 500 })
      })
    )

    const { container } = renderWithQuery(<UploadPage />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'fail.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [file] } } as any)

    await waitFor(() => expect(container.textContent).toMatch(/Upload failed/))
  })

  it('IdentifyPage renders image preview', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf', mime_type: 'application/pdf', pages: 1, size_bytes: 1024, created_at: new Date().toISOString() } as any)
    const { getByAltText } = renderWithQuery(<IdentifyPage />)
    const img = getByAltText('Preview') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src') || '').toContain('/api/files/file-123/pages/1/preview')
  })

  it('IdentifyPage element selection toggles selectedElements in store', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    const identification = {
      identification_id: 'ident-1',
      file_id: 'file-123',
      page: 1,
      image_dimensions: { width: 1, height: 1 },
      detected_items: [
        { item_id: 'item-1', type: 'bar_chart', title: 'Revenue Chart', description: 'A revenue bar chart', data_preview: '[]', bbox: { x: 0, y: 0, width: 10, height: 10 }, confidence: 0.95, warnings: [] }
      ],
      status: 'completed',
      expires_at: new Date(Date.now()+3600000).toISOString(),
      created_at: new Date().toISOString(),
      duration_ms: 10,
    } as any

    useAppStore.getState().setIdentification(identification)
    const { getByText } = renderWithQuery(<IdentifyPage />)
    // Initially all detected items are selected by setIdentification
    expect(useAppStore.getState().options.selectedElements).toContain('item-1')
    // Toggle selection off then on
    fireEvent.click(getByText(/A revenue bar chart/))
    expect(useAppStore.getState().options.selectedElements).not.toContain('item-1')
    fireEvent.click(getByText(/A revenue bar chart/))
    expect(useAppStore.getState().options.selectedElements).toContain('item-1')
  })

  it('ReviewPage renders extracted datasets', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const { getAllByText, getByText } = renderWithQuery(<ReviewPage />)
    expect(getAllByText(/Revenue/).length).toBeGreaterThanOrEqual(1)
    expect(getByText(/Jan/)).toBeTruthy()
  })

  it('ReviewPage cell edit updates displayed value', async () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const { getByText, getByDisplayValue } = renderWithQuery(<ReviewPage />)
    const cell = getByText('Jan')
    fireEvent.click(cell)

    const input = getByDisplayValue('Jan') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Jan-Edited' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => expect(getByText('Jan-Edited')).toBeTruthy())
  }, 5000)

  it('ExportPage shows success message after export', async () => {
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test-file.pdf' } as any)
    useAppStore.getState().setExtraction({ job_id: 'job-123', identification_id: 'ident-1', status: 'completed', datasets: [ { dataset_id: 'ds-1', title: 'Revenue', columns: ['Month','Revenue'], rows: [ { Month: 'Jan', Revenue: '10000', source: 'annotated' } ], type: 'table', metadata: {} } ], duration_ms: 1000, created_at: new Date().toISOString() } as any)

    const createSpy = vi.spyOn(URL, 'createObjectURL')
    const { getByText, findByText } = renderWithQuery(<ExportPage />)

    fireEvent.click(getByText(/Download ZIP/))

    await findByText(/Export successful!/)
    createSpy.mockRestore()
  })
})
