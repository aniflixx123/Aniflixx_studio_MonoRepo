// Image processing utilities for manga/webtoon
// For Cloudflare Workers environment

export async function processImageForManga(
  file: File,
  targetWidth: number,
  quality: number = 0.85
): Promise<Blob> {
  try {
    // In Cloudflare Workers, we have limited image processing capabilities
    // Option 1: Use Cloudflare Image Resizing API (if available)
    // Option 2: Return original for now and process on CDN level
    // Option 3: Use WASM-based image library
    
    // For now, return the original file
    // You should implement actual resizing using one of these methods:
    // 1. Cloudflare Image Resizing: https://developers.cloudflare.com/images/image-resizing/
    // 2. WASM library like photon-rs
    // 3. External image processing service
    
    console.warn(`Image resizing to ${targetWidth}px not implemented yet. Returning original.`)
    return file
  } catch (error) {
    console.error('Image processing error:', error)
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Alternative implementation using Cloudflare Image Resizing
export function processImageWithCloudflare(
  imageUrl: string,
  targetWidth: number,
  quality: number = 85
): string {
  // This creates a URL that will be resized by Cloudflare's edge
  const resizeOptions = {
    width: targetWidth,
    quality: quality,
    format: 'webp'
  }
  
  const params = new URLSearchParams({
    width: String(resizeOptions.width),
    quality: String(resizeOptions.quality),
    format: resizeOptions.format
  })
  
  return `${imageUrl}?${params.toString()}`
}

export async function generateImageVersions(file: File) {
  try {
    // For Cloudflare Workers, we'll store the original and let 
    // Cloudflare's Image Resizing handle different sizes on-the-fly
    
    // Option 1: Store only original, resize on-demand via CDN
    return {
      mobile: file,    // Will be resized via CDN URL params
      thumbnail: file, // Will be resized via CDN URL params
      original: file
    }
    
    // Option 2: If you have Cloudflare Images API access:
    // const mobileBlob = await resizeWithCloudflareAPI(file, 800)
    // const thumbBlob = await resizeWithCloudflareAPI(file, 200)
    
  } catch (error) {
    console.error('Generate versions error:', error)
    throw new Error('Failed to generate image versions')
  }
}

// Helper to generate CDN URLs with resize parameters
export function generateResponsiveUrls(baseUrl: string) {
  return {
    original: baseUrl,
    mobile: `${baseUrl}?width=800&quality=85&format=webp`,
    thumbnail: `${baseUrl}?width=200&quality=80&format=webp`,
    standard: `${baseUrl}?width=1200&quality=90&format=webp`
  }
}

// Detect if image is for webtoon (long strip)
export function isWebtoonImage(width: number, height: number): boolean {
  const aspectRatio = height / width
  // Webtoon images are typically very tall (aspect ratio > 3)
  return aspectRatio > 3
}

// Calculate optimal dimensions for different devices
export function getOptimalDimensions(originalWidth: number, originalHeight: number, targetDevice: 'mobile' | 'tablet' | 'desktop') {
  const maxWidths = {
    mobile: 800,
    tablet: 1200,
    desktop: 1600
  }
  
  const targetWidth = Math.min(originalWidth, maxWidths[targetDevice])
  const aspectRatio = originalHeight / originalWidth
  const targetHeight = Math.round(targetWidth * aspectRatio)
  
  return {
    width: targetWidth,
    height: targetHeight
  }
}

// Estimate file size after processing
export function estimateFileSize(width: number, height: number, quality: number): number {
  // Rough estimation: pixels * color channels * compression factor
  const pixels = width * height
  const colorChannels = 3 // RGB
  const compressionFactor = quality * 0.1 // WebP compression estimate
  
  return Math.round(pixels * colorChannels * compressionFactor / 1024) // in KB
}

// Process batch of images with progress tracking
export async function processBatch(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ mobile: Blob; thumbnail: Blob; original: File }>> {
  const results = []
  
  for (let i = 0; i < files.length; i++) {
    const versions = await generateImageVersions(files[i])
    results.push(versions)
    
    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }
  
  return results
}

// Validate image dimensions
export function validateImageDimensions(width: number, height: number, type: 'manga' | 'webtoon') {
  const limits = {
    manga: {
      minWidth: 600,
      maxWidth: 4000,
      minHeight: 800,
      maxHeight: 6000
    },
    webtoon: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 1000,
      maxHeight: 20000 // Long strips
    }
  }
  
  const limit = limits[type]
  
  if (width < limit.minWidth || width > limit.maxWidth) {
    return {
      valid: false,
      error: `Width must be between ${limit.minWidth}px and ${limit.maxWidth}px`
    }
  }
  
  if (height < limit.minHeight || height > limit.maxHeight) {
    return {
      valid: false,
      error: `Height must be between ${limit.minHeight}px and ${limit.maxHeight}px`
    }
  }
  
  return { valid: true }
}

// WASM-based image processing (if you want to add actual resizing)
// You would need to install: npm install @cloudflare/photon
/*
import * as photon from '@cloudflare/photon'

export async function resizeImageWithWASM(
  file: File,
  targetWidth: number
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const image = photon.PhotonImage.new_from_buffer(new Uint8Array(buffer))
  
  const currentWidth = image.get_width()
  const currentHeight = image.get_height()
  const aspectRatio = currentHeight / currentWidth
  const targetHeight = Math.round(targetWidth * aspectRatio)
  
  photon.resize(image, targetWidth, targetHeight, photon.SamplingFilter.Lanczos3)
  
  const outputBuffer = image.get_bytes_webp(85)
  return new Blob([outputBuffer], { type: 'image/webp' })
}
*/

// Cloudflare Images API integration (requires account setup)
/*
export async function uploadToCloudflareImages(
  file: File,
  accountId: string,
  apiToken: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: formData
    }
  )
  
  const result = await response.json()
  return result.result.id
}
*/