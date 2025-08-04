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
    let rateLimitHit = false
    let rateLimitResetTime = null

    for (const tweetId of tweetIds) {
      const res = await axios.delete(`https://api.twitter.com/2/tweets/${tweetId}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        },
        validateStatus: () => true 
      })

      const limit = res.headers['x-rate-limit-limit']
      const remaining = res.headers['x-rate-limit-remaining']
      const reset = res.headers['x-rate-limit-reset']

      console.log(`Deleting tweet ${tweetId}:`)
      console.log('  → Status:', res.status)
      console.log('  → Rate Limit Remaining:', remaining)
      console.log('  → Rate Limit Reset At:', reset ? new Date(reset * 1000).toLocaleString() : 'N/A')

      if (res.status === 200) {
        results.push({ id: tweetId, status: 'deleted' })
      } else if (res.status === 429) {
        rateLimitHit = true
        rateLimitResetTime = reset ? new Date(reset * 1000).toLocaleString() : null
        results.push({
          id: tweetId,
          status: 'rate_limited',
          message: 'Rate limit exceeded. Try again later.',
          resetAt: rateLimitResetTime
        })
        break 
      } else {
        results.push({
          id: tweetId,
          status: 'error',
          code: res.status,
          message: res.data?.detail || 'Failed to delete'
        })
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      results,
      rateLimitHit,
      rateLimitResetTime
    })
  } catch (error) {
    console.error('Error deleting tweets:', error)
    return NextResponse.json({ error: 'Failed to delete tweets' }, { status: 500 })
  }
}
