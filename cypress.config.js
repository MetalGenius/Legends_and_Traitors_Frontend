import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // `npm run preview` serves the production build here.
    baseUrl: 'http://localhost:4173',
    // `.cy.js`, so Vitest's `src/**/*.{test,spec}.{ts,tsx}` never collects these.
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
  },
})
