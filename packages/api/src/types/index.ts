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
  // Manga/Webtoon specific
  author_name?: string
  artist_name?: string
  default_reading_mode?: 'paged' | 'vertical' | 'double'
  default_reading_direction?: 'ltr' | 'rtl'
  total_chapters?: number
  total_volumes?: number
  color_type?: 'full_color' | 'black_white' | 'mixed'
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
  page_metadata?: string
  volume_number?: number
  chapter_type?: 'regular' | 'special' | 'bonus' | 'omake' | 'oneshot' | 'preview'
  is_long_strip?: boolean
  reading_direction?: 'ltr' | 'rtl'
  estimated_read_time?: number
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

// New interfaces for manga/webtoon
export interface ReadingProgress {
  id: string
  user_id: string
  series_id?: string
  episode_id: string
  current_page: number
  total_pages?: number
  scroll_position?: number
  reading_time_seconds: number
  is_completed: boolean
  completion_percentage?: number
  last_read_at: string
}

export interface ChapterPage {
  id: string
  episode_id: string
  page_number: number
  original_url: string
  mobile_url?: string
  thumbnail_url?: string
  width?: number
  height?: number
  file_size?: number
  is_double_spread: boolean
  is_color: boolean
  upload_status: 'uploading' | 'processing' | 'complete' | 'failed'
}