// Binary search insertion sort for shelf ranking.
// Finds the insertion point for a new entry in O(log n) comparisons
// by exploiting the transitive property: if X > A > B, X > B is implied.

export type ShelfCafe = {
  cafeId: string
  displayName: string
  score: number
  rank: number
}

export type BSState = {
  shelf: ShelfCafe[]  // sorted by rank ASC — index 0 = #1 (best)
  low: number
  high: number
  step: number        // current comparison number (1-indexed, for display)
  maxSteps: number    // ceil(log2(n+1)) — worst case comparisons needed
  done: boolean
  insertionRank: number | null  // 1-indexed rank, set when done
}

export function initBS(shelf: ShelfCafe[]): BSState {
  if (shelf.length === 0) {
    return { shelf: [], low: 0, high: -1, step: 0, maxSteps: 0, done: true, insertionRank: 1 }
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

// Returns the opponent for the current comparison round
export function getCurrentOpponent(state: BSState): ShelfCafe | null {
  if (state.done || state.low > state.high) return null
  const mid = Math.floor((state.low + state.high) / 2)
  return state.shelf[mid]
}

// Advances the search based on whether the new entry beat the current opponent.
// If new entry wins → it belongs above mid → eliminate lower half.
// If new entry loses → it belongs below mid → eliminate upper half.
// When bounds cross → insertion point found.
export function advanceBS(state: BSState, newEntryWon: boolean): BSState {
  if (state.done) return state

  const mid = Math.floor((state.low + state.high) / 2)
  let newLow = state.low
  let newHigh = state.high

  if (newEntryWon) {
    // New entry is better — search the upper (better-ranked) half
    newHigh = mid - 1
  } else {
    // New entry is worse — search the lower (worse-ranked) half
    newLow = mid + 1
  }

  if (newLow > newHigh) {
    // Insertion point: newLow (0-indexed) → rank = newLow + 1
    return {
      ...state,
      low: newLow,
      high: newHigh,
      step: state.step + 1,
      done: true,
      insertionRank: newLow + 1,
    }
  }

  return { ...state, low: newLow, high: newHigh, step: state.step + 1 }
}
