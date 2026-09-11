import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@app'
import '@styles/global.css'
import './assets/fonts/fonts.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
