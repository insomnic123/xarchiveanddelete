import axios from 'axios'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  console.log('Full session:', JSON.stringify(session, null, 2))
  console.log('User ID:', session.user?.id)
  console.log('Access Token:', session.accessToken ? 'Present' : 'Missing')

  if (!session.user?.id) {
    return NextResponse.json({ 
      error: 'User ID not found in session',
      debug: {
        user: session.user,
        hasAccessToken: !!session.accessToken
      }
    }, { status: 400 })
  }

  try {
    const tweets = []
    let nextToken = null
    let requestCount = 0
    const MAX_REQUESTS = 5 

    do {
      if (requestCount >= MAX_REQUESTS) {
        console.log('Stopping to avoid rate limits')
        break
      }

      const params = {
        max_results: 100,
        'tweet.fields': 'created_at,text,public_metrics,referenced_tweets',
        'expansions': 'referenced_tweets.id'
      }
      
      if (nextToken) {
        params.pagination_token = nextToken
      }

      const response = await axios.get(
        `https://api.twitter.com/2/users/${session.user.id}/tweets`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          },
          params
        }
      )

      if (response.data.data) {
        tweets.push(...response.data.data)
      }
      
      nextToken = response.data.meta?.next_token
      requestCount++
      
      if (nextToken) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
    } while (nextToken && requestCount < MAX_REQUESTS)

    return NextResponse.json({ 
      tweets, 
      count: tweets.length,
      hasMore: !!nextToken,
      message: requestCount >= MAX_REQUESTS ? 'Limited results to avoid rate limits' : undefined
    })
  } catch (error) {
    if (error.response?.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait 15 minutes and try again.',
        rateLimited: true 
      }, { status: 429 })
    }
    
    console.error('Error fetching tweets:', error.response?.data || error.message)
    return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 })
  }
}