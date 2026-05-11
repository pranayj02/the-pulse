// Ranking state machine: binary search → settling phase.
//
// Phase 1 (BS):    Find a candidate insertion index in O(log N) comparisons.
// Phase 2 (SETTLE): Walk neighbors until rank is confirmed by direct comparison.
//   Stable = explicitly lost to the item directly above AND beat the item directly below.
//
// Shelf is sorted rank ASC: index 0 = rank 1 (best), index N-1 = rank N (worst).
// candidateIdx is the 0-indexed insertion position (rank = candidateIdx + 1).

export type ShelfCafe = {
  cafeId: string
  displayName: string
  score: number
  rank: number
}

export type RankPhase = 'bs' | 'settle'
export type SettleDir = 'up' | 'down' | 'done'

export type BSState = {
  shelf: ShelfCafe[]
  low: number
  high: number
  phase: RankPhase
  candidateIdx: number      // proposed 0-indexed insertion position
  settleDir: SettleDir
  step: number
  maxSteps: number
  done: boolean
  insertionRank: number | null  // 1-indexed, set only when done
}

export function initBS(shelf: ShelfCafe[]): BSState {
  if (shelf.length === 0) {
    return {
      shelf: [], low: 0, high: -1,
      phase: 'bs', candidateIdx: 0, settleDir: 'done',
      step: 1, maxSteps: 1, done: true, insertionRank: 1,
    }
  }
  return {
    shelf,
    low: 0,
    high: shelf.length - 1,
    phase: 'bs',
    candidateIdx: 0,
    settleDir: 'done',
    step: 1,
    maxSteps: Math.ceil(Math.log2(shelf.length + 1)) + shelf.length,
    done: false,
    insertionRank: null,
  }
}

// Returns the opponent the user must compare against right now.
export function getCurrentOpponent(state: BSState): ShelfCafe | null {
  if (state.done) return null

  if (state.phase === 'bs') {
    if (state.low > state.high) return null
    const mid = Math.floor((state.low + state.high) / 2)
    return state.shelf[mid] ?? null
  }

  // settle phase
  if (state.settleDir === 'up') {
    // Test the item directly ABOVE (lower index = better rank)
    const aboveIdx = state.candidateIdx - 1
    return aboveIdx >= 0 ? state.shelf[aboveIdx] ?? null : null
  }
  if (state.settleDir === 'down') {
    // Test the item directly BELOW (higher index = worse rank)
    const belowIdx = state.candidateIdx
    return belowIdx < state.shelf.length ? state.shelf[belowIdx] ?? null : null
  }
  return null
}

// Advance state based on outcome of the current comparison.
// newEntryWon = true  → new café is BETTER than the current opponent
// newEntryWon = false → new café is WORSE  than the current opponent
export function advanceBS(state: BSState, newEntryWon: boolean): BSState {
  if (state.done) return state

  const next: BSState = { ...state, step: state.step + 1 }

  // ── Phase 1: Binary search ──────────────────────────────────────────────────
  if (state.phase === 'bs') {
    const mid = Math.floor((state.low + state.high) / 2)
    const newLow  = newEntryWon ? state.low  : mid + 1
    const newHigh = newEntryWon ? mid - 1    : state.high

    if (newLow > newHigh) {
      // Window exhausted — enter settle at proposed index newLow
      return startSettle({ ...next, low: newLow, high: newHigh }, newLow)
    }
    return { ...next, low: newLow, high: newHigh }
  }

  // ── Phase 2: Settling ───────────────────────────────────────────────────────
  if (state.phase === 'settle') {

    if (state.settleDir === 'up') {
      const aboveIdx = state.candidateIdx - 1

      if (newEntryWon) {
        // Beat the item above → move candidate up (toward index 0)
        const newCandidateIdx = aboveIdx  // insert at aboveIdx now
        if (newCandidateIdx <= 0) {
          // At or above index 0 — no more items above, switch to down-settle
          // to confirm we actually beat the current #1
          return { ...next, candidateIdx: 0, settleDir: 'down' }
        }
        // Still items above — keep going up
        return { ...next, candidateIdx: newCandidateIdx, settleDir: 'up' }
      } else {
        // Lost to item above → confirmed upper boundary
        // Now validate lower boundary: do we beat the item below?
        if (state.candidateIdx >= state.shelf.length) {
          // No item below — last place confirmed
          return finalize(next, state.candidateIdx)
        }
        return { ...next, settleDir: 'down' }
      }
    }

    if (state.settleDir === 'down') {
      const belowIdx = state.candidateIdx

      if (newEntryWon) {
        // Beat the item at belowIdx → rank is candidateIdx + 1, confirmed
        return finalize(next, state.candidateIdx)
      } else {
        // Lost to item below → move candidate down (toward end of shelf)
        const newCandidateIdx = belowIdx + 1
        if (newCandidateIdx >= state.shelf.length) {
          // Fell past end — last place
          return finalize(next, state.shelf.length)
        }
        return { ...next, candidateIdx: newCandidateIdx, settleDir: 'down' }
      }
    }
  }

  return { ...next, done: true }
}

// Enter settle phase at a proposed 0-indexed insertion position.
// If at end of shelf, validate upward. If at start, validate downward.
// Otherwise validate upward first (more common early exit).
function startSettle(state: BSState, candidateIdx: number): BSState {
  const n = state.shelf.length

  if (n === 0) return finalize(state, 0)

  if (candidateIdx >= n) {
    // Proposed last place — validate upward from end
    return { ...state, phase: 'settle', candidateIdx: n, settleDir: 'up' }
  }

  if (candidateIdx === 0) {
    // Proposed rank 1 — validate downward (test vs current #1)
    return { ...state, phase: 'settle', candidateIdx: 0, settleDir: 'down' }
  }

  // Middle position — validate upward first
  return { ...state, phase: 'settle', candidateIdx, settleDir: 'up' }
}

function finalize(state: BSState, idx: number): BSState {
  return {
    ...state,
    phase: 'settle',
    settleDir: 'done',
    done: true,
    insertionRank: idx + 1,
  }
}
