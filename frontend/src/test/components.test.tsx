import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { EmptyState } from '@/components/EmptyState'
import { StepIndicator } from '@/components/StepIndicator'
import { useAppStore } from '@/store/useAppStore'

// Helper to render with store modifications
function renderWithStore(ui: React.ReactElement, modify?: (store: any) => void) {
  if (modify) modify(useAppStore.getState())
  return render(ui)
}

describe('Components', () => {
  it('LoadingOverlay renders when loading', () => {
    const restore = useAppStore.getState().setLoading
    useAppStore.getState().setLoading(true, 'Processing', 45)

    const { getByText } = render(<LoadingOverlay />)
    expect(getByText('Processing')).toBeTruthy()
    expect(getByText('Please wait, this may take a moment...')).toBeTruthy()

    // cleanup
    restore(false)
  })

  it('EmptyState renders title, description and action', () => {
    const action = vi.fn()
    const { getByText } = render(
      <EmptyState
        title="No files"
        description="Please upload a file to continue"
        action={{ label: 'Upload', onClick: action }}
      />
    )

    expect(getByText('No files')).toBeTruthy()
    expect(getByText('Please upload a file to continue')).toBeTruthy()
    expect(getByText('Upload')).toBeTruthy()

    // Trigger action
    fireEvent.click(getByText('Upload'))
    expect(action).toHaveBeenCalled()
  })

  it('StepIndicator displays steps and allows back navigation when completed', () => {
    // Set state to 'review' so previous steps are completed
    useAppStore.getState().setCurrentFile({ id: 'file-123', filename: 'test.pdf' } as any)
    useAppStore.getState().setCurrentStep('review')

    const { getByText, getByTitle } = render(<StepIndicator />)
    // Step labels are hidden on small screens, but numbers/check icons are present
    expect(getByTitle('Go back to Identify')).toBeTruthy()

    // Simulate clicking back to identify
    const btn = getByTitle('Go back to Identify') as HTMLButtonElement
    fireEvent.click(btn)

    expect(useAppStore.getState().currentStep).toBe('identify')
  })
})
