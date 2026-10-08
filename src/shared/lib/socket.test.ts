import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from './session'
import { resetSocketForTests, onReconnect, subscribe } from './socket'

interface Message {
  event: string
  room?: unknown
  data?: unknown
}

/** A WebSocket the test drives by hand: open it, feed it, drop it. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  readyState = 0
  sent: Message[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null

  readonly url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  // --- test controls ---
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  receive(message: Message) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
  drop() {
    this.close()
  }
  sentEvents() {
    return this.sent.map((m) => `${m.event} ${m.room}`)
  }
}

const latest = () => FakeWebSocket.instances.at(-1)!
const account = { id: 'u1', username: 'u_1', displayName: 'U1', isGuest: true }

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
})

afterEach(() => {
  resetSocketForTests()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('socket', () => {
  describe('one shared connection', () => {
    it('opens on the first subscription and is reused by later ones', () => {
      subscribe('lobby:A', 'x', () => {})
      subscribe('lobby:B', 'y', () => {})
      subscribe('lobby:A', 'z', () => {})

      expect(FakeWebSocket.instances).toHaveLength(1)
    })

    it('connects to /ws on this host, carrying the session token', () => {
      useSessionStore.getState().setSession('tok-1', account)

      subscribe('lobby:A', 'x', () => {})

      const url = new URL(latest().url)
      expect(url.pathname).toBe('/ws')
      expect(url.protocol).toBe('ws:')
      expect(url.searchParams.get('token')).toBe('tok-1')
    })

    it('sends no token without a session', () => {
      subscribe('lobby:A', 'x', () => {})

      expect(new URL(latest().url).searchParams.has('token')).toBe(false)
    })

    it('closes once nothing is subscribed, and opens afresh for the next', () => {
      const stop = subscribe('lobby:A', 'x', () => {})
      latest().open()

      stop()
      expect(latest().readyState).toBe(3)

      subscribe('lobby:A', 'x', () => {})
      expect(FakeWebSocket.instances).toHaveLength(2)
    })
  })

  describe('rooms', () => {
    it('joins rooms subscribed before the connection opened, once it does', () => {
      subscribe('lobby:A', 'x', () => {})
      subscribe('lobby:B', 'x', () => {})
      expect(latest().sent).toEqual([])

      latest().open()

      // The room rides in the envelope, like every other message.
      expect(latest().sent).toEqual([
        { event: 'join_room', room: 'lobby:A' },
        { event: 'join_room', room: 'lobby:B' },
      ])
    })

    it('joins a new room straight away when already open', () => {
      subscribe('lobby:A', 'x', () => {})
      latest().open()

      subscribe('lobby:B', 'x', () => {})

      expect(latest().sentEvents()).toEqual(['join_room lobby:A', 'join_room lobby:B'])
    })

    it('joins a room once however many subscribe to it', () => {
      subscribe('lobby:A', 'x', () => {})
      latest().open()
      subscribe('lobby:A', 'y', () => {})

      expect(latest().sentEvents()).toEqual(['join_room lobby:A'])
    })

    it("leaves a room only with its last subscriber", () => {
      const stopX = subscribe('lobby:A', 'x', () => {})
      const stopY = subscribe('lobby:A', 'y', () => {})
      subscribe('lobby:B', 'z', () => {}) // keeps the connection open
      latest().open()

      stopX()
      expect(latest().sentEvents()).not.toContain('leave_room lobby:A')

      stopY()
      expect(latest().sentEvents()).toContain('leave_room lobby:A')
    })

    it('treats a second unsubscribe as a no-op', () => {
      const stop = subscribe('lobby:A', 'x', () => {})
      subscribe('lobby:A', 'y', () => {})
      latest().open()

      stop()
      stop()

      expect(latest().sentEvents()).not.toContain('leave_room lobby:A')
    })
  })

  describe('events', () => {
    it('hands each event to the handlers listening for it', () => {
      const onX = vi.fn()
      const onY = vi.fn()
      subscribe('lobby:A', 'x', onX)
      subscribe('lobby:A', 'y', onY)
      latest().open()

      latest().receive({ event: 'x', room: 'lobby:A', data: { n: 1 } })

      expect(onX).toHaveBeenCalledWith({ n: 1 })
      expect(onY).not.toHaveBeenCalled()
    })

    it('ignores messages that are not JSON events', () => {
      const handler = vi.fn()
      subscribe('lobby:A', 'x', handler)
      latest().open()

      latest().onmessage?.({ data: 'not json' })
      latest().onmessage?.({ data: JSON.stringify({ no: 'event' }) })

      expect(handler).not.toHaveBeenCalled()
    })

    it('stops delivering to a handler once it unsubscribes', () => {
      const handler = vi.fn()
      const stop = subscribe('lobby:A', 'x', handler)
      subscribe('lobby:A', 'y', () => {})
      latest().open()

      stop()
      latest().receive({ event: 'x', room: 'lobby:A' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  // Two lobbies listening for the same event must never hear each other's:
  // the socket keeps rooms apart itself rather than trusting each feature to.
  describe('room isolation', () => {
    const event = 'player_ready_changed'
    const data = { playerId: 'p1', isReady: true }

    function twoLobbies() {
      const handlerA = vi.fn()
      const handlerB = vi.fn()
      subscribe('lobby:A', event, handlerA)
      subscribe('lobby:B', event, handlerB)
      latest().open()
      return { handlerA, handlerB }
    }

    it("delivers lobby A's event to lobby A only", () => {
      const { handlerA, handlerB } = twoLobbies()

      latest().receive({ event, room: 'lobby:A', data })

      expect(handlerA).toHaveBeenCalledTimes(1)
      expect(handlerA).toHaveBeenCalledWith(data)
      expect(handlerB).not.toHaveBeenCalled()
    })

    it("delivers lobby B's event to lobby B only", () => {
      const { handlerA, handlerB } = twoLobbies()

      latest().receive({ event, room: 'lobby:B', data })

      expect(handlerB).toHaveBeenCalledTimes(1)
      expect(handlerB).toHaveBeenCalledWith(data)
      expect(handlerA).not.toHaveBeenCalled()
    })

    it('delivers an event that names no room to nobody', () => {
      const { handlerA, handlerB } = twoLobbies()

      latest().receive({ event, data })

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).not.toHaveBeenCalled()
    })

    it('does not accept a room named in the data instead of the envelope', () => {
      const { handlerA, handlerB } = twoLobbies()

      latest().receive({ event, data: { ...data, room: 'lobby:A' } })

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).not.toHaveBeenCalled()
    })

    it('delivers an event for a room nobody listens to, to nobody', () => {
      const { handlerA, handlerB } = twoLobbies()

      latest().receive({ event, room: 'lobby:C', data })
      latest().receive({ event, room: 42, data })

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).not.toHaveBeenCalled()
    })

    it('keeps delivering to the other lobby after one is left', () => {
      const handlerA = vi.fn()
      const handlerB = vi.fn()
      const leaveA = subscribe('lobby:A', event, handlerA)
      subscribe('lobby:B', event, handlerB)
      latest().open()

      leaveA()
      // The server may not have processed our leave yet.
      latest().receive({ event, room: 'lobby:A', data })
      latest().receive({ event, room: 'lobby:B', data })

      expect(handlerA).not.toHaveBeenCalled()
      expect(handlerB).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the connection drops', () => {
    it('reconnects after a second, rejoins its rooms and tells listeners', () => {
      vi.useFakeTimers()
      const reconnected = vi.fn()
      onReconnect(reconnected)
      subscribe('lobby:A', 'x', () => {})
      latest().open()

      latest().drop()
      vi.advanceTimersByTime(999)
      expect(FakeWebSocket.instances).toHaveLength(1)
      vi.advanceTimersByTime(1)
      expect(FakeWebSocket.instances).toHaveLength(2)

      latest().open()
      expect(latest().sentEvents()).toEqual(['join_room lobby:A'])
      expect(reconnected).toHaveBeenCalledTimes(1)
    })

    it('backs off further each time it fails, up to 30 seconds', () => {
      vi.useFakeTimers()
      subscribe('lobby:A', 'x', () => {})
      latest().open()
      latest().drop()

      // Failures without ever opening: 1s, 2s, 4s, 8s, 16s, then capped at 30s.
      for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]) {
        const before = FakeWebSocket.instances.length
        vi.advanceTimersByTime(delay - 1)
        expect(FakeWebSocket.instances).toHaveLength(before)
        vi.advanceTimersByTime(1)
        expect(FakeWebSocket.instances).toHaveLength(before + 1)
        latest().drop()
      }
    })

    it('does not count the first open as a reconnect', () => {
      const reconnected = vi.fn()
      onReconnect(reconnected)
      subscribe('lobby:A', 'x', () => {})

      latest().open()

      expect(reconnected).not.toHaveBeenCalled()
    })

    it('stays closed if nothing is subscribed any more', () => {
      vi.useFakeTimers()
      const stop = subscribe('lobby:A', 'x', () => {})
      latest().open()

      stop()
      vi.advanceTimersByTime(60_000)

      expect(FakeWebSocket.instances).toHaveLength(1)
    })
  })

  it('reconnects with the new token when the session changes', () => {
    useSessionStore.getState().setSession('tok-1', account)
    subscribe('lobby:A', 'x', () => {})
    latest().open()

    useSessionStore.getState().setSession('tok-2', account)

    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[0].readyState).toBe(3)
    expect(new URL(latest().url).searchParams.get('token')).toBe('tok-2')
  })
})
