import { type NextRequest, NextResponse } from 'next/server'
import { getDownloadUrl } from '@vercel/blob'

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json(
        { error: 'Missing pathname' },
        { status: 400 }
      )
    }

    // Generate a temporary download URL for the blob
    const url = await getDownloadUrl(pathname)

    if (!url) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Redirect the browser to the blob download URL
    return NextResponse.redirect(url)

  } catch (error) {
    console.error('Error serving file:', error)

    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}