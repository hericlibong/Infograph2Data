import React, { useState } from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import EditableCell from '@/components/EditableCell'
import { vi } from 'vitest'

describe('EditableCell component', () => {
  it('renders value and enters edit mode on click', () => {
    const { getByText, getByDisplayValue } = render(<EditableCell value={'Hello'} onChange={() => {}} />)
    const el = getByText('Hello')
    expect(el).toBeTruthy()

    fireEvent.click(el)
    expect(getByDisplayValue('Hello')).toBeTruthy()
  })

  it('saves on Enter and cancels on Escape', async () => {
    function Wrapper() {
      const [val, setVal] = useState('Jan')
      return <EditableCell value={val} onChange={(v) => setVal(v)} />
    }

    const { getByText, getByDisplayValue } = render(<Wrapper />)
    const cell = getByText('Jan')
    fireEvent.click(cell)

    const input = getByDisplayValue('Jan') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Jan-Edited' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => expect(getByText('Jan-Edited')).toBeTruthy())

    // Cancel path
    fireEvent.click(getByText('Jan-Edited'))
    const input2 = getByDisplayValue('Jan-Edited') as HTMLInputElement
    fireEvent.change(input2, { target: { value: 'ShouldNotSave' } })
    fireEvent.keyDown(input2, { key: 'Escape', code: 'Escape' })

    await waitFor(() => expect(getByText('Jan-Edited')).toBeTruthy())
  })

  it('applies source-based title attribute', () => {
    const { getByTitle } = render(<EditableCell value={'Val'} onChange={() => {}} source={'annotated'} />)
    expect(getByTitle('Source: annotated')).toBeTruthy()
  })
})
