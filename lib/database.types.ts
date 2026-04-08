export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          city: string | null
          bio: string | null
          xp: number
          level: string
          is_early_bird: boolean
          is_pioneer: boolean
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          xp?: number
          level?: string
          is_early_bird?: boolean
          is_pioneer?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          xp?: number
          level?: string
          is_early_bird?: boolean
          is_pioneer?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          emoji: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          emoji: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          emoji?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      brands: {
        Row: {
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
        Insert: {
          id?: string
          category_id: string
          name: string
          slug: string
          logo_url?: string | null
          tagline?: string | null
          description?: string | null
          price_range: 'budget' | 'mid' | 'premium' | 'luxury'
          origin_city?: string | null
          origin_country?: string
          website_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          tagline?: string | null
          description?: string | null
          price_range?: 'budget' | 'mid' | 'premium' | 'luxury'
          origin_city?: string | null
          origin_country?: string
          website_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      comparisons: {
        Row: {
          id: string
          user_id: string
          category_id: string
          brand_a_id: string
          brand_b_id: string
          winner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          brand_a_id: string
          brand_b_id: string
          winner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          brand_a_id?: string
          brand_b_id?: string
          winner_id?: string
          created_at?: string
        }
      }
      shelf_items: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          category_id: string
          rank: number
          score: number
          quick_review: string | null
          tried_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          category_id: string
          rank?: number
          score?: number
          quick_review?: string | null
          tried_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_id?: string
          category_id?: string
          rank?: number
          score?: number
          quick_review?: string | null
          tried_at?: string | null
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_slug: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_slug: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_slug?: string
          earned_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      cafes: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          lat: number
          lng: number
          google_place_id: string | null
          avg_rating: number | null
          review_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          lat: number
          lng: number
          google_place_id?: string | null
          avg_rating?: number | null
          review_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          lat?: number
          lng?: number
          google_place_id?: string | null
          avg_rating?: number | null
          review_count?: number
          created_at?: string
        }
      }
      cafe_reviews: {
        Row: {
          id: string
          cafe_id: string
          user_id: string
          rating: number
          body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cafe_id: string
          user_id: string
          rating: number
          body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cafe_id?: string
          user_id?: string
          rating?: number
          body?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
