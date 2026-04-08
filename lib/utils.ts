// ─── ELO Score Calculator ─────────────────────────────────────────────────────
// Standard ELO with K=32, used to update shelf scores after each face-off

const K_FACTOR = 32

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function updateElo(
  winnerScore: number,
  loserScore: number
): { newWinner: number; newLoser: number } {
  const expectedWinner = expectedScore(winnerScore, loserScore)
  const expectedLoser = expectedScore(loserScore, winnerScore)

  const newWinner = Math.round(winnerScore + K_FACTOR * (1 - expectedWinner))
  const newLoser = Math.round(loserScore + K_FACTOR * (0 - expectedLoser))

  return { newWinner, newLoser }
}

// ─── URL helper for OAuth redirects ──────────────────────────────────────────
// Resolves the correct base URL across local, preview, and production

export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000'

  url = url.startsWith('http') ? url : `https://${url}`
  url = url.endsWith('/') ? url : `${url}/`

  return url
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function formatScore(score: number): string {
  return score.toLocaleString('en-IN')
}
