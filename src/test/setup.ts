import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest runs without globals, so Testing Library's automatic cleanup never
// self-registers. Without this, renders accumulate in the same document and
// queries fail with "found multiple elements".
afterEach(cleanup)
