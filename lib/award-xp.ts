import type { SupabaseClient } from '@supabase/supabase-js'

const XP_LEVELS = [
  { key: 'legend',         min: 1500 },
  { key: 'master_roaster', min: 700  },
  { key: 'roast',          min: 300  },
  { key: 'brew',           min: 100  },
  { key: 'sip',            min: 0    },
] as const

function levelFromXP(xp: number): string {
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.min) return lvl.key
  }
  return 'sip'
}

type BadgeCheck = {
  slug: string
  xpReward: number
  condition: boolean
}

// Central function: award XP, update level, check + award badges atomically.
// Safe to call from any API route — idempotent badge inserts via ignoreDuplicates.
export async function awardXP(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any,
  userId: string,
  xpAmount: number,
  badgeChecks: BadgeCheck[] = []
): Promise<{ newXP: number; newLevel: string; badgesUnlocked: string[] }> {
  // Fetch current profile XP
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single()

  const currentXP = (profile?.xp ?? 0) as number
  let totalXP = currentXP + xpAmount

  // Check which badges to award
  const badgesUnlocked: string[] = []
  const newBadgeRows: { user_id: string; badge_slug: string }[] = []

  if (badgeChecks.length > 0) {
    // Fetch already-earned badges to avoid double-awarding
    const { data: existingBadges } = await supabase
      .from('user_badges')
      .select('badge_slug')
      .eq('user_id', userId)

    const alreadyEarned = new Set(
      ((existingBadges ?? []) as { badge_slug: string }[]).map((b) => b.badge_slug)
    )

    for (const check of badgeChecks) {
      if (check.condition && !alreadyEarned.has(check.slug)) {
        badgesUnlocked.push(check.slug)
        newBadgeRows.push({ user_id: userId, badge_slug: check.slug })
        totalXP += check.xpReward
      }
    }
  }

  const newLevel = levelFromXP(totalXP)

  // Write XP + level back to profile
  await supabase
    .from('profiles')
    .update({ xp: totalXP, level: newLevel })
    .eq('id', userId)

  // Insert new badges (ignore duplicates as safety net)
  if (newBadgeRows.length > 0) {
    await supabase
      .from('user_badges')
      .insert(newBadgeRows, { ignoreDuplicates: true })
  }

  return { newXP: totalXP, newLevel, badgesUnlocked }
}
