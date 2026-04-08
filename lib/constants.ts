import type { Badge, BadgeSlug, XPLevel } from './types'

// ─── XP Thresholds ────────────────────────────────────────────────────────────

export const XP_LEVELS: Record<XPLevel, { label: string; min: number; emoji: string }> = {
  sip:            { label: 'Sip',            min: 0,    emoji: '☕' },
  brew:           { label: 'Brew',           min: 100,  emoji: '🫖' },
  roast:          { label: 'Roast',          min: 300,  emoji: '🔥' },
  master_roaster: { label: 'Master Roaster', min: 700,  emoji: '👑' },
  legend:         { label: 'Legend',         min: 1500, emoji: '⚡' },
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
  faceoff:      2,
  cafe_review:  5,
  badge_unlock: 25,
  referral:     50,
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

// ─── Brand seed type ──────────────────────────────────────────────────────────

type SeedBrand = {
  name: string
  tagline: string
  price_range: 'budget' | 'mid' | 'premium' | 'luxury'
  origin_city: string
}

// ─── Brands by category ───────────────────────────────────────────────────────

const COFFEE_BRANDS: SeedBrand[] = [
  { name: 'Blue Tokai',         tagline: 'Single origin, transparently sourced',     price_range: 'premium', origin_city: 'Delhi'      },
  { name: 'Araku Coffee',       tagline: 'Tribal grown, award-winning',              price_range: 'premium', origin_city: 'Hyderabad'  },
  { name: 'Sleepy Owl',         tagline: 'Cold brew made easy',                      price_range: 'mid',     origin_city: 'Delhi'      },
  { name: 'Kaffa Cerrado',      tagline: 'Brazilian craft, Indian roast',            price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Black Baza',         tagline: 'Forest-grown, wildlife-friendly',          price_range: 'premium', origin_city: 'Bangalore'  },
  { name: 'Curious Life',       tagline: 'Specialty roasts for curious minds',       price_range: 'premium', origin_city: 'Mumbai'     },
  { name: 'Corridor Seven',     tagline: 'The specialty coffee pioneers',            price_range: 'premium', origin_city: 'Pune'       },
  { name: 'Seven Beans',        tagline: 'Farm to cup from Coorg',                   price_range: 'mid',     origin_city: 'Bangalore'  },
  { name: 'KC Roasters',        tagline: "Mumbai's original specialty roaster",      price_range: 'premium', origin_city: 'Mumbai'     },
  { name: 'Naivo Coffee',       tagline: 'Madagascar single origin',                 price_range: 'luxury',  origin_city: 'Bangalore'  },
  { name: 'Roastery Coffee',    tagline: 'Roasted to order, shipped fresh',          price_range: 'mid',     origin_city: 'Hyderabad'  },
  { name: 'Flying Squirrel',    tagline: 'Coorg estates, direct trade',              price_range: 'mid',     origin_city: 'Bangalore'  },
]

const TEA_BRANDS: SeedBrand[] = [
  { name: 'Teabox',             tagline: 'Fresh from garden to cup',                 price_range: 'premium', origin_city: 'Darjeeling' },
  { name: 'Vahdam',             tagline: 'India-first, farm-direct teas',            price_range: 'mid',     origin_city: 'Delhi'      },
  { name: 'Chaayos',            tagline: 'Meri wali chai',                           price_range: 'mid',     origin_city: 'Delhi'      },
  { name: 'The Tea Shelf',      tagline: 'Rare estate teas, curated',                price_range: 'premium', origin_city: 'Kolkata'    },
  { name: 'Rare Planet',        tagline: 'Single estate, nothing else',              price_range: 'premium', origin_city: 'Assam'      },
  { name: 'Teamonk',            tagline: 'Pure teas from the Himalayas',             price_range: 'mid',     origin_city: 'Bangalore'  },
  { name: 'Ikigai Tea',         tagline: 'Japanese-inspired, India-grown',           price_range: 'luxury',  origin_city: 'Bangalore'  },
  { name: 'Anandini Himalaya',  tagline: 'Handcrafted small-batch mountain teas',    price_range: 'luxury',  origin_city: 'Delhi'      },
]

const SKINCARE_BRANDS: SeedBrand[] = [
  { name: 'Minimalist',         tagline: 'Science-backed, no fluff',                 price_range: 'budget',  origin_city: 'Jaipur'     },
  { name: 'Dot & Key',          tagline: 'Skin solutions that actually work',        price_range: 'mid',     origin_city: 'Kolkata'    },
  { name: 'Plum',               tagline: 'Good science, good ethics',                price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Juicy Chemistry',    tagline: 'Certified organic, nothing hidden',        price_range: 'premium', origin_city: 'Coimbatore' },
  { name: 'Foxtale',            tagline: 'Clinically tested, honestly priced',       price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Earth Rhythm',       tagline: 'Green beauty without compromise',          price_range: 'mid',     origin_city: 'Chandigarh' },
  { name: 'Pilgrim',            tagline: 'World-inspired beauty rituals',            price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Arata',              tagline: 'Zero toxin, full performance',             price_range: 'premium', origin_city: 'Mumbai'     },
]

const SUPPLEMENT_BRANDS: SeedBrand[] = [
  { name: 'The Whole Truth',    tagline: 'No fillers. No lies. Just food.',          price_range: 'premium', origin_city: 'Mumbai'     },
  { name: 'Wellbeing Nutrition',tagline: 'Science meets nature',                     price_range: 'premium', origin_city: 'Mumbai'     },
  { name: 'Oziva',              tagline: 'Clean, plant-based nutrition',             price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Fast&Up',            tagline: 'Effervescent nutrition, Swiss origin',     price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Boldfit',            tagline: 'Bold choices for bold results',            price_range: 'budget',  origin_city: 'Delhi'      },
  { name: 'Himalayan Organics', tagline: 'Plant-based, certified organic',           price_range: 'mid',     origin_city: 'Dehradun'   },
  { name: 'Kapiva',             tagline: 'Ayurveda meets modern science',            price_range: 'mid',     origin_city: 'Bangalore'  },
  { name: 'Carbamide Forte',    tagline: 'Clinically dosed, no proprietary blends', price_range: 'budget',  origin_city: 'Delhi'      },
]

const CHOCOLATE_BRANDS: SeedBrand[] = [
  { name: 'Mason & Co',         tagline: "India's original craft chocolate",         price_range: 'premium', origin_city: 'Auroville'  },
  { name: 'Paul and Mike',      tagline: 'Bean to bar with an attitude',             price_range: 'premium', origin_city: 'Pune'       },
  { name: 'Soklet',             tagline: 'Tamil Nadu cacao, world-class craft',      price_range: 'premium', origin_city: 'Coimbatore' },
  { name: 'Naviluna',           tagline: 'Single origin, solar-dried',              price_range: 'luxury',  origin_city: 'Bangalore'  },
  { name: 'Pascati',            tagline: 'Organic, Fairtrade, bean to bar',         price_range: 'premium', origin_city: 'Mumbai'     },
  { name: 'Kocoatrait',         tagline: 'Zero waste, tree to bar',                 price_range: 'premium', origin_city: 'Chennai'    },
  { name: 'Fantasie',           tagline: 'Artisan chocolates since 1991',           price_range: 'mid',     origin_city: 'Mumbai'     },
  { name: 'Manam Chocolate',    tagline: 'Hyderabad cacao, handcrafted',            price_range: 'mid',     origin_city: 'Hyderabad'  },
]

// ─── Master brand map ─────────────────────────────────────────────────────────

export const SEED_BRANDS_BY_CATEGORY: Record<string, SeedBrand[]> = {
  coffee:      COFFEE_BRANDS,
  tea:         TEA_BRANDS,
  skincare:    SKINCARE_BRANDS,
  supplements: SUPPLEMENT_BRANDS,
  chocolate:   CHOCOLATE_BRANDS,
}

// ─── Convenience export for pilot category ────────────────────────────────────
// Pages currently import SEED_COFFEE_BRANDS directly during the coffee pilot.
// When going multi-category, replace with: SEED_BRANDS_BY_CATEGORY[activeCategory]

export const SEED_COFFEE_BRANDS = COFFEE_BRANDS

// ─── Categories (mirrors DB seed) ────────────────────────────────────────────

export const SEED_CATEGORIES = [
  { slug: 'coffee',      name: 'Coffee',      emoji: '☕', description: 'D2C coffee brands, roasters and blends'  },
  { slug: 'tea',         name: 'Tea',         emoji: '🍵', description: 'Specialty teas and modern tea brands'     },
  { slug: 'skincare',    name: 'Skincare',    emoji: '✨', description: 'D2C skincare and beauty brands'           },
  { slug: 'supplements', name: 'Supplements', emoji: '💊', description: 'Health and wellness supplements'          },
  { slug: 'chocolate',   name: 'Chocolate',   emoji: '🍫', description: 'Artisan and D2C chocolate brands'         },
] as const

// ─── Derived types ────────────────────────────────────────────────────────────

export type CategorySlug = (typeof SEED_CATEGORIES)[number]['slug']
export type PriceRange = SeedBrand['price_range']
