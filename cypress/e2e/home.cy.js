/**
 * Cypress runs against `npm run preview` - the production build, where MSW is
 * deliberately disabled. Every API call therefore has to be stubbed here with
 * cy.intercept, including the GET and/or join POST the waiting room fires on
 * mount.
 */
function lobby(code, overrides = {}) {
  return {
    status: 'SUCCESS',
    data: {
      lobbyCode: code,
      hostId: 'host-1',
      players: [{ id: 'host-1', username: 'HostName', isHost: true, isReady: false }],
      ...overrides,
    },
  }
}

// Nobody logs in during these specs, and Cypress clears localStorage between
// tests, so unless a test seeds a session, every visitor is a first-timer: a
// create or join without a token makes the server return a guest account.
const guest = { id: 'guest-92117', username: 'guest_92117', displayName: 'Guest92117' }
const host = { id: 'host-1', username: 'host_1', displayName: 'HostName' }

/** A lobby after the guest has joined it, as the join endpoint returns it. */
function joinedLobby(code = 'ABC123') {
  return {
    ...lobby(code, {
      players: [
        { id: host.id, username: host.displayName, isHost: true, isReady: false },
        { id: guest.id, username: guest.displayName, isHost: false, isReady: false },
      ],
    }),
    guest: { token: 'guest-token', user: guest },
  }
}

/** A session the app would have saved on an earlier visit. */
function seedSession(token, account) {
  return (win) => {
    win.localStorage.setItem(
      'lt-session',
      JSON.stringify({ state: { token, account: { ...account, isGuest: true } }, version: 0 }),
    )
  }
}

describe('Home screen', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('renders the landing content', () => {
    cy.contains('h1', 'Legend and Traitor').should('be.visible')
    cy.contains('button', 'Login').should('be.visible')
    cy.get('[data-testid="join-lobby-input"]').should('be.visible')
    cy.get('[data-testid="create-lobby-button"]')
      .should('be.visible')
      .and('not.be.disabled')
      .and('contain', 'CREATE')
  })

  it('accepts a room id', () => {
    cy.get('input[placeholder="ROOM ID"]')
      .type('ABC123')
      .should('have.value', 'ABC123')
  })

  it('creates a lobby and lands in that room', () => {
    // Delayed so the in-flight button state is observable.
    cy.intercept('POST', '/api/lobby', (req) =>
      req.reply({
        delay: 300,
        body: { ...lobby('AB12CD'), guest: { token: 'host-token', user: host } },
      }),
    ).as('createLobby')
    cy.intercept('GET', '/api/lobby/AB12CD', { body: lobby('AB12CD') }).as('getLobby')
    // The host is already in their lobby - arriving must not join it again.
    cy.intercept('POST', '/api/lobby/AB12CD/join', cy.spy().as('joinLobby'))

    cy.get('[data-testid="create-lobby-button"]').click()

    cy.get('[data-testid="create-lobby-button"]')
      .should('be.disabled')
      .and('contain', 'CREATING')

    cy.wait('@createLobby')
    cy.wait('@getLobby')

    // Assert the room actually rendered: a URL check alone passes even on an
    // unmatched route that renders nothing.
    cy.url().should('include', '/lobby/AB12CD')
    cy.contains('Room ID').should('be.visible')
    cy.contains('AB12CD').should('be.visible')
    cy.contains('HostName').should('be.visible')
    cy.contains('Player (1/8)').should('be.visible')
    cy.get('[data-testid="header-display-name"]').should('have.text', host.displayName)
    cy.get('@joinLobby').should('not.have.been.called')
  })

  it('shows an inline error and stays put when creating a lobby fails', () => {
    cy.intercept('POST', '/api/lobby', {
      statusCode: 500,
      body: { message: 'Server exploded' },
    }).as('createLobby')

    cy.get('[data-testid="create-lobby-button"]').click()
    cy.wait('@createLobby')

    cy.contains('Server exploded').should('be.visible')
    cy.url().should('not.include', '/lobby/')
    cy.get('[data-testid="create-lobby-button"]').should('not.be.disabled')
  })

  it('joins a lobby by code, waiting in the room until the join succeeds', () => {
    // Delayed so the waiting room's joining state is observable.
    cy.intercept('POST', '/api/lobby/ABC123/join', (req) => {
      // No account yet, so no token - this join is what creates the guest.
      expect(req.headers).not.to.have.property('authorization')
      req.reply({ delay: 500, body: joinedLobby() })
    }).as('joinLobby')

    cy.get('[data-testid="join-lobby-input"]').type('ABC123')
    cy.get('[data-testid="join-lobby-submit"]').click()

    cy.url().should('include', '/lobby/ABC123')
    cy.get('[data-testid="lobby-loading"]').should('contain', 'Joining lobby')
    cy.wait('@joinLobby')

    cy.get('[data-testid="lobby-loading"]').should('not.exist')
    cy.contains('ABC123').should('be.visible')
    cy.contains('HostName').should('be.visible')
    cy.contains('Player (2/8)').should('be.visible')
    // Header shows the new guest's display name, not its username handle.
    cy.get('[data-testid="header-display-name"]').should('have.text', guest.displayName)
    cy.window()
      .its('localStorage')
      .invoke('getItem', 'lt-session')
      .should('contain', 'guest-token')
  })

  it('bounces back Home with an explanation when the lobby is full', () => {
    cy.intercept('POST', '/api/lobby/ABC123/join', {
      statusCode: 409,
      body: { message: 'Lobby is full' },
    }).as('joinLobby')

    cy.get('[data-testid="join-lobby-input"]').type('ABC123')
    cy.get('[data-testid="join-lobby-submit"]').click()
    cy.wait('@joinLobby')

    cy.url().should('not.include', '/lobby/')
    // Whatever the server said, word for word.
    cy.get('[role="alert"]').should('have.text', 'Lobby is full')
  })
})

describe('Opening an invite link', () => {
  it('joins the lobby, exactly like typing the code on Home', () => {
    cy.intercept('POST', '/api/lobby/ABC123/join', (req) =>
      req.reply({ delay: 500, body: joinedLobby() }),
    ).as('joinLobby')

    // Someone pasting the link the host copied straight into the address bar.
    cy.visit('/lobby/ABC123')

    cy.get('[data-testid="lobby-loading"]').should('contain', 'Joining lobby')
    cy.wait('@joinLobby')
    cy.get('[data-testid="lobby-loading"]').should('not.exist')
    cy.contains('Player (2/8)').should('be.visible')
    cy.contains('HostName').should('be.visible')
    cy.get('[data-testid="header-display-name"]').should('have.text', guest.displayName)
    cy.window()
      .its('localStorage')
      .invoke('getItem', 'lt-session')
      .should('contain', 'guest-token')
  })

  it('only loads the lobby for someone already in it (e.g. a refresh)', () => {
    cy.intercept('GET', '/api/lobby/ABC123', { body: joinedLobby() }).as('getLobby')
    cy.intercept('POST', '/api/lobby/ABC123/join', cy.spy().as('joinLobby'))

    cy.visit('/lobby/ABC123', { onBeforeLoad: seedSession('guest-token', guest) })

    cy.wait('@getLobby')
    cy.contains('Player (2/8)').should('be.visible')
    cy.get('@joinLobby').should('not.have.been.called')
  })

  it('joins when a returning player follows a link to a lobby they are not in', () => {
    cy.intercept('GET', '/api/lobby/ABC123', { body: lobby('ABC123') }).as('getLobby')
    cy.intercept('POST', '/api/lobby/ABC123/join', (req) => {
      // Their saved session identifies them; no new guest needed.
      expect(req.headers.authorization).to.equal('Bearer guest-token')
      const { guest: _, ...body } = joinedLobby()
      req.reply({ body })
    }).as('joinLobby')

    cy.visit('/lobby/ABC123', { onBeforeLoad: seedSession('guest-token', guest) })

    cy.wait('@getLobby')
    cy.wait('@joinLobby')
    cy.contains('Player (2/8)').should('be.visible')
  })

  it('bounces a bad code back Home with an explanation', () => {
    cy.intercept('POST', '/api/lobby/ZZ99ZZ/join', {
      statusCode: 404,
      body: { message: 'Lobby not found' },
    }).as('joinLobby')

    cy.visit('/lobby/ZZ99ZZ')
    cy.wait('@joinLobby')

    cy.url().should('not.include', '/lobby/')
    cy.get('[role="alert"]').should('have.text', 'Lobby not found')
    cy.get('[data-testid="create-lobby-button"]').should('be.visible')
  })

  it('bounces back Home when the lobby is full', () => {
    cy.intercept('POST', '/api/lobby/FULL01/join', {
      statusCode: 409,
      body: { message: 'Lobby is full' },
    }).as('joinLobby')

    cy.visit('/lobby/FULL01')
    cy.wait('@joinLobby')

    cy.url().should('not.include', '/lobby/')
    cy.get('[role="alert"]').should('have.text', 'Lobby is full')
  })

  it('bounces Home rather than hanging when the join fails to go through', () => {
    cy.intercept('POST', '/api/lobby/AB12CD/join', { forceNetworkError: true }).as('joinLobby')

    cy.visit('/lobby/AB12CD')

    cy.url().should('not.include', '/lobby/')
    cy.contains("Couldn't join that lobby").should('be.visible')
    cy.get('[data-testid="lobby-loading"]').should('not.exist')
  })
})

describe('Ready toggle', () => {
  beforeEach(() => {
    // A guest already in ABC123 (with the host), arriving on a refresh.
    cy.intercept('GET', '/api/lobby/ABC123', { body: joinedLobby() }).as('getLobby')
    cy.visit('/lobby/ABC123', { onBeforeLoad: seedSession('guest-token', guest) })
    cy.wait('@getLobby')
  })

  it("is the player's own card, and only that one", () => {
    cy.get('[role="switch"]')
      .should('have.length', 1)
      .and('have.attr', 'data-testid', 'own-player-card')
      .and('contain', guest.displayName)
      .and('contain', 'Not Ready')
    // The host's card shows its status too, but isn't a control.
    cy.contains('[data-testid="player-ready-status"]', 'Not Ready')
    cy.get('[data-testid="player-ready-status"]').should('have.length', 2)
  })

  it('flips instantly, before the server answers', () => {
    cy.intercept('PATCH', '/api/lobby/ABC123/ready', (req) => {
      expect(req.body).to.deep.equal({ isReady: true })
      expect(req.headers.authorization).to.equal('Bearer guest-token')
      const body = joinedLobby()
      body.data.players[1].isReady = true
      req.reply({ delay: 800, body })
    }).as('setReady')

    cy.get('[role="switch"]').click()

    // Well inside the 800ms the server takes to answer.
    cy.get('[role="switch"]', { timeout: 300 })
      .should('have.attr', 'aria-checked', 'true')
      .and('have.attr', 'aria-busy', 'true')
      .find('[data-testid="player-ready-status"]')
      .should('have.text', 'Ready')
    cy.wait('@setReady')
    cy.get('[role="switch"]')
      .should('have.attr', 'aria-checked', 'true')
      .and('have.attr', 'aria-busy', 'false')
  })

  it("flips back and shows the server's message when it's refused", () => {
    cy.intercept('PATCH', '/api/lobby/ABC123/ready', {
      delay: 300,
      statusCode: 409,
      body: { message: 'The game is starting' },
    }).as('setReady')

    cy.get('[role="switch"]').click()
    cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'true')
    cy.wait('@setReady')

    cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'false')
    cy.get('[role="alert"]').should('have.text', 'The game is starting')
  })
})

describe('Start Game', () => {
  /** A lobby of `count` players; the host is host-1. */
  function lobbyOf(count, { allReady }) {
    const names = ['HostName', 'Guinevere', 'Lancelot', 'Gawain', 'Percival']
    return lobby('ABC123', {
      players: names.slice(0, count).map((name, i) => ({
        id: i === 0 ? host.id : `player-${i + 1}`,
        username: name,
        isHost: i === 0,
        isReady: allReady,
      })),
    })
  }

  function visitAs(account, token, body) {
    cy.intercept('GET', '/api/lobby/ABC123', { body }).as('getLobby')
    cy.visit('/lobby/ABC123', { onBeforeLoad: seedSession(token, account) })
    cy.wait('@getLobby')
  }

  it('is only shown to the host', () => {
    const body = lobbyOf(4, { allReady: true })
    body.data.players.push({ id: guest.id, username: guest.displayName, isHost: false, isReady: true })
    visitAs(guest, 'guest-token', body)

    cy.contains('button', 'Leave Game').should('be.visible')
    cy.get('[data-testid="start-game-button"]').should('not.exist')
  })

  it('is enabled for the host once at least 4 players are all ready', () => {
    visitAs(host, 'host-token', lobbyOf(4, { allReady: true }))

    cy.get('[data-testid="start-game-button"]').should('have.attr', 'aria-disabled', 'false')
    cy.get('[role="tooltip"]').should('not.exist')
  })

  it('explains why it is disabled when there are too few players', () => {
    visitAs(host, 'host-token', lobbyOf(3, { allReady: true }))

    cy.get('[data-testid="start-game-button"]')
      .should('have.attr', 'aria-disabled', 'true')
      .and('have.attr', 'aria-describedby')
    cy.get('[role="tooltip"]').should('have.text', 'Need at least 4 players')
  })

  it('explains why it is disabled while anyone is not ready', () => {
    visitAs(host, 'host-token', lobbyOf(5, { allReady: false }))

    cy.get('[data-testid="start-game-button"]').should('have.attr', 'aria-disabled', 'true')
    cy.get('[role="tooltip"]').should('have.text', 'Waiting for all players to be ready')
  })
})

/**
 * Swaps the page's WebSocket for a fake before the app loads (the preview
 * build has no MSW and nothing serves /ws). Records what the app sends on
 * `win.fakeSocket.sent`; `win.fakeSocket.push({ event, room, data })` plays
 * the server.
 */
function installFakeSocket(win) {
  const socket = { sent: [], instance: null }
  socket.push = (message) => socket.instance.onmessage?.({ data: JSON.stringify(message) })
  win.fakeSocket = socket
  win.WebSocket = class {
    constructor(url) {
      this.url = url
      this.readyState = 0
      socket.instance = this
      setTimeout(() => {
        this.readyState = 1
        this.onopen?.()
      }, 0)
    }
    send(data) {
      socket.sent.push(JSON.parse(data))
    }
    close() {
      this.readyState = 3
    }
  }
}

describe('Live ready updates', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/lobby/ABC123', { body: joinedLobby() }).as('getLobby')
    cy.visit('/lobby/ABC123', {
      onBeforeLoad(win) {
        seedSession('guest-token', guest)(win)
        installFakeSocket(win)
      },
    })
    cy.wait('@getLobby')
  })

  it('joins the lobby room over one connection, carrying the token', () => {
    cy.window()
      .its('fakeSocket.sent')
      .should('deep.include', { event: 'join_room', room: 'lobby:ABC123' })
    cy.window()
      .its('fakeSocket.instance.url')
      .should('match', /\/ws\?token=guest-token$/)
  })

  it("flips another player's card when the server announces a change", () => {
    cy.window().its('fakeSocket.sent').should('have.length.at.least', 1)
    // The host's card (not ours) - shown as plain status.
    cy.get('[data-testid="player-ready-status"]').first().should('have.text', 'Not Ready')

    cy.window().then((win) =>
      win.fakeSocket.push({
        event: 'player_ready_changed',
        room: 'lobby:ABC123',
        data: { playerId: host.id, isReady: true },
      }),
    )

    cy.get('[data-testid="player-ready-status"]').first().should('have.text', 'Ready')
    // Our own card is untouched.
    cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'false')
  })

  it("ignores a change announced for another lobby's room", () => {
    cy.window().its('fakeSocket.sent').should('have.length.at.least', 1)

    cy.window().then((win) => {
      // Same event, same player id - but addressed to a different lobby.
      win.fakeSocket.push({
        event: 'player_ready_changed',
        room: 'lobby:ZZZ999',
        data: { playerId: host.id, isReady: true },
      })
      // Then one for this lobby: once it shows, the first has been handled.
      win.fakeSocket.push({
        event: 'player_ready_changed',
        room: 'lobby:ABC123',
        data: { playerId: guest.id, isReady: true },
      })
    })

    cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'true')
    cy.get('[data-testid="player-ready-status"]').first().should('have.text', 'Not Ready')
  })
})
