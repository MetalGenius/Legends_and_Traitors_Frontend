/**
 * Cypress runs against `npm run preview` - the production build, where MSW is
 * deliberately disabled. Every API call therefore has to be stubbed here with
 * cy.intercept, including the GET the waiting room fires on mount.
 */
function lobby(code, overrides = {}) {
  return {
    status: 'SUCCESS',
    data: {
      lobbyCode: code,
      hostId: 'host-1',
      maxPlayers: 8,
      players: [{ id: 'host-1', name: 'HostName', isHost: true, isReady: false }],
      ...overrides,
    },
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
      req.reply({ delay: 300, body: lobby('AB12CD') }),
    ).as('createLobby')
    cy.intercept('GET', '/api/lobby/AB12CD', { body: lobby('AB12CD') }).as('getLobby')

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

  it('joins a lobby by code and lands in that room', () => {
    cy.intercept('GET', '/api/lobby/ABC123', { body: lobby('ABC123') }).as('getLobby')

    cy.get('[data-testid="join-lobby-input"]').type('ABC123')
    cy.get('[data-testid="join-lobby-submit"]').click()
    cy.wait('@getLobby')

    cy.url().should('include', '/lobby/ABC123')
    cy.contains('ABC123').should('be.visible')
    cy.contains('HostName').should('be.visible')
  })
})

describe('Lobby waiting room', () => {
  it('shows a loading state before the lobby arrives', () => {
    cy.intercept('GET', '/api/lobby/AB12CD', (req) =>
      req.reply({ delay: 500, body: lobby('AB12CD') }),
    ).as('getLobby')

    cy.visit('/lobby/AB12CD')

    cy.get('[data-testid="lobby-loading"]').should('be.visible')
    cy.wait('@getLobby')
    cy.get('[data-testid="lobby-loading"]').should('not.exist')
    cy.contains('HostName').should('be.visible')
  })

  it('bounces a bad code back Home with an explanation', () => {
    cy.intercept('GET', '/api/lobby/ZZ99ZZ', {
      statusCode: 404,
      body: { message: 'Lobby not found' },
    }).as('getLobby')

    // Someone pasting a dead invite link straight into the address bar.
    cy.visit('/lobby/ZZ99ZZ')
    cy.wait('@getLobby')

    cy.url().should('not.include', '/lobby/')
    cy.contains('invalid or has expired').should('be.visible')
    cy.get('[data-testid="create-lobby-button"]').should('be.visible')
  })

  it('bounces Home rather than hanging when the lobby fails to load', () => {
    cy.intercept('GET', '/api/lobby/AB12CD', { forceNetworkError: true }).as('getLobby')

    cy.visit('/lobby/AB12CD')

    cy.url().should('not.include', '/lobby/')
    cy.contains("Couldn't load that lobby").should('be.visible')
    cy.get('[data-testid="lobby-loading"]').should('not.exist')
  })
})
