import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCopyInviteLink } from './useCopyInviteLink'

const INVITE_LINK = 'https://app.com/lobby/AB12CD'

function stubClipboard(writeText: () => Promise<void>) {
  Object.assign(navigator, { clipboard: { writeText: vi.fn(writeText) } })
}

beforeEach(() => {
  stubClipboard(() => Promise.resolve())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCopyInviteLink', () => {
  it('starts out not copied', () => {
    const { result } = renderHook(() => useCopyInviteLink(INVITE_LINK))

    expect(result.current.copied).toBe(false)
  })

  it('writes the invite link to the clipboard', async () => {
    const { result } = renderHook(() => useCopyInviteLink(INVITE_LINK))

    await act(async () => {
      await result.current.copyInviteLink()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(INVITE_LINK)
  })

  it('flags copied after a successful write', async () => {
    const { result } = renderHook(() => useCopyInviteLink(INVITE_LINK))

    await act(async () => {
      await result.current.copyInviteLink()
    })

    expect(result.current.copied).toBe(true)
  })

  it('clears the copied flag again after 1.5s', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCopyInviteLink(INVITE_LINK))

    await act(async () => {
      await result.current.copyInviteLink()
    })
    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.copied).toBe(false)
  })

  // The Clipboard API is unavailable in some browsers/contexts (insecure
  // origins, permissions) - a rejection must not throw or flag success.
  it('swallows a clipboard failure and stays not copied', async () => {
    stubClipboard(() => Promise.reject(new Error('clipboard blocked')))
    const { result } = renderHook(() => useCopyInviteLink(INVITE_LINK))

    await act(async () => {
      await result.current.copyInviteLink()
    })

    expect(result.current.copied).toBe(false)
  })
})
