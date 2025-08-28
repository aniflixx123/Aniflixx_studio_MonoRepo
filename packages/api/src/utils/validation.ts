// Validation utilities

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` }
  }
  
  // Check file size (max 10MB per image)
  const maxSize = 10 * 1024 * 1024 // 10MB in bytes
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB` 
    }
  }
  
  // Check file name for invalid characters
  const invalidChars = /[<>:"/\\|?*]/g
  if (invalidChars.test(file.name)) {
    return { 
      valid: false, 
      error: 'File name contains invalid characters' 
    }
  }
  
  return { valid: true }
}

export function validateChapterUpload(
  seriesId: string,
  chapterNumber: string,
  title: string,
  totalPages: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate series ID
  if (!seriesId || seriesId.trim().length === 0) {
    errors.push('Series ID is required')
  }
  
  // Validate chapter number
  if (!chapterNumber) {
    errors.push('Chapter number is required')
  } else if (isNaN(parseInt(chapterNumber))) {
    errors.push('Chapter number must be a valid number')
  } else if (parseInt(chapterNumber) < 0) {
    errors.push('Chapter number cannot be negative')
  }
  
  // Validate title
  if (!title || title.trim().length === 0) {
    errors.push('Chapter title is required')
  } else if (title.length > 200) {
    errors.push('Chapter title must be less than 200 characters')
  }
  
  // Validate page count
  if (!totalPages || totalPages < 1) {
    errors.push('At least one page is required')
  } else if (totalPages > 200) {
    errors.push('Maximum 200 pages per chapter allowed')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateEpisodeUpload(
  seriesId: string,
  episodeNumber: string,
  title: string,
  videoFile: File
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate series ID
  if (!seriesId || seriesId.trim().length === 0) {
    errors.push('Series ID is required')
  }
  
  // Validate episode number
  if (!episodeNumber) {
    errors.push('Episode number is required')
  } else if (isNaN(parseInt(episodeNumber))) {
    errors.push('Episode number must be a valid number')
  }
  
  // Validate title
  if (!title || title.trim().length === 0) {
    errors.push('Episode title is required')
  }
  
  // Validate video file
  if (!videoFile) {
    errors.push('Video file is required')
  } else {
    // Check video format
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!validVideoTypes.includes(videoFile.type)) {
      errors.push(`Invalid video format. Allowed: MP4, WebM, MOV`)
    }
    
    // Check file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (videoFile.size > maxSize) {
      errors.push(`Video file too large: ${(videoFile.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum: 2GB`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateSeriesData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required')
  }
  
  if (!data.type) {
    errors.push('Series type is required')
  } else if (!['anime', 'manga', 'webtoon', 'light_novel'].includes(data.type)) {
    errors.push('Invalid series type')
  }
  
  // Optional but validated fields
  if (data.description && data.description.length > 5000) {
    errors.push('Description must be less than 5000 characters')
  }
  
  if (data.genres && !Array.isArray(data.genres)) {
    errors.push('Genres must be an array')
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array')
  }
  
  if (data.status && !['draft', 'published', 'completed', 'hiatus', 'cancelled', 'archived'].includes(data.status)) {
    errors.push('Invalid status value')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function validatePageOrder(pageOrder: number[], totalPages: number): { valid: boolean; error?: string } {
  // Check if array
  if (!Array.isArray(pageOrder)) {
    return { valid: false, error: 'Page order must be an array' }
  }
  
  // Check length
  if (pageOrder.length !== totalPages) {
    return { valid: false, error: `Page order length (${pageOrder.length}) doesn't match total pages (${totalPages})` }
  }
  
  // Check for duplicates
  const uniquePages = new Set(pageOrder)
  if (uniquePages.size !== pageOrder.length) {
    return { valid: false, error: 'Duplicate page numbers found' }
  }
  
  // Check range
  for (const pageNum of pageOrder) {
    if (pageNum < 0 || pageNum >= totalPages) {
      return { valid: false, error: `Invalid page number: ${pageNum}` }
    }
  }
  
  return { valid: true }
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uuidRegexNoDashes = /^[0-9a-f]{32}$/i
  return uuidRegex.test(uuid) || uuidRegexNoDashes.test(uuid)
}