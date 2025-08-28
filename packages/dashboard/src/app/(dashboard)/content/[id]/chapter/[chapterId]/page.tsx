import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getChapterData(chapterId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${chapterId}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return null
  }
}

export default async function ChapterReaderPage({ 
  params 
}: { 
  params: Promise<{ id: string; chapterId: string }> 
}) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const { id, chapterId } = await params
  const chapter:any = await getChapterData(chapterId)
  
  if (!chapter) {
    redirect(`/content/${id}`)
  }

  // Parse the page paths from video_path
  let pagePaths: string[] = []
  try {
    pagePaths = JSON.parse(chapter.video_path)
  } catch {
    console.error('Invalid chapter data')
    redirect(`/content/${id}`)
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-gray-900 text-white p-4 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <Link href={`/content/${id}`} className="text-blue-400 hover:underline">
              ← Back to Series
            </Link>
            <h1 className="text-xl font-bold mt-1">
              Chapter {chapter.episode_number}: {chapter.title}
            </h1>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
              Previous
            </button>
            <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pb-8">
        {pagePaths.map((path, index) => (
          <div key={index} className="mb-2">
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}/api/files/${path}`}
              alt={`Page ${index + 1}`}
              className="w-full"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-center items-center gap-4">
          <span className="text-sm">Page {pagePaths.length} of {pagePaths.length}</span>
        </div>
      </div>
    </div>
  )
}