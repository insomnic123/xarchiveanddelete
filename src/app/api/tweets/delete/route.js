import axios from 'axios'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '../../auth/[...nextauth]/route.js'


export async function POST(request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { tweetIds } = await request.json()

  try {
    const results = []
    
    for (const tweetId of tweetIds) {
      try {
        await axios.delete(`https://api.twitter.com/2/tweets/${tweetId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        })
        results.push({ id: tweetId, status: 'deleted' })
      } catch (error) {
        results.push({ 
          id: tweetId, 
          status: 'error', 
          message: error.response?.data?.detail || 'Failed to delete'
        })
      }
      
      // Rate limiting: wait 1 second between deletions
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error deleting tweets:', error)
    return NextResponse.json({ error: 'Failed to delete tweets' }, { status: 500 })
  }
}
