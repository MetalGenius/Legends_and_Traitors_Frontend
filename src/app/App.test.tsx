import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('renders the landing screen inside the provider stack', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /login/i })).toBeDefined()
  })
})
