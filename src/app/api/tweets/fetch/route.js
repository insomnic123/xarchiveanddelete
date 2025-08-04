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
    const MAX_REQUESTS = 1

    let lastRateLimitInfo = null

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

      if (lastRateLimitInfo && lastRateLimitInfo.remaining === '0') {
        console.warn(`Rate limit reached. Waiting until reset at ${lastRateLimitInfo.resetTime}. Stopping requests.`)
        break
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

      const rateLimit = response.headers['x-rate-limit-limit']
      const remaining = response.headers['x-rate-limit-remaining']
      const reset = response.headers['x-rate-limit-reset']

      console.log('\n--- Rate Limit Info ---')
      console.log('Limit:     ', rateLimit)
      console.log('Remaining: ', remaining)
      console.log('Reset At:  ', reset ? new Date(reset * 1000).toLocaleString() : 'N/A')

      lastRateLimitInfo = {
        limit: rateLimit,
        remaining,
        resetTime: reset ? new Date(reset * 1000).toLocaleString() : null
      }

      if (remaining === '0') {
        console.warn(`Rate limit reached during this request. Next reset at ${lastRateLimitInfo.resetTime}`)
      }

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
      message: requestCount >= MAX_REQUESTS ? 'Limited results to avoid rate limits' : undefined,
      rateLimit: lastRateLimitInfo
    })
} catch (error) {
  console.error('API Error Details:')
  console.error('Status:', error.response?.status)
  console.error('Status Text:', error.response?.statusText)
  console.error('Data:', JSON.stringify(error.response?.data, null, 2))
  console.error('Headers:', JSON.stringify(error.response?.headers, null, 2))

  if (error.response?.status === 429) {
    const headers = error.response.headers
    const rateLimit = headers['x-rate-limit-limit']
    const remaining = headers['x-rate-limit-remaining'] 
    const reset = headers['x-rate-limit-reset']
    const resource = headers['x-rate-limit-resource']

    console.warn('\n--- Rate Limit Info (from error) ---')
    console.warn('Resource:  ', resource || 'Not specified')
    console.warn('Limit:     ', rateLimit)
    console.warn('Remaining: ', remaining)
    console.warn('Reset At:  ', reset ? new Date(reset * 1000).toLocaleString() : 'N/A')

    if (rateLimit === '1' || parseInt(rateLimit) < 10) {
      return NextResponse.json({ 
        error: 'This endpoint has very restrictive rate limits. You may need to upgrade your Twitter API access or use a different authentication method.',
        rateLimited: true,
        limitType: 'restrictive',
        rateLimit: {
          limit: rateLimit,
          remaining,
          resetTime: reset ? new Date(reset * 1000).toLocaleString() : null,
          resource: resource
        }
      }, { status: 429 })
    }

    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please wait and try again.',
      rateLimited: true,
      rateLimit: {
        limit: rateLimit,
        remaining,
        resetTime: reset ? new Date(reset * 1000).toLocaleString() : null,
        resource: resource
      }
    }, { status: 429 })
  }

  if (error.response?.status === 401) {
    return NextResponse.json({ 
      error: 'Authentication failed. Your access token may be invalid or expired.',
      authError: true
    }, { status: 401 })
  }

  if (error.response?.status === 403) {
    return NextResponse.json({ 
      error: 'Access forbidden. Your app may not have permission to access this endpoint.',
      permissionError: true
    }, { status: 403 })
  }

  console.error('Error fetching tweets:', error.response?.data || error.message)
  return NextResponse.json({ 
    error: 'Failed to fetch tweets',
    details: error.response?.data || error.message
  }, { status: 500 })
}}