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

  it('goes straight to the lobby room when create is clicked', () => {
    cy.get('[data-testid="create-lobby-button"]').click()

    // No CREATING... step - the click navigates immediately. Assert the room
    // actually rendered: a URL check alone passes even on an unmatched route.
    cy.url().should('match', /\/lobby\/[A-Z0-9]{6}$/)
    // Assert the room actually rendered with that code: a URL check alone
    // passes even on an unmatched route that renders nothing.
    cy.contains('Room ID').should('be.visible')
    cy.url().then((url) => {
      const code = url.split('/lobby/')[1]
      cy.contains(code).should('be.visible')
    })
  })

  it('joins a lobby by code and lands in that room', () => {
    cy.get('[data-testid="join-lobby-input"]').type('ABC123')
    cy.get('[data-testid="join-lobby-submit"]').click()

    cy.url().should('include', '/lobby/ABC123')
    cy.contains('ABC123').should('be.visible')
  })
})
