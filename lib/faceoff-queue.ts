// Ranking state machine: binary search → settling phase.
//
// Phase 1 (BS):       Find a candidate rank in O(log N) comparisons.
// Phase 2 (SETTLE):   Validate rank against direct neighbours until stable.
//                     Stable = loses to item above AND beats item below.
//
// Shelf MUST be sorted by rank ASC (rank 1 = best, index 0).

export type ShelfCafe = {
  cafeId: string
  displayName: string
  score: number
  rank: number
}

export type RankPhase = 'bs' | 'settle'

export type BSState = {
  shelf: ShelfCafe[]        // sorted rank ASC — index 0 = rank 1
  // Binary-search window
  low: number
  high: number
  // Settling
  phase: RankPhase
  candidateIdx: number      // proposed 0-indexed insertion position (set after BS)
  settleDir: 'up' | 'down' | 'done'
  // Progress
  step: number
  maxSteps: number
  done: boolean
  insertionRank: number | null
}

export function initBS(shelf: ShelfCafe[]): BSState {
  if (shelf.length === 0) {
    return {
      shelf: [], low: 0, high: -1,
      phase: 'bs', candidateIdx: 0, settleDir: 'done',
      step: 1, maxSteps: 1, done: true, insertionRank: 1,
    }
  }
  // Estimate: log2(N+1) for BS + up to N settle steps worst case, cap display at N+log2
  const maxSteps = Math.ceil(Math.log2(shelf.length + 1)) + shelf.length
  return {
    shelf,
    low: 0,
    high: shelf.length - 1,
    phase: 'bs',
    candidateIdx: 0,
    settleDir: 'done',
    step: 1,
    maxSteps,
    done: false,
    insertionRank: null,
  }
}

// Who to compare against right now
export function getCurrentOpponent(state: BSState): ShelfCafe | null {
  if (state.done) return null

  if (state.phase === 'bs') {
    if (state.low > state.high) return null
    const mid = Math.floor((state.low + state.high) / 2)
    return state.shelf[mid] ?? null
  }

  // settle phase — compare against the neighbour we're validating
  if (state.settleDir === 'up') {
    // Testing: can new entry beat the item just ABOVE candidate?
    // i.e. item at candidateIdx - 1
    return state.shelf[state.candidateIdx - 1] ?? null
  }
  if (state.settleDir === 'down') {
    // Testing: does new entry beat the item just BELOW candidate?
    // i.e. item at candidateIdx (the one we'd displace)
    return state.shelf[state.candidateIdx] ?? null
  }
  return null
}

// Advance state based on outcome.
// newEntryWon = true  → new café is BETTER than current opponent
// newEntryWon = false → new café is WORSE  than current opponent
export function advanceBS(state: BSState, newEntryWon: boolean): BSState {
  if (state.done) return state

  const next: BSState = { ...state, step: state.step + 1 }

  // ── Phase 1: Binary search ──────────────────────────────────────────────────
  if (state.phase === 'bs') {
    const mid = Math.floor((state.low + state.high) / 2)

    const newLow  = newEntryWon ? state.low  : mid + 1
    const newHigh = newEntryWon ? mid - 1    : state.high

    if (newLow > newHigh) {
      // BS window exhausted — proposed insertion at 0-indexed newLow
      return enterSettlePhase({ ...next, low: newLow, high: newHigh }, newLow)
    }

    return { ...next, low: newLow, high: newHigh }
  }

  // ── Phase 2: Settling ───────────────────────────────────────────────────────
  if (state.phase === 'settle') {

    if (state.settleDir === 'up') {
      if (newEntryWon) {
        // New entry beat the item above → move candidate up by 1
        const newIdx = state.candidateIdx - 1
        // Check if we're now at the top
        if (newIdx === 0) {
          return finalize(next, 0)   // rank 1
        }
        // Still has items above — keep checking upward
        return { ...next, candidateIdx: newIdx, settleDir: 'up' }
      } else {
        // New entry lost to item above → candidate rank is confirmed
        // Now validate downward: beat the item AT candidate position?
        if (state.candidateIdx >= state.shelf.length) {
          return finalize(next, state.candidateIdx)
        }
        return { ...next, settleDir: 'down' }
      }
    }

    if (state.settleDir === 'down') {
      if (!newEntryWon) {
        // New entry lost to item below → move candidate down by 1
        const newIdx = state.candidateIdx + 1
        if (newIdx >= state.shelf.length) {
          return finalize(next, newIdx)  // last place
        }
        return { ...next, candidateIdx: newIdx, settleDir: 'down' }
      } else {
        // New entry beat item below → rank is confirmed stable
        return finalize(next, state.candidateIdx)
      }
    }
  }

  return { ...next, done: true }
}

// Enter the settle phase at a proposed 0-indexed candidate position
function enterSettlePhase(state: BSState, candidateIdx: number): BSState {
  const s = state.shelf

  // Edge cases — no neighbours to test
  if (s.length === 0) return finalize(state, 0)
  if (candidateIdx === 0 && s.length === 0) return finalize(state, 0)

  // If proposed position is beyond the shelf, it's last place — no down-settle needed
  // but check upward if there are items above
  if (candidateIdx >= s.length) {
    if (s.length === 0) return finalize(state, 0)
    // Need to validate: does new beat the last item? Start down-settle at last idx
    return {
      ...state,
      phase: 'settle',
      candidateIdx: s.length,  // insertion after all items
      settleDir: 'down',
    }
  }

  // Normal: enter settle by checking upward first (can we beat what's above?)
  if (candidateIdx > 0) {
    return {
      ...state,
      phase: 'settle',
      candidateIdx,
      settleDir: 'up',
    }
  }

  // candidateIdx === 0 — proposed rank 1, start down-settle (validate we beat #1 spot)
  if (s.length > 0) {
    return {
      ...state,
      phase: 'settle',
      candidateIdx: 0,
      settleDir: 'down',
    }
  }

  return finalize(state, 0)
}

function finalize(state: BSState, idx: number): BSState {
  return {
    ...state,
    phase: 'settle',
    settleDir: 'done',
    done: true,
    insertionRank: idx + 1,   // 1-indexed
  }
}
