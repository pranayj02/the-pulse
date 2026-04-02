import type { Badge, BadgeSlug, XPLevel } from './types'

// ─── XP Thresholds ────────────────────────────────────────────────────────────

export const XP_LEVELS: Record<XPLevel, { label: string; min: number; emoji: string }> = {
  sip:           { label: 'Sip',           min: 0,    emoji: '☕' },
  brew:          { label: 'Brew',          min: 100,  emoji: '🫖' },
  roast:         { label: 'Roast',         min: 300,  emoji: '🔥' },
  master_roaster:{ label: 'Master Roaster',min: 700,  emoji: '👑' },
  legend:        { label: 'Legend',        min: 1500, emoji: '⚡' },
}

export function getLevelFromXP(xp: number): XPLevel {
  if (xp >= 1500) return 'legend'
  if (xp >= 700)  return 'master_roaster'
  if (xp >= 300)  return 'roast'
  if (xp >= 100)  return 'brew'
  return 'sip'
}

// ─── XP Rewards ───────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  faceoff:       2,
  cafe_review:   5,
  badge_unlock:  25,
  referral:      50,
} as const

// ─── Badges ───────────────────────────────────────────────────────────────────

export const BADGES: Record<BadgeSlug, Badge> = {
  first_sip: {
    slug:        'first_sip',
    name:        'First Sip',
    description: 'Completed your first face-off',
    emoji:       '🌱',
    xp_reward:   25,
  },
  early_bird: {
    slug:        'early_bird',
    name:        'Early Bird',
    description: 'Joined in the first 30 days of launch',
    emoji:       '☕',
    xp_reward:   25,
  },
  pioneer: {
    slug:        'pioneer',
    name:        'Pioneer',
    description: 'One of the first 500 users on The Pulse',
    emoji:       '🔥',
    xp_reward:   50,
  },
  power_brewer: {
    slug:        'power_brewer',
    name:        'Power Brewer',
    description: 'Completed 100+ face-offs',
    emoji:       '⚡',
    xp_reward:   25,
  },
  taste_maker: {
    slug:        'taste_maker',
    name:        'Taste Maker',
    description: 'Your shelf has been followed by 10+ people',
    emoji:       '👑',
    xp_reward:   50,
  },
  explorer: {
    slug:        'explorer',
    name:        'Explorer',
    description: 'Rated 3+ cafés on the map',
    emoji:       '🗺️',
    xp_reward:   25,
  },
  category_king: {
    slug:        'category_king',
    name:        'Category King',
    description: 'Ranked #1 on a city leaderboard',
    emoji:       '🏆',
    xp_reward:   100,
  },
  evangelist: {
    slug:        'evangelist',
    name:        'Evangelist',
    description: 'Referred 5+ friends who signed up',
    emoji:       '📣',
    xp_reward:   50,
  },
  lab_rat: {
    slug:        'lab_rat',
    name:        'Lab Rat',
    description: 'Tried a brand before it had 10 total reviews',
    emoji:       '🧪',
    xp_reward:   25,
  },
}

// ─── Categories (seed data — mirrors DB) ──────────────────────────────────────

export const SEED_CATEGORIES = [
  { slug: 'coffee',      name: 'Coffee',      emoji: '☕', description: 'D2C coffee brands, roasters & blends' },
  { slug: 'tea',         name: 'Tea',         
