import { describe, it, expect } from 'vitest'
import { uploadFile, runExtraction, updateDataset, exportDataset, getFilePreviewUrl } from '@/api/client'

// Simple API integration tests using MSW handlers defined in test setup

describe('API client', () => {
  it('uploadFile sends form and receives metadata', async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const metadata = await uploadFile(file)

    expect(metadata).toHaveProperty('id')
    expect(metadata.filename).toBe('test-file.pdf')
    expect(metadata.mime_type).toBe('application/pdf')
  })

  it('runExtraction returns datasets when items provided', async () => {
    const result = await runExtraction('ident-1', { granularity: 'full_with_source', selectedItems: ['item-1'], output_language: 'en' })
    expect(result).toHaveProperty('job_id')
    expect(Array.isArray(result.datasets)).toBe(true)
    expect(result.datasets.length).toBeGreaterThan(0)
  })

  it('updateDataset resolves without error', async () => {
    await expect(updateDataset('ds-1', { columns: ['Month', 'Revenue'] })).resolves.toBeUndefined()
  })

  it('exportDataset returns a blob-like response', async () => {
    const blob = await exportDataset('ds-1', ['csv'], 'all')
    expect(blob).toBeTruthy()
  })

  it('getFilePreviewUrl constructs correct urls', () => {
    const p1 = getFilePreviewUrl('file-123', 2, true)
    expect(p1).toBe('/api/files/file-123/pages/2/preview?scale=2')

    const p2 = getFilePreviewUrl('file-123', 1, false)
    expect(p2).toBe('/api/files/file-123/content')
  })
})
