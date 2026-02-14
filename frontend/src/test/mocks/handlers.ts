import { http, HttpResponse } from 'msw'

const API_URL = '/api'

// Mock data matching frontend types
const mockIdentification = {
  identification_id: 'ident-1',
  file_id: 'file-123',
  page: 1,
  image_dimensions: { width: 800, height: 1000 },
  detected_items: [
    {
      item_id: 'item-1',
      type: 'bar_chart',
      title: 'Revenue Chart',
      description: 'A revenue bar chart',
      data_preview: '[]',
      bbox: { x: 100, y: 100, width: 300, height: 200 },
      confidence: 0.95,
      warnings: [],
    },
    {
      item_id: 'item-2',
      type: 'table',
      title: 'Sales Table',
      description: 'Sales data',
      data_preview: '[]',
      bbox: { x: 100, y: 350, width: 300, height: 150 },
      confidence: 0.88,
      warnings: [],
    },
  ],
  status: 'completed',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  duration_ms: 2500,
}

const mockExtractRunResponse = {
  job_id: 'job-123',
  identification_id: 'ident-1',
  status: 'completed',
  datasets: [
    {
      dataset_id: 'ds-1',
      source_item_id: 'item-1',
      title: 'Revenue Chart',
      type: 'table',
      columns: ['Month', 'Revenue'],
      rows: [
        { Month: 'Jan', Revenue: '10000' },
        { Month: 'Feb', Revenue: '12000' },
      ],
      metadata: {},
    },
  ],
  duration_ms: 3200,
  created_at: new Date().toISOString(),
}

export const handlers = [
  // Health check
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok', version: '1.0.0' })
  }),

  // POST /api/files - upload
  http.post(`${API_URL}/files`, async ({ request }) => {
    // Accept FormData; return file metadata
    await request.arrayBuffer().catch(() => {})
    return HttpResponse.json({
      id: 'file-123',
      filename: 'test-file.pdf',
      mime_type: 'application/pdf',
      size_bytes: 102400,
      pages: 3,
      created_at: new Date().toISOString(),
    })
  }),

  // GET /api/files/:fileId
  http.get(`${API_URL}/files/:fileId`, ({ params }) => {
    return HttpResponse.json({
      id: params.fileId,
      filename: 'test-file.pdf',
      mime_type: 'application/pdf',
      size_bytes: 102400,
      pages: 3,
      created_at: new Date().toISOString(),
    })
  }),

  // Identification endpoint
  http.post(`${API_URL}/extract/identify`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return HttpResponse.json(mockIdentification)
  }),

  // GET identification
  http.get(`${API_URL}/extract/identify/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockIdentification, identification_id: params.id })
  }),

  // Run extraction
  http.post(`${API_URL}/extract/run`, async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const items = body.items || []
    if (!items.length) {
      return new HttpResponse(JSON.stringify({ detail: 'No items selected' }), { status: 400 })
    }

    // Return a simplified extraction response
    return HttpResponse.json(mockExtractRunResponse)
  }),

  // Update dataset
  http.put(`${API_URL}/datasets/:datasetId`, async ({ params }) => {
    return HttpResponse.json({ success: true, datasetId: params.datasetId })
  }),

  // Export dataset as blob
  http.get(`${API_URL}/export/:datasetId`, async ({ params, url }) => {
    const csv = 'Month,Revenue\nJan,10000\nFeb,12000'
    return new HttpResponse(csv, { headers: { 'Content-Type': 'text/csv' } })
  }),

  // File preview for PDFs
  http.get(`${API_URL}/files/:fileId/pages/:page/preview`, () => {
    return HttpResponse.json({ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' })
  }),
]
