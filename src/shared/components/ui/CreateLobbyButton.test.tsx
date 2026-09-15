import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CreateLobbyButton from './CreateLobbyButton'

function getButton() {
  return screen.getByTestId('create-lobby-button') as HTMLButtonElement
}

describe('CreateLobbyButton', () => {
  it('renders the label and stays enabled', () => {
    render(<CreateLobbyButton />)

    expect(getButton().textContent).toBe('CREATE')
    expect(getButton().disabled).toBe(false)
  })

  it('calls onCreateLobby when clicked', () => {
    const onCreateLobby = vi.fn()
    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)

    fireEvent.click(getButton())

    expect(onCreateLobby).toHaveBeenCalledTimes(1)
  })

  // The button navigates away instead of showing a loading state, so it must
  // not disable itself or swap its label while the handler runs.
  it('keeps its label and stays clickable after a click', () => {
    const onCreateLobby = vi.fn()
    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)

    fireEvent.click(getButton())
    fireEvent.click(getButton())

    expect(getButton().textContent).toBe('CREATE')
    expect(getButton().disabled).toBe(false)
    expect(onCreateLobby).toHaveBeenCalledTimes(2)
  })

  it('swallows a rejected handler instead of leaking an unhandled rejection', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateLobby = vi.fn(() => Promise.reject(new Error('network down')))

    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)
    fireEvent.click(getButton())
    await Promise.resolve()

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
