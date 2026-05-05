// Binary search insertion sort for shelf ranking.
// Finds the insertion point for a new entry in O(log n) comparisons.
// Shelf MUST be sorted by score DESC (best first, index 0 = #1).
// The transitive property means if New > A > B, we skip B entirely.

export type ShelfCafe = {
  cafeId: string
  displayName: string
  score: number
  rank: number
}

export type BSState = {
  shelf: ShelfCafe[]   // sorted score DESC — index 0 = best
  low: number          // current search window start (inclusive)
  high: number         // current search window end (inclusive)
  step: number         // current comparison (1-indexed)
  maxSteps: number     // ceil(log2(n+1)) worst-case rounds
  done: boolean
  insertionRank: number | null  // 1-indexed final rank, set when done
}

export function initBS(shelf: ShelfCafe[]): BSState {
  if (shelf.length === 0) {
    return { shelf: [], low: 0, high: -1, step: 1, maxSteps: 1, done: true, insertionRank: 1 }
  }
  return {
    shelf,
    low: 0,
    high: shelf.length - 1,
    step: 1,
    maxSteps: Math.ceil(Math.log2(shelf.length + 1)),
    done: false,
    insertionRank: null,
  }
}

// Returns the current opponent (midpoint of search window)
export function getCurrentOpponent(state: BSState): ShelfCafe | null {
  if (state.done || state.low > state.high) return null
  const mid = Math.floor((state.low + state.high) / 2)
  return state.shelf[mid] ?? null
}

// Advance based on whether the NEW entry beat the current midpoint opponent.
// newEntryWon=true  → new entry is BETTER → it belongs above mid → high = mid-1
// newEntryWon=false → new entry is WORSE  → it belongs below mid → low  = mid+1
export function advanceBS(state: BSState, newEntryWon: boolean): BSState {
  if (state.done) return state

  const mid = Math.floor((state.low + state.high) / 2)

  const newLow  = newEntryWon ? state.low  : mid + 1
  const newHigh = newEntryWon ? mid - 1    : state.high

  if (newLow > newHigh) {
    // Search window exhausted — insertion point is newLow (0-indexed)
    // Rank = newLow + 1 (1-indexed, i.e. inserted AFTER all items better than it)
    return {
      ...state,
      low: newLow,
      high: newHigh,
      step: state.step + 1,
      done: true,
      insertionRank: newLow + 1,
    }
  }

  return {
    ...state,
    low: newLow,
    high: newHigh,
    step: state.step + 1,
  }
}
