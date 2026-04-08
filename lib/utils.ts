import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { XP_LEVELS, getLevelFromXP } from './constants'
import type { XPLevel } from './types'

// ─── Class name merger ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── XP Progress ─────────────────────────────────────────────────────────────

export function getXPProgress(xp: number): {
  level: XPLevel
  label: string
  emoji: string
  current: number
  next: number
  percent: number
} {
  const level = getLevelFromXP(xp)
  const { label, emoji, min } = XP_LEVELS[level]
  const levels = Object.values(XP_LEVELS).map(l => l.min).sort((a, b) => a - b)
  const currentMin = min
  const nextMin = levels.find(l => l > currentMin) ?? currentMin
  const percent = nextMin === currentMin ? 100 : Math.round(((xp - currentMin) / (nextMin - currentMin)) * 100)
  return { level, label, emoji, current: xp, next: nextMin, percent }
}

// ─── ELO Score Calculator ─────────────────────────────────────────────────────

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

// ─── Site URL resolver ────────────────────────────────────────────────────────

export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000'

  url = url.startsWith('http') ? url : `https://${url}`
  url = url.endsWith('/') ? url : `${url}/`

  return url
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function formatScore(score: number): string {
  return score.toLocaleString('en-IN')
}
