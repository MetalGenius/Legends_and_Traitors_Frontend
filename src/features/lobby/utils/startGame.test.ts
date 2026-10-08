import { describe, expect, it } from 'vitest'

import type { LobbyPlayer } from '@features/lobby/types/lobby'
import { MAX_PLAYERS, MIN_PLAYERS } from '@shared/config/game'

import {
  getStartGameStatus,
  NEED_MORE_PLAYERS_HINT,
  WAITING_FOR_READY_HINT,
} from './startGame'

/** `count` players, all ready unless listed in `notReady` (by index). */
function players(count: number, notReady: number[] = []): LobbyPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    username: `Player ${i}`,
    isHost: i === 0,
    isReady: !notReady.includes(i),
  }))
}

describe('getStartGameStatus', () => {
  it(`can start with the minimum ${MIN_PLAYERS} players, all ready`, () => {
    expect(getStartGameStatus(players(MIN_PLAYERS))).toEqual({ canStart: true, hint: null })
  })

  it('can start with a full lobby, all ready', () => {
    expect(getStartGameStatus(players(MAX_PLAYERS)).canStart).toBe(true)
  })

  it('needs more players below the minimum, even if everyone is ready', () => {
    expect(getStartGameStatus(players(MIN_PLAYERS - 1))).toEqual({
      canStart: false,
      hint: NEED_MORE_PLAYERS_HINT,
    })
  })

  it('reports too few players before anyone not being ready', () => {
    expect(getStartGameStatus(players(2, [1])).hint).toBe(NEED_MORE_PLAYERS_HINT)
  })

  it('waits when anyone, host included, is not ready', () => {
    expect(getStartGameStatus(players(MIN_PLAYERS, [0]))).toEqual({
      canStart: false,
      hint: WAITING_FOR_READY_HINT,
    })
    expect(getStartGameStatus(players(MAX_PLAYERS, [5])).hint).toBe(WAITING_FOR_READY_HINT)
  })

  it('names the minimum in its hint', () => {
    expect(NEED_MORE_PLAYERS_HINT).toBe('Need at least 4 players')
  })
})
