/**
 * Format numeric values for display (e.g. 1.2K, 3.4M)
 */
export function formatCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }
  
  /**
   * Get color for genre tag
   */
  export function getGenreColor(genre: string): string {
    const genreLower = genre.toLowerCase();
    if (genreLower.includes('action')) return '#FF5252';
    if (genreLower.includes('drama')) return '#673AB7';
    if (genreLower.includes('fantasy')) return '#4CAF50';
    if (genreLower.includes('comedy')) return '#FFCA28';
    if (genreLower.includes('horror')) return '#212121';
    if (genreLower.includes('romance')) return '#EC407A';
    if (genreLower.includes('sci-fi')) return '#00BCD4';
    return '#ff3366'; // Default color
  }