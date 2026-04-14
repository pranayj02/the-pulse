// ─── Categories ───────────────────────────────────────────────────────────────

export type Category = {
  id: string
  name: string
  slug: string
  emoji: string
  description: string
  is_active: boolean
  created_at: string
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export type Brand = {
  id: string
  category_id: string
  name: string
  slug: string
  logo_url: string | null
  tagline: string | null
  description: string | null
  price_range: 'budget' | 'mid' | 'premium' | 'luxury'
  origin_city: string | null
  origin_country: string
  website_url: string | null
  is_active: boolean
  created_at: string
}

// ─── Users / Profiles ─────────────────────────────────────────────────────────

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
  xp: number
  level: XPLevel
  is_early_bird: boolean
  is_pioneer: boolean
  created_at: string
}

export type XPLevel =
  | 'sip'
  | 'brew'
  | 'roast'
  | 'master_roaster'
  | 'legend'

// ─── Comparisons / Face-offs ───────────────────────────────────────────────────

export type Comparison = {
  id: string
  user_id: string
  category_id: string
  // Brand-based (may be null for unmatched cafes)
  brand_a_id: string | null
  brand_b_id: string | null
  winner_id: string | null
  // Cafe-based (primary for location-level comparisons)
  cafe_a_id: string | null
  cafe_b_id: string | null
  winner_cafe_id: string | null
  created_at: string
}

// ─── Shelf Items ──────────────────────────────────────────────────────────────

export type ShelfItem = {
  id: string
  user_id: string
  // cafe_id is the primary rankable entity — each location gets its own slot
  cafe_id: string
  // brand_id is enrichment only — null for unmatched cafes
  brand_id: string | null
  category_id: string
  display_name: string | null  // e.g. "Subko · Bandra West"
  rank: number
  score: number                // Elo — computed from comparisons
  comparisons_count: number
  quick_review: string | null
  tried_at: string | null
  created_at: string
  // joined
  cafe?: Cafe
  brand?: Brand | null
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export type BadgeSlug =
  | 'first_sip'
  | 'early_bird'
  | 'pioneer'
  | 'power_brewer'
  | 'taste_maker'
  | 'explorer'
  | 'category_king'
  | 'evangelist'
  | 'lab_rat'

export type Badge = {
  slug: BadgeSlug
  name: string
  description: string
  emoji: string
  xp_reward: number
}

export type UserBadge = {
  id: string
  user_id: string
  badge_slug: BadgeSlug
  earned_at: string
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number
  user_id: string
  profile: Profile
  score: number
  comparison_count: number
  badge_count: number
}

export type LeaderboardType =
  | 'most_faceoffs'
  | 'most_followed'
  | 'most_discoveries'

// ─── Cafes / Map ──────────────────────────────────────────────────────────────

export type Cafe = {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  city: string
  lat: number
  lng: number
  cover_image_url: string | null
  website_url: string | null
  instagram_url: string | null
  is_verified: boolean
  is_active: boolean
  created_at: string
  brands?: Brand[]
}

export type CafeVisit = {
  id: string
  user_id: string
  cafe_id: string
  visited_at: string
  note: string | null
  created_at: string
  cafe?: Cafe
}
