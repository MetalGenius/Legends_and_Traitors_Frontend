import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CreateLobbyButton from './CreateLobbyButton'

/** A promise whose resolution this test controls, to hold the click mid-flight. */
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function getButton() {
  return screen.getByTestId('create-lobby-button') as HTMLButtonElement
}

describe('CreateLobbyButton', () => {
  it('swaps to the loading label and disables itself while the request is in flight', async () => {
    const { promise, resolve } = deferred()
    const onCreateLobby = vi.fn(() => promise)

    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)

    expect(getButton().disabled).toBe(false)
    expect(getButton().textContent).toBe('CREATE')

    fireEvent.click(getButton())

    await waitFor(() => expect(getButton().disabled).toBe(true))
    expect(getButton().textContent).toBe('CREATING...')
    expect(getButton().getAttribute('aria-busy')).toBe('true')

    resolve()

    await waitFor(() => expect(getButton().disabled).toBe(false))
    expect(getButton().textContent).toBe('CREATE')
    expect(getButton().getAttribute('aria-busy')).toBe('false')
  })

  it('does not fire a second request while one is already in flight', async () => {
    const { promise, resolve } = deferred()
    const onCreateLobby = vi.fn(() => promise)

    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)

    fireEvent.click(getButton())
    await waitFor(() => expect(getButton().disabled).toBe(true))
    fireEvent.click(getButton())

    expect(onCreateLobby).toHaveBeenCalledTimes(1)

    resolve()
    await waitFor(() => expect(getButton().disabled).toBe(false))
  })

  it('re-enables even if the request rejects', async () => {
    const onCreateLobby = vi.fn(() => Promise.reject(new Error('network down')))

    render(<CreateLobbyButton onCreateLobby={onCreateLobby} />)
    fireEvent.click(getButton())

    await waitFor(() => expect(getButton().disabled).toBe(false))
    expect(getButton().textContent).toBe('CREATE')
  })
})
