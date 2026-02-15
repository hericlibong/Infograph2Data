import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { EmptyState } from '@/components/EmptyState'
import { StepIndicator } from '@/components/StepIndicator'
import { MainLayout } from '@/components/MainLayout'
import { Header } from '@/components/Header'
import { useAppStore } from '@/store/useAppStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

beforeEach(() => {
  useAppStore.getState().reset()
  sessionStorage.clear()
})

describe('Additional component tests', () => {
  it('EmptyState shows hint when provided', () => {
    const { getByText } = render(
      <EmptyState title="No items" description="none" hint="Try uploading a PDF" />
    )
    expect(getByText(/Try uploading a PDF/)).toBeTruthy()
  })

  it('LoadingOverlay shows rounded percentage', () => {
    useAppStore.getState().setLoading(true, 'Working', 73.6)
    const { getByText } = render(<LoadingOverlay />)
    expect(getByText('74%')).toBeTruthy()
    act(() => useAppStore.getState().setLoading(false))
  })

  it('StepIndicator cancels navigation on unsaved changes when confirm is false', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-1', filename: 'f' } as any)
    useAppStore.getState().setCurrentStep('review')
    useAppStore.getState().setHasUnsavedChanges(true)

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const { getByTitle } = render(<StepIndicator />)
    const btn = getByTitle('Go back to Identify')
    fireEvent.click(btn)
    expect(useAppStore.getState().currentStep).toBe('review')
    confirmSpy.mockRestore()
  })

  it('StepIndicator allows navigation on unsaved changes when confirm is true', () => {
    useAppStore.getState().setCurrentFile({ id: 'file-1' } as any)
    useAppStore.getState().setCurrentStep('review')
    useAppStore.getState().setHasUnsavedChanges(true)

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const { getByTitle } = render(<StepIndicator />)
    fireEvent.click(getByTitle('Go back to Identify'))
    expect(useAppStore.getState().currentStep).toBe('identify')
    confirmSpy.mockRestore()
  })

  it('MainLayout renders children and footer', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { getByText } = render(
      <QueryClientProvider client={qc}>
        <MainLayout>
          <div>ChildContent</div>
        </MainLayout>
      </QueryClientProvider>
    )
    expect(getByText('ChildContent')).toBeTruthy()
    expect(getByText('Infograph2Data — Hackathon Project')).toBeTruthy()
  })

  it('Header displays API status from health endpoint', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { findByText } = render(
      <QueryClientProvider client={qc}>
        <Header />
      </QueryClientProvider>
    )

    const status = await findByText('ok')
    expect(status).toBeTruthy()
  })
})
