import { D1Database, R2Bucket } from '@cloudflare/workers-types'

export interface Bindings {
  DB: D1Database
  CONTENT: R2Bucket
  CLERK_SECRET_KEY: string
  // Add other environment variables as needed
}

export interface Studio {
  id: string
  clerk_org_id: string
  name: string
  slug: string
  tier: 'free' | 'growth' | 'pro' | 'enterprise'
  max_users: number
  max_series: number
  max_episodes: number
  max_storage_gb: number
  max_bandwidth_gb: number
  used_storage_gb: number
  used_bandwidth_gb: number
  created_at: string
  updated_at: string
}

export interface Series {
  id: string
  studio_id: string
  title: string
  title_english?: string
  title_japanese?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: 'draft' | 'published' | 'completed' | 'hiatus' | 'cancelled' | 'archived'
  description?: string
  genres?: string[]
  tags?: string[]
  total_episodes?: number
  aired_episodes?: number
  created_at: string
  updated_at: string
}

export interface Episode {
  id: string
  series_id: string
  season_id?: string
  episode_number: number
  title: string
  description?: string
  video_path?: string
  page_count?: number
  status: 'draft' | 'processing' | 'scheduled' | 'published' | 'hidden' | 'archived'
  is_premium: boolean
  is_early_access: boolean
  scheduled_at?: string
  published_at?: string
  created_at: string
  updated_at: string
}

export interface PageMetadata {
  number: number
  original: string
  mobile: string
  thumbnail: string
  width?: number
  height?: number
  size?: number
}

export interface ChapterData {
  page_count: number
  pages: PageMetadata[]
}