import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function Setup({ shortcuts, enabled = true }: { shortcuts: any[]; enabled?: boolean }) {
  useKeyboardShortcuts(shortcuts, { enabled })
  return <div />
}

describe('useKeyboardShortcuts', () => {
  it('fires action on key press', () => {
    const action = vi.fn()
    render(<Setup shortcuts={[{ key: 'a', action, description: 'test' }]} />)

    const event = new KeyboardEvent('keydown', { key: 'a' })
    window.dispatchEvent(event)

    expect(action).toHaveBeenCalled()
  })

  it('ignores events when focus is in input except Escape', () => {
    const actionA = vi.fn()
    const actionEscape = vi.fn()

    const { getByTestId } = render(
      <>
        <input data-testid="input" />
        <Setup
          shortcuts={[
            { key: 'a', action: actionA, description: 'a' },
            { key: 'Escape', action: actionEscape, description: 'esc' },
          ]}
        />
      </>
    )

    const input = getByTestId('input') as HTMLInputElement
    input.focus()

    // Dispatch on the focused input element so the hook sees the input target
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(actionA).not.toHaveBeenCalled()

    // Escape should still be handled when typing in an input
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(actionEscape).toHaveBeenCalled()
  })

  it('handles ctrl modifier', () => {
    const action = vi.fn()
    render(<Setup shortcuts={[{ key: 's', ctrl: true, action, description: 'save' }]} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    expect(action).toHaveBeenCalled()
  })

  it('disabled option prevents shortcuts', () => {
    const action = vi.fn()
    render(<Setup shortcuts={[{ key: 'a', action, description: 'test' }]} enabled={false} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(action).not.toHaveBeenCalled()
  })
})
