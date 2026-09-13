describe('Home screen', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('renders the landing content', () => {
    cy.contains('h1', 'Three Cock online').should('be.visible')
    cy.contains('button', 'Login').should('be.visible')
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

  it('disables the create button while a lobby is being created', () => {
    cy.get('[data-testid="create-lobby-button"]').as('create')

    cy.get('@create').click()
    cy.get('@create')
      .should('be.disabled')
      .and('have.attr', 'aria-busy', 'true')
      .and('contain', 'CREATING...')

    // useCreateLobby is still a placeholder with a 5s fake delay (#36).
    cy.get('@create', { timeout: 15000 })
      .should('not.be.disabled')
      .and('contain', 'CREATE')
  })
})
