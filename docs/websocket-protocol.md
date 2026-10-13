# WebSocket protocol

**Status: proposed by Frontend, not yet agreed with Backend.** The frontend and
its mock server implement exactly what is written here. Nothing in it is final
until Backend signs off, and the [open questions](#open-questions-for-backend)
and the [token decision](#security-the-session-token) must be settled before
the client is pointed at a real server.

| Where | What |
|---|---|
| `src/shared/lib/socket.ts` | The client: one shared connection, `parseEnvelope` |
| `src/mocks/handlers.ts` | The mock server used in `npm run dev` and in tests |
| `src/shared/lib/socket.test.ts` ("message format") | Tests that pin the format down |

Change this file, the client and the mock server together.

## Connection

- **URL:** `VITE_WS_URL` if set, otherwise `/ws` on the app's own host
  (`wss://` when the page is served over `https://`).
- **One connection per tab**, shared by every feature. It opens when something
  first subscribes and closes when nothing is subscribed.
- **Authentication:** `?token=<session token>` on the URL. See
  [Security](#security-the-session-token). If the token changes, the client
  closes the connection and opens a new one.
- **Reconnecting:** after an unexpected close the client retries after 1 s,
  doubling up to 30 s. On every open it sends `join_room` again for each room
  it wants, so the server can forget a client's rooms when its connection
  closes, and must accept a repeated `join_room`.

## Message format

Every message, in both directions, is one JSON text frame:

```json
{
  "event": "player_ready_changed",
  "room": "lobby:AB12CD",
  "data": { "playerId": "player-2", "isReady": true }
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `event` | string | yes | What happened, or what is being asked for |
| `room` | string | yes | The room the message is about |
| `data` | object | no | The event's payload; omitted when there is none |

`room` is part of the message itself, never of `data`. The client delivers an
event only to the code subscribed to that event **in that room**, and ignores
any frame that is not JSON or lacks a string `event` or a string `room`. A
server message meant for no room in particular cannot be expressed yet; this
document has to be extended before one is needed.

## Rooms

One room per lobby, named `lobby:<lobbyCode>`, for example `lobby:AB12CD`.

### Client to server

| `event` | `room` | `data` | Effect |
|---|---|---|---|
| `join_room` | room to join | none | Start receiving that room's events |
| `leave_room` | room to leave | none | Stop receiving them |

```json
{ "event": "join_room", "room": "lobby:AB12CD" }
```

The server should send a room's events only to the connections that joined it.

### Server to client

| `event` | `data` | Sent when |
|---|---|---|
| `player_ready_changed` | `{ "playerId": string, "isReady": boolean }` | `PATCH /api/lobby/:code/ready` succeeds |

`player_ready_changed` goes to everyone in the lobby's room, **including the
player who made the change**, after the change is saved. Events for one room
must arrive in the order the changes happened.

The client never sends a ready change over the socket: a player's own change is
the REST request above, and the socket only carries the broadcast.

## Staying in step with REST

The lobby also arrives over REST: when entering it, in the answer to
`PATCH /ready`, and when the client refetches it after reconnecting. Such an
answer shows the lobby as it was when the server replied, so it can be older
than an event the client has already applied. The client's rule:

- A ready change that arrived **after** a request was sent is kept when that
  request's answer comes in. Everything else is taken from the answer.
- After reconnecting twice in a row, only the later refetch's answer is used.

This needs nothing from the server beyond the ordering above. A version number
would make it exact rather than inferred; see the open questions.

## Security: the session token

**Current decision (provisional):** the session token travels as a query
parameter, because a browser cannot set headers on a WebSocket handshake.

**The risk:** query strings are routinely recorded by reverse proxies, load
balancers, access logs and monitoring tools. The session token is long-lived
and is the same one that authorises every REST call, so a logged URL is a
leaked session.

**To be decided by Backend and whoever runs the infrastructure, before this
client talks to a real server.** In order of preference:

1. **A short-lived, single-use ticket (recommended).** The client calls a REST
   endpoint with its usual `Authorization` header and gets back a ticket that
   is valid for a few seconds, usable once, and good for nothing but opening a
   socket. It connects with `?ticket=...`. A ticket that ends up in a log is
   already worthless. Cost on the client: `socketUrl()` in `socket.ts` fetches a
   ticket before each connection, reconnects included.
2. **Keep `?token=`**, only if it is confirmed in writing that no layer in
   production (proxy, load balancer, application logs, monitoring, error
   reporting) records the query string of `/ws` requests.

Either way, production must use `wss://` only.

## Open questions for Backend

1. **The format itself.** Is `{ event, room, data }` over a plain WebSocket
   acceptable, or will the server use something else (Socket.IO, for example)?
   Only `socket.ts` would need rewriting.
2. **Token transport.** Which of the two options above.
3. **Who may join a room.** Presumably only players of that lobby; what does
   the server answer when someone else tries?
4. **Rejected connections.** The client treats every close as a dropped
   connection and retries. It needs a way to tell "your token is invalid" from
   "the network dropped", so it can stop retrying.
5. **Changes between loading and joining.** The client loads the lobby over
   REST and then joins its room. A change that happens in between reaches
   neither. Sending the current lobby when a client joins would close the gap.
6. **Versioning.** A counter on the lobby, included in REST answers and in
   every event, would let the client order them exactly.
7. **Other lobby events.** There is no event yet for a player joining or
   leaving, so those only show up after a refetch.
