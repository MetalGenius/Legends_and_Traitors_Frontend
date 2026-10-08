import { useSessionStore } from './session'

/**
 * The app's single real-time connection, shared by every feature. Features
 * never open their own socket - they `subscribe` to a room and an event, and
 * this module opens the connection for the first subscriber, reuses it for
 * the rest, and closes it once nobody is listening.
 *
 * PROVISIONAL PROTOCOL - the backend hasn't chosen one. Assumed: a plain
 * WebSocket carrying JSON `{ event, data }` messages, rooms joined with
 * `join_room` / `leave_room` and `{ room }`. Switching to e.g. Socket.IO
 * should only mean rewriting this file.
 */

type Handler = (data: unknown) => void

interface Subscription {
  room: string
  event: string
  handler: Handler
}

interface Envelope {
  event: string
  data?: unknown
}

const OPEN = 1
const MIN_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

const subscriptions = new Set<Subscription>()
/** Subscribers per room, so a room is joined once and left with its last one. */
const roomCounts = new Map<string, number>()
const reconnectListeners = new Set<() => void>()

let socket: WebSocket | null = null
let retries = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null
/** Whether the current run of connections has opened before (so: a reconnect). */
let hasOpened = false

/** Where to connect: VITE_WS_URL, else /ws on this app's own host. */
export function socketBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_URL
  if (configured) return configured
  const { protocol, host } = window.location
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws`
}

function socketUrl(): string {
  const url = new URL(socketBaseUrl())
  // Browsers can't set headers on a WebSocket, so the token rides along in
  // the query string.
  const { token } = useSessionStore.getState()
  if (token) url.searchParams.set('token', token)
  return url.toString()
}

function send(message: Envelope) {
  if (socket?.readyState === OPEN) socket.send(JSON.stringify(message))
}

function dispatch(raw: unknown) {
  let message: Envelope
  try {
    message = JSON.parse(String(raw)) as Envelope
  } catch {
    return // Not ours to understand.
  }
  if (typeof message?.event !== 'string') return

  // If the server names the room, only that room's subscribers hear it.
  const data = message.data as { room?: unknown } | undefined
  const room = typeof data?.room === 'string' ? data.room : null
  for (const sub of subscriptions) {
    if (sub.event === message.event && (room === null || sub.room === room)) {
      sub.handler(message.data)
    }
  }
}

function connect() {
  const ws = new WebSocket(socketUrl())
  socket = ws

  // Each handler first checks it still belongs to the live socket: an old
  // one being torn down must not touch the new one's state.
  ws.onopen = () => {
    if (ws !== socket) return
    retries = 0
    // Covers both cases: rooms subscribed before the first open, and rooms
    // the server forgot when the connection dropped.
    for (const room of roomCounts.keys()) send({ event: 'join_room', data: { room } })
    if (hasOpened) for (const listener of reconnectListeners) listener()
    hasOpened = true
  }
  ws.onmessage = (event) => {
    if (ws === socket) dispatch(event.data)
  }
  ws.onclose = () => {
    if (ws !== socket) return
    socket = null
    if (subscriptions.size > 0) scheduleReconnect()
  }
}

function scheduleReconnect() {
  const delay = Math.min(MIN_RETRY_MS * 2 ** retries, MAX_RETRY_MS)
  retries += 1
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, delay)
}

/** Closes the connection on purpose - no reconnect follows. */
function disconnect() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
  const ws = socket
  socket = null
  ws?.close()
}

/**
 * Listens for `event` in `room`, joining the room (and opening the shared
 * connection) if needed. Returns a function that stops listening, leaving the
 * room - and closing the connection - when nothing else needs them.
 */
export function subscribe(room: string, event: string, handler: Handler): () => void {
  const sub: Subscription = { room, event, handler }
  subscriptions.add(sub)

  const count = roomCounts.get(room) ?? 0
  roomCounts.set(room, count + 1)
  if (!socket && !retryTimer) {
    retries = 0
    hasOpened = false
    connect() // Joins every room, this one included, once open.
  } else if (count === 0) {
    send({ event: 'join_room', data: { room } })
  }

  return () => {
    if (!subscriptions.delete(sub)) return
    const remaining = (roomCounts.get(room) ?? 1) - 1
    if (remaining > 0) {
      roomCounts.set(room, remaining)
    } else {
      roomCounts.delete(room)
      send({ event: 'leave_room', data: { room } })
    }
    if (subscriptions.size === 0) disconnect()
  }
}

/**
 * Called each time the connection comes back after dropping. Events sent
 * while it was down are lost, so this is the moment to refetch.
 */
export function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener)
  return () => {
    reconnectListeners.delete(listener)
  }
}

// A different token is a different identity (e.g. the guest a first join
// just created): reconnect so the server sees who we are now.
useSessionStore.subscribe((state, previous) => {
  if (state.token === previous.token || !socket) return
  disconnect()
  hasOpened = false
  connect()
})

/** Drops every subscription and the connection. Tests only. */
export function resetSocketForTests() {
  subscriptions.clear()
  roomCounts.clear()
  reconnectListeners.clear()
  disconnect()
  retries = 0
  hasOpened = false
}
