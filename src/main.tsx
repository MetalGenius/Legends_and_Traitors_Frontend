import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@app'
import '@styles/global.css'
import './assets/fonts/fonts.css'

// Dev-only: fakes the backend in the actual browser, not just in tests.
// The dynamic import keeps src/mocks out of production bundles entirely -
// import.meta.env.DEV is statically false in a prod build, so this whole
// branch (and the import) gets dropped.
async function enableMocking() {
  if (!import.meta.env.DEV) return

  const { worker } = await import('@mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
