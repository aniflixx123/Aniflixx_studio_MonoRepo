-- ============================================
-- ANIFLIXX STUDIO PLATFORM - COMPLETE SCHEMA
-- ============================================
-- Version: 1.0.1 (Fixed for SQLite/D1)
-- Description: Complete database schema for studio content management platform
-- ============================================

-- ============================================
-- CORE STUDIO & CONTENT TABLES
-- ============================================

-- Studios/Organizations table
CREATE TABLE IF NOT EXISTS studios (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'growth', 'pro', 'enterprise')),
  
  -- Limits & Quotas
  max_users INTEGER DEFAULT 5,
  max_series INTEGER DEFAULT 10,
  max_episodes INTEGER DEFAULT 100,
  max_storage_gb INTEGER DEFAULT 100,
  max_bandwidth_gb INTEGER DEFAULT 1000,
  used_storage_gb REAL DEFAULT 0,
  used_bandwidth_gb REAL DEFAULT 0,
  
  -- Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  trial_ends_at DATETIME,
  
  -- Customization
  custom_domain TEXT,
  watermark_url TEXT,
  brand_color TEXT,
  logo_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  is_verified BOOLEAN DEFAULT 0,
  suspended_at DATETIME,
  suspension_reason TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Series/Shows table
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  studio_id TEXT NOT NULL,
  
  -- Titles
  title TEXT NOT NULL,
  title_english TEXT,
  title_japanese TEXT,
  title_romanized TEXT,
  slug TEXT UNIQUE,
  
  -- Basic Info
  type TEXT NOT NULL CHECK(type IN ('anime', 'manga', 'webtoon', 'light_novel')),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'completed', 'hiatus', 'cancelled', 'archived')),
  
  -- Descriptions
  description TEXT,
  synopsis_short TEXT,
  tagline TEXT,
  
  -- Media
  cover_image TEXT,
  banner_image TEXT,
  thumbnail_image TEXT,
  logo_image TEXT,
  trailer_url TEXT,
  
  -- Categorization
  genres TEXT, -- JSON array
  tags TEXT, -- JSON array
  themes TEXT, -- JSON array
  content_rating TEXT CHECK(content_rating IN ('G', 'PG', 'PG-13', 'R', 'NC-17')),
  target_audience TEXT CHECK(target_audience IN ('kids', 'shounen', 'shoujo', 'seinen', 'josei', 'general')),
  
  -- Release Info
  release_year INTEGER,
  release_season TEXT CHECK(release_season IN ('winter', 'spring', 'summer', 'fall')),
  release_date DATE,
  completion_date DATE,
  
  -- Production Info
  source_material TEXT,
  studio_name TEXT,
  director TEXT,
  producer TEXT,
  licensor TEXT,
  
  -- Episode Info
  total_episodes INTEGER,
  aired_episodes INTEGER DEFAULT 0,
  episode_duration INTEGER, -- in minutes
  
  -- Schedule
  release_schedule TEXT CHECK(release_schedule IN ('daily', 'weekly', 'biweekly', 'monthly', 'irregular', 'completed')),
  release_day TEXT CHECK(release_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  release_time TIME,
  release_timezone TEXT DEFAULT 'UTC',
  next_episode_at DATETIME,
  
  -- Monetization
  is_premium BOOLEAN DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  is_exclusive BOOLEAN DEFAULT 0,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  rating_average REAL,
  rating_count INTEGER DEFAULT 0,
  
  -- External IDs
  mal_id TEXT,
  anilist_id TEXT,
  kitsu_id TEXT,
  tmdb_id TEXT,
  imdb_id TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  completed_at DATETIME,
  deleted_at DATETIME,
  
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
);

-- Seasons/Volumes table
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  
  -- Info
  title TEXT,
  title_english TEXT,
  title_japanese TEXT,
  description TEXT,
  
  -- Media
  cover_image TEXT,
  banner_image TEXT,
  trailer_url TEXT,
  
  -- Episodes
  total_episodes INTEGER,
  aired_episodes INTEGER DEFAULT 0,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  UNIQUE(series_id, season_number)
);

-- Episodes/Chapters table
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT NOT NULL,
  season_id TEXT,
  
  -- Numbering
  episode_number INTEGER NOT NULL,
  episode_number_absolute INTEGER,
  
  -- Titles
  title TEXT NOT NULL,
  title_english TEXT,
  title_japanese TEXT,
  title_romanized TEXT,
  
  -- Content
  description TEXT,
  synopsis TEXT,
  
  -- Media Files
  video_path TEXT, -- For anime: video file, For manga: JSON array of image paths
  video_quality TEXT DEFAULT '1080p',
  video_codec TEXT,
  audio_codec TEXT,
  file_size INTEGER,
  file_hash TEXT, -- For integrity check
  
  -- Alternate Versions
  has_dub BOOLEAN DEFAULT 0,
  has_sub BOOLEAN DEFAULT 1,
  
  -- Media Metadata
  duration INTEGER, -- in seconds
  aspect_ratio TEXT,
  resolution TEXT,
  framerate REAL,
  bitrate INTEGER,
  
  -- Thumbnails
  thumbnail TEXT,
  thumbnails TEXT, -- JSON array for multiple thumbnails
  preview_images TEXT, -- JSON array
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'processing', 'scheduled', 'published', 'hidden', 'archived')),
  processing_status TEXT CHECK(processing_status IN ('pending', 'transcoding', 'uploading', 'complete', 'failed')),
  
  -- Flags
  is_filler BOOLEAN DEFAULT 0,
  is_recap BOOLEAN DEFAULT 0,
  is_special BOOLEAN DEFAULT 0,
  is_movie BOOLEAN DEFAULT 0,
  is_ova BOOLEAN DEFAULT 0,
  is_ona BOOLEAN DEFAULT 0,
  
  -- Monetization
  is_premium BOOLEAN DEFAULT 0,
  is_early_access BOOLEAN DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT 0,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  completion_rate REAL,
  average_watch_time INTEGER,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Publishing
  scheduled_at DATETIME,
  published_at DATETIME,
  available_until DATETIME,
  embargo_until DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL,
  UNIQUE(series_id, episode_number)
);

-- ============================================
-- TEAM & PERMISSIONS TABLES
-- ============================================

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  studio_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  
  -- Role & Permissions
  role TEXT DEFAULT 'viewer' CHECK(role IN ('owner', 'admin', 'editor', 'uploader', 'viewer')),
  permissions TEXT, -- JSON array of specific permissions
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  joined_at DATETIME,
  last_active_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
  UNIQUE(studio_id, user_id)
);

-- ============================================
-- REGIONAL & DISTRIBUTION TABLES
-- ============================================

-- Regional availability (unified approach)
CREATE TABLE IF NOT EXISTS regional_availability (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT,
  episode_id TEXT,
  
  -- Region
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2
  region_group TEXT, -- 'NA', 'EU', 'ASIA', 'LATAM', etc.
  
  -- Availability
  is_available BOOLEAN DEFAULT 1,
  available_from DATETIME,
  available_until DATETIME,
  
  -- Licensing
  license_holder TEXT,
  license_expires_at DATETIME,
  license_notes TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Create a unique index to handle the constraint without COALESCE
CREATE UNIQUE INDEX idx_regional_availability_unique 
ON regional_availability(series_id, episode_id, country_code);

-- ============================================
-- PUBLISHING & SCHEDULING TABLES
-- ============================================

-- Publishing queue
CREATE TABLE IF NOT EXISTS publish_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  
  -- Action
  action TEXT CHECK(action IN ('publish', 'unpublish', 'update', 'process')),
  
  -- Schedule
  scheduled_at DATETIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Processing
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Results
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  error_details TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  cancelled_at DATETIME,
  cancelled_by TEXT,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Release schedules
CREATE TABLE IF NOT EXISTS release_schedules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT NOT NULL,
  
  -- Schedule Type
  schedule_type TEXT CHECK(schedule_type IN ('weekly', 'daily', 'batch', 'custom', 'simulcast')),
  
  -- Timing
  release_day TEXT,
  release_time TIME,
  timezone TEXT DEFAULT 'UTC',
  
  -- Batch Settings
  episodes_per_release INTEGER DEFAULT 1,
  batch_interval_days INTEGER,
  
  -- Duration
  start_date DATE,
  end_date DATE,
  
  -- Simulcast Settings
  simulcast_delay_hours INTEGER,
  simulcast_regions TEXT, -- JSON array
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- ============================================
-- MONETIZATION TABLES
-- ============================================

-- Content monetization settings
CREATE TABLE IF NOT EXISTS content_monetization (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT,
  episode_id TEXT,
  
  -- Type
  monetization_type TEXT CHECK(monetization_type IN ('free', 'premium', 'freemium', 'pay_per_view', 'rental')),
  
  -- Access Levels
  is_free BOOLEAN DEFAULT 0,
  is_premium BOOLEAN DEFAULT 1,
  free_with_ads BOOLEAN DEFAULT 0,
  
  -- Early Access
  early_access_enabled BOOLEAN DEFAULT 0,
  early_access_hours INTEGER DEFAULT 0,
  early_access_tier TEXT, -- 'vip', 'premium'
  
  -- Preview Settings
  preview_enabled BOOLEAN DEFAULT 0,
  preview_duration INTEGER, -- seconds
  preview_type TEXT CHECK(preview_type IN ('time_limited', 'episode_limited', 'quality_limited')),
  
  -- Pricing
  rental_price DECIMAL(10,2),
  rental_duration_hours INTEGER DEFAULT 48,
  purchase_price DECIMAL(10,2),
  
  -- Ad Settings
  ad_breaks_enabled BOOLEAN DEFAULT 0,
  ad_break_positions TEXT, -- JSON array of timestamps
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Release windows by tier
CREATE TABLE IF NOT EXISTS release_windows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT,
  episode_id TEXT,
  
  -- User Tier
  user_tier TEXT CHECK(user_tier IN ('free', 'registered', 'basic', 'premium', 'vip')),
  
  -- Window
  available_from DATETIME,
  available_until DATETIME,
  delay_hours INTEGER DEFAULT 0,
  
  -- Permissions
  can_download BOOLEAN DEFAULT 0,
  can_offline BOOLEAN DEFAULT 0,
  max_quality TEXT DEFAULT '1080p',
  max_concurrent_streams INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ============================================
-- CONTENT METADATA TABLES
-- ============================================

-- Multiple versions per episode
CREATE TABLE IF NOT EXISTS episode_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  
  -- Version Info
  version_name TEXT,
  version_type TEXT CHECK(version_type IN ('tv', 'uncut', 'directors_cut', 'theatrical', 'extended', 'censored', 'uncensored')),
  
  -- File Info
  file_path TEXT,
  file_size INTEGER,
  file_hash TEXT,
  
  -- Quality
  video_quality TEXT,
  video_codec TEXT,
  audio_codec TEXT,
  
  -- Metadata
  duration INTEGER,
  has_hdr BOOLEAN DEFAULT 0,
  has_dolby_audio BOOLEAN DEFAULT 0,
  
  -- Status
  is_default BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Language tracks
CREATE TABLE IF NOT EXISTS content_languages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  
  -- Language
  language_code TEXT NOT NULL, -- ISO 639-1
  language_name TEXT,
  
  -- Type
  track_type TEXT CHECK(track_type IN ('audio', 'subtitle', 'caption', 'sign')),
  
  -- File
  file_path TEXT,
  file_format TEXT, -- 'vtt', 'srt', 'ass'
  
  -- Flags
  is_primary BOOLEAN DEFAULT 0,
  is_forced BOOLEAN DEFAULT 0,
  is_sdh BOOLEAN DEFAULT 0, -- Subtitles for Deaf/Hard of hearing
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(episode_id, language_code, track_type)
);

-- Content warnings
CREATE TABLE IF NOT EXISTS content_warnings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT,
  episode_id TEXT,
  
  -- Warning
  warning_type TEXT CHECK(warning_type IN (
    'violence', 'gore', 'language', 'nudity', 'sexual_content',
    'drugs', 'alcohol', 'smoking', 'gambling', 'horror',
    'self_harm', 'flashing_lights', 'spoilers', 'disturbing'
  )),
  severity TEXT CHECK(severity IN ('mild', 'moderate', 'severe')),
  
  -- Details
  description TEXT,
  
  -- Timing (for episodes)
  timestamp_start INTEGER,
  timestamp_end INTEGER,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Content relationships
CREATE TABLE IF NOT EXISTS content_relationships (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source_series_id TEXT NOT NULL,
  target_series_id TEXT NOT NULL,
  
  -- Relationship
  relationship_type TEXT CHECK(relationship_type IN (
    'sequel', 'prequel', 'side_story', 'spin_off',
    'adaptation', 'alternative', 'crossover', 'related',
    'parent', 'summary', 'full_version'
  )),
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (source_series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (target_series_id) REFERENCES series(id) ON DELETE CASCADE,
  UNIQUE(source_series_id, target_series_id, relationship_type)
);

-- ============================================
-- PARTNER & DISTRIBUTION TABLES
-- ============================================

-- Partner organizations
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  
  -- Info
  partner_name TEXT NOT NULL,
  partner_code TEXT UNIQUE,
  partner_type TEXT CHECK(partner_type IN ('distributor', 'platform', 'broadcaster', 'sponsor', 'aggregator')),
  
  -- API Access
  api_key TEXT UNIQUE,
  api_secret_hash TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Contact
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Settings
  auto_publish BOOLEAN DEFAULT 0,
  require_approval BOOLEAN DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT 1,
  is_verified BOOLEAN DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_sync_at DATETIME
);

-- Partner content access
CREATE TABLE IF NOT EXISTS partner_access (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL,
  series_id TEXT,
  studio_id TEXT,
  
  -- Access Type
  access_type TEXT CHECK(access_type IN ('stream', 'download', 'embed', 'api', 'metadata')),
  access_level TEXT CHECK(access_level IN ('read', 'write', 'admin')),
  
  -- Territories
  territories TEXT, -- JSON array of country codes
  territory_exclusions TEXT, -- JSON array
  
  -- Duration
  valid_from DATETIME,
  valid_until DATETIME,
  
  -- Commercial Terms
  revenue_share DECIMAL(5,2),
  minimum_guarantee DECIMAL(10,2),
  payment_terms TEXT,
  
  -- Delivery
  delivery_format TEXT, -- JSON object
  delivery_schedule TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  approved_by TEXT,
  
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
);

-- ============================================
-- SECURITY & AUDIT TABLES
-- ============================================

-- Comprehensive audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  
  -- Actor
  studio_id TEXT,
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  
  -- Action
  action TEXT NOT NULL,
  action_category TEXT, -- 'content', 'settings', 'team', 'billing'
  
  -- Target
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  
  -- Changes
  changes TEXT, -- JSON diff
  previous_values TEXT, -- JSON
  new_values TEXT, -- JSON
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  session_id TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL
);

-- Emergency takedowns
CREATE TABLE IF NOT EXISTS takedowns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT,
  episode_id TEXT,
  
  -- Reason
  reason TEXT CHECK(reason IN ('dmca', 'legal', 'policy', 'quality', 'mistake', 'request')),
  reason_details TEXT,
  
  -- Request
  requested_by TEXT,
  requester_email TEXT,
  request_reference TEXT,
  
  -- Approval
  reviewed_by TEXT,
  review_notes TEXT,
  
  -- Action
  action_taken TEXT CHECK(action_taken IN ('removed', 'hidden', 'geo_blocked', 'rejected')),
  affected_regions TEXT, -- JSON array
  
  -- Duration
  is_permanent BOOLEAN DEFAULT 0,
  effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  effective_until DATETIME,
  
  -- Restoration
  restored_at DATETIME,
  restored_by TEXT,
  restoration_reason TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ============================================
-- ANALYTICS TABLES (BASIC)
-- ============================================

-- Daily analytics aggregation
CREATE TABLE IF NOT EXISTS analytics_daily (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date DATE NOT NULL,
  studio_id TEXT NOT NULL,
  series_id TEXT,
  episode_id TEXT,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  watch_time_minutes INTEGER DEFAULT 0,
  completion_rate REAL,
  engagement_rate REAL,
  
  -- Device breakdown
  mobile_views INTEGER DEFAULT 0,
  desktop_views INTEGER DEFAULT 0,
  tv_views INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
  UNIQUE(date, studio_id, series_id, episode_id)
);

-- Geographic analytics
CREATE TABLE IF NOT EXISTS analytics_geographic (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date DATE NOT NULL,
  episode_id TEXT NOT NULL,
  country_code TEXT NOT NULL,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  completion_rate REAL,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(date, episode_id, country_code)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Studios indexes
CREATE INDEX idx_studios_clerk_org ON studios(clerk_org_id);
CREATE INDEX idx_studios_slug ON studios(slug);
CREATE INDEX idx_studios_active ON studios(is_active);

-- Series indexes
CREATE INDEX idx_series_studio ON series(studio_id);
CREATE INDEX idx_series_slug ON series(slug);
CREATE INDEX idx_series_status ON series(status);
CREATE INDEX idx_series_type ON series(type);
CREATE INDEX idx_series_published ON series(published_at);

-- Episodes indexes
CREATE INDEX idx_episodes_series ON episodes(series_id);
CREATE INDEX idx_episodes_season ON episodes(season_id);
CREATE INDEX idx_episodes_status ON episodes(status);
CREATE INDEX idx_episodes_scheduled ON episodes(scheduled_at);
CREATE INDEX idx_episodes_published ON episodes(published_at);

-- Team indexes
CREATE INDEX idx_team_studio ON team_members(studio_id);
CREATE INDEX idx_team_user ON team_members(user_id);

-- Regional indexes
CREATE INDEX idx_regional_series ON regional_availability(series_id);
CREATE INDEX idx_regional_episode ON regional_availability(episode_id);
CREATE INDEX idx_regional_country ON regional_availability(country_code);

-- Publishing indexes
CREATE INDEX idx_publish_queue_status ON publish_queue(status);
CREATE INDEX idx_publish_queue_scheduled ON publish_queue(scheduled_at);
CREATE INDEX idx_publish_queue_episode ON publish_queue(episode_id);

-- Audit indexes
CREATE INDEX idx_audit_studio ON audit_logs(studio_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Analytics indexes
CREATE INDEX idx_analytics_date ON analytics_daily(date);
CREATE INDEX idx_analytics_studio ON analytics_daily(studio_id);
CREATE INDEX idx_analytics_series ON analytics_daily(series_id);
CREATE INDEX idx_analytics_episode ON analytics_daily(episode_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Studios
CREATE TRIGGER update_studios_updated_at 
  AFTER UPDATE ON studios
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE studios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Series
CREATE TRIGGER update_series_updated_at 
  AFTER UPDATE ON series
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE series SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Episodes
CREATE TRIGGER update_episodes_updated_at 
  AFTER UPDATE ON episodes
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE episodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Published content view
CREATE VIEW IF NOT EXISTS published_content AS
SELECT 
  s.id as series_id,
  s.title as series_title,
  s.type,
  e.id as episode_id,
  e.episode_number,
  e.title as episode_title,
  e.published_at,
  e.view_count
FROM series s
JOIN episodes e ON s.id = e.series_id
WHERE s.status = 'published' 
  AND e.status = 'published'
  AND s.deleted_at IS NULL
  AND e.deleted_at IS NULL;

-- Scheduled releases view
CREATE VIEW IF NOT EXISTS scheduled_releases AS
SELECT 
  pq.id,
  s.title as series_title,
  e.episode_number,
  e.title as episode_title,
  pq.scheduled_at,
  pq.status
FROM publish_queue pq
JOIN episodes e ON pq.episode_id = e.id
JOIN series s ON e.series_id = s.id
WHERE pq.status = 'pending'
  AND pq.scheduled_at > datetime('now')
ORDER BY pq.scheduled_at ASC;

-- Studio stats view
CREATE VIEW IF NOT EXISTS studio_stats AS
SELECT 
  st.id,
  st.name,
  COUNT(DISTINCT s.id) as total_series,
  COUNT(DISTINCT e.id) as total_episodes,
  SUM(e.view_count) as total_views,
  st.used_storage_gb,
  st.used_bandwidth_gb,
  st.tier
FROM studios st
LEFT JOIN series s ON st.id = s.studio_id
LEFT JOIN episodes e ON s.id = e.series_id
WHERE st.deleted_at IS NULL
GROUP BY st.id;

-- ============================================
-- END OF SCHEMA
-- ============================================