export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}