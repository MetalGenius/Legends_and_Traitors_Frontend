import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import JoinLobbyInput from './JoinLobbyInput'

const button = () => screen.getByTestId('join-lobby-submit') as HTMLButtonElement
const input = () => screen.getByTestId('join-lobby-input') as HTMLInputElement

describe('JoinLobbyInput', () => {
  // The button is never truly `disabled` (that would block :hover and the
  // pointer cursor), so the guard in handleSubmit is what stops a short code.
  it('ignores clicks while the code is incomplete', () => {
    const onSubmit = vi.fn()
    render(<JoinLobbyInput onSubmit={onSubmit} />)

    fireEvent.change(input(), { target: { value: 'ABC' } })
    fireEvent.click(button())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(button().getAttribute('aria-disabled')).toBe('true')
    expect(button().disabled).toBe(false)
  })

  it('submits a complete code', () => {
    const onSubmit = vi.fn()
    render(<JoinLobbyInput onSubmit={onSubmit} />)

    fireEvent.change(input(), { target: { value: 'abc123' } })
    fireEvent.click(button())

    expect(onSubmit).toHaveBeenCalledWith('ABC123')
    expect(button().getAttribute('aria-disabled')).toBe('false')
  })

})
