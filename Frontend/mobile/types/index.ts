// types/index.ts - Complete type definitions for Aniflixx
/**
 * Comprehensive TypeScript type definitions for the Aniflixx social media platform
 * 
 * This file contains all type definitions used throughout the application:
 * - User & Authentication types
 * - Reel & Media types
 * - Comment system types
 * - Notification types
 * - WebSocket event types
 * - Analytics & Engagement types
 * - API response types
 * - Navigation types
 * - Store state types
 * - Component prop types
 * 
 * @module types
 */

// ============================================
// User & Authentication Types
// ============================================

export interface User {
  _id?: string; // MongoDB ID (optional for compatibility)
  uid: string; // Firebase UID (required)
  username: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  displayName?: string;
  customStatus?: string;
  isVerified?: boolean;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  uploadedReels?: string[];
  savedReels?: string[];
  stats?: UserStats;
  preferences?: UserPreferences;
  isOnline?: boolean;
  lastSeen?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  cachedAt?: number; // For local cache management
}

export interface UserStats {
  totalReels: number;
  totalViews: number;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
}

export interface PrivacyPreferences {
  isPrivate: boolean;
  allowMessages: boolean;
}

export interface AuthTokens {
  idToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// ============================================
// Reel & Media Types
// ============================================

export interface StreamData {
  status?: {
    state: string;
    pctComplete?: number;
    errorReasonCode?: string;
  };
  playback?: {
    hls?: string;
    dash?: string;
  };
  playbackUrl?: string;
  thumbnailUrl?: string;
  animatedThumbnailUrl?: string;
  dashUrl?: string;
  previewUrl?: string;
  preview?: string;
  duration?: number;
  size?: number;
  width?: number;
  height?: number;
  created?: string;
  modified?: string;
}

export interface Reel {
  _id: string;
  uid: string;
  username: string;
  profileImage?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  mentions?: string[];
  
  // Video data
  videoUrl?: string;
  thumbnailUrl?: string;
  streamVideoId?: string;
  streamData?: StreamData;
  duration?: number;
  
  // Engagement data
  likes?: string[];
  likesCount: number;
  isLiked: boolean;
  saves?: string[];
  savesCount: number;
  isSaved: boolean;
  comments?: Comment[];
  commentsCount: number;
  viewers?: number;
  views?: number;
  
  // Status
  isActive?: boolean;
  status?: string;
  visibility?: string;
  
  // Timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // User info (populated)
  user?: {
    uid: string;
    username: string;
    profileImage?: string;
    isVerified?: boolean;
  };
  
  // Legacy/compatibility
  isCloudflareStream?: boolean;
}

// ============================================
// Comment Types
// ============================================

export interface Comment {
  _id: string;
  id: string;
  reelId: string;
  uid: string;
  text: string;
  parentCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUsername?: string | null;
  replies?: Comment[];
  replyCount?: number;
  likes?: string[];
  likeCount?: number;
  user: {
    uid: string;
    username: string;
    profileImage?: string;
    isVerified?: boolean;
  };
  isEdited?: boolean;
  editedAt?: Date | string | null;
  isDeleted?: boolean;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  
  // UI-specific fields (not stored in DB)
  isLiked?: boolean;
  showReplies?: boolean;
  
  // Legacy fields for compatibility
  timestamp?: string;
  username?: string;
  profileImage?: string;
  isVerified?: boolean;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'mention' 
  | 'reply' 
  | 'save' 
  | 'comment_like';

export interface NotificationEvent {
  type: NotificationType;
  from: {
    userId: string;
    username: string;
    profileImage?: string;
  };
  reelId?: string;
  reelTitle?: string;
  comment?: string;
  timestamp: Date;
}

export interface Notification {
  _id: string;
  type: NotificationType;
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderImage?: string;
  reelId?: string;
  reelTitle?: string;
  commentId?: string;
  comment?: string;
  message?: string;
  isRead: boolean;
  readAt?: Date | string;
  timestamp: Date | string;
  createdAt: Date | string;
  thumbnailUrl?: string;
}

// ============================================
// WebSocket Event Types
// ============================================

export interface LikeEvent {
  reelId: string;
  userId: string;
  username?: string;
  isLiked: boolean;
  totalLikes: number;
}

export interface SaveEvent {
  reelId: string;
  userId: string;
  isSaved: boolean;
  totalSaves: number;
}

export interface CommentEvent {
  reelId: string;
  comment: Comment;
  parentCommentId?: string | null;
  type: 'comment' | 'reply';
}

export interface CommentLikeEvent {
  reelId: string;
  commentId: string;
  userId: string;
  isLiked: boolean;
  likeCount: number;
  parentCommentId?: string | null;
}

export interface CommentEditEvent {
  reelId: string;
  commentId: string;
  text: string;
  editedAt: Date | string;
  parentCommentId?: string | null;
}

export interface CommentDeleteEvent {
  reelId: string;
  commentId: string;
  parentCommentId?: string | null;
}

export interface ViewersUpdateEvent {
  reelId: string;
  count: number;
  joined?: WebSocketUser;
  left?: WebSocketUser;
}

export interface TypingUsersEvent {
  reelId: string;
  users: Array<{
    uid: string;
    username: string;
  }>;
}

export interface WebSocketUser {
  userId: string;
  username: string;
  profileImage?: string;
}

export interface ProfileUpdateEvent {
  userId: string;
  updates: Partial<User>;
}

export interface ProfileStatsUpdateEvent {
  userId: string;
  followersCount?: number;
  followingCount?: number;
}

export interface FollowEvent {
  targetUserId: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface ProfileFollowerNewEvent {
  follower: {
    uid: string;
    username: string;
    profileImage?: string;
    isVerified?: boolean;
  };
  followersCount: number;
}

// ============================================
// Analytics & Engagement Types
// ============================================

export interface ViewerData {
  reelId: string;
  uid: string;
  timestamp: Date | string;
  viewDuration?: number;
  completed?: boolean;
  isAnalyticView?: boolean;
  userAgent?: string;
  platform?: string;
  active?: boolean;
  expiresAt?: Date | string;
}

export interface EngagementData {
  reelId: string;
  uid: string;
  type: 'view' | 'like' | 'comment' | 'share' | 'save' | 'complete';
  timestamp: Date | string;
  metadata?: any;
}

export interface AnalyticsData {
  type: string;
  category: string;
  action?: string;
  uid?: string;
  reelId?: string;
  targetId?: string;
  targetType?: string;
  sessionId?: string;
  data?: any;
  timestamp: Date | string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface ReelAnalytics {
  reelId: string;
  timeRange: string;
  views: {
    total: number;
    unique: number;
    hourly: Array<{
      hour: string;
      views: number;
      unique: number;
    }>;
  };
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  retention: {
    avgWatchTime: number;
    avgCompletion: number;
    totalReplays: number;
  };
  demographics: {
    countries: Record<string, number>;
    devices: Record<string, number>;
    ages: Record<string, number>;
  };
}

export interface AccountAnalytics {
  totalFlicks: number;
  totalViews: number;
  followersCount: number;
  followingCount: number;
  estimatedRevenue: number;
  latestFlicks: Array<{
    _id: string;
    title: string;
    thumbnailUrl: string;
    views: number;
    publishedDate: string;
  }>;
  period: string;
}

// ============================================
// Feed & App State Types
// ============================================

export interface FeedData {
  reels: Reel[];
  hasMore: boolean;
  page?: number;
  total?: number;
  pagination?: {
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface AppPreferences {
  notifications?: NotificationPreferences;
  privacy?: PrivacyPreferences;
}

export interface SessionData {
  sessionId: string;
  duration?: number;
  screensViewed?: number;
  videosWatched?: number;
  interactions?: number;
  appVersion?: string;
  device?: string;
}

// ============================================
// Upload & Media Processing Types
// ============================================

export interface UploadData {
  uploadUrl: string;
  videoId: string;
  provider: string;
  expiresIn: number;
  instructions: {
    method: string;
    formFields: Record<string, string>;
  };
}

export interface UploadStatus {
  videoId: string;
  status: string;
  progress: number;
  ready: boolean;
  error?: string;
  details?: {
    duration?: number;
    size?: number;
    thumbnail?: string;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CommentResponse {
  comment: Comment;
  success: boolean;
}

export interface CommentsListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ProfileResponse {
  user: User;
  isFollowing?: boolean;
  success: boolean;
}

export interface FollowResponse {
  success: boolean;
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
  success: boolean;
}

export interface SaveResponse {
  saved: boolean;
  savesCount: number;
  success: boolean;
}

// ============================================
// Navigation & Route Types
// ============================================

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  AccountSettings: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Profile: { userId?: string };
  UserProfile: { userId: string };
  Reel: { reelId: string; initialIndex?: number };
};

export type MainTabParamList = {
  Home: undefined;
  Flicks: { initialReelId?: string; initialIndex?: number };
  Upload: undefined;
  Store: undefined;
  Account: undefined;
};

// ============================================
// Store Types (Zustand)
// ============================================

export interface AppStoreState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // WebSocket state
  socket: any; // Socket.IO instance
  connected: boolean;
  
  // Reels state
  reels: Reel[];
  currentReelIndex: number;
  hasLoadedReels: boolean;
  
  // Playback state
  isMuted: boolean;
  isPlaying: boolean;
  
  // Comments state
  comments: Record<string, Comment[]>;
  typingUsers: Record<string, Array<{ uid: string; username: string }>>;
  
  // Notifications
  notifications: NotificationEvent[];
  
  // Feed state
  lastReelsFetch: number;
  feedType: 'home' | 'following' | 'trending';
}

// ============================================
// Component Props Types
// ============================================

export interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onDoubleTapLike?: () => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  isMuted: boolean;
  isPlaying: boolean;
  doubleTapLikeAnimVisible: boolean;
  viewerCount: number;
  socket?: any;
  hideViewCount?: boolean;
}

export interface CommentsModalProps {
  visible: boolean;
  reelId?: string;
  comments: Comment[];
  totalComments: number;
  onClose: () => void;
  onAddComment: (text: string, replyToId?: string) => Promise<any>;
  onLikeComment: (commentId: string) => void;
  onLoadMoreReplies?: (commentId: string) => Promise<Comment[]>;
  isLoading?: boolean;
}

export interface FollowButtonProps {
  targetUid: string;
  username?: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onFollowChange?: (isFollowing: boolean) => void;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

// Export all types
export * from './index';

//