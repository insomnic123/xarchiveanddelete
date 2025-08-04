'use client'

import { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Download, Trash2, Twitter, LogOut, RefreshCw } from 'lucide-react'
import JSZip from 'jszip'

export default function Home() {
  const { data: session, status } = useSession()
  const [tweets, setTweets] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [progress, setProgress] = useState(0)

  const fetchTweets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tweets/fetch')
      const data = await response.json()
      setTweets(data.tweets || [])
    } catch (error) {
      console.error('Error fetching tweets:', error)
    }
    setLoading(false)
  }

  const downloadBackup = async () => {
    const zip = new JSZip()
    
    const tweetData = tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      retweet_count: tweet.public_metrics?.retweet_count || 0,
      like_count: tweet.public_metrics?.like_count || 0,
      reply_count: tweet.public_metrics?.reply_count || 0,
      quote_count: tweet.public_metrics?.quote_count || 0,
      is_retweet: tweet.referenced_tweets?.some(ref => ref.type === 'retweeted')
    }))

    zip.file('tweets_backup.json', JSON.stringify(tweetData, null, 2))
    zip.file('README.txt', `Tweet Backup - ${new Date().toISOString()}\n\nTotal tweets: ${tweets.length}\nBackup created: ${new Date().toLocaleString()}`)

    const content = await zip.generateAsync({ type: 'blob' })
    const url = window.URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `tweets_backup_${new Date().toISOString().split('T')[0]}.zip`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const deleteAllTweets = async () => {
    if (!confirm(`Are you sure you want to delete all ${tweets.length} tweets? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    setProgress(0)

    const tweetIds = tweets.map(tweet => tweet.id)
    const batchSize = 10
    
    for (let i = 0; i < tweetIds.length; i += batchSize) {
      const batch = tweetIds.slice(i, i + batchSize)
      
      try {
        await fetch('/api/tweets/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tweetIds: batch })
        })
      } catch (error) {
        console.error('Error deleting batch:', error)
      }
      
      setProgress(Math.round(((i + batch.length) / tweetIds.length) * 100))
    }

    setDeleting(false)
    setTweets([])
    alert('All tweets have been processed for deletion.')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Twitter className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">X Tweet Cleaner</h1>
          <p className="text-gray-600 mb-8">
            Safely delete all your tweets and retweets, with a complete backup download.
          </p>
          <button
            onClick={() => signIn('twitter')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Twitter className="w-5 h-5" />
            Sign in with X
          </button>
          <p className="text-sm text-gray-500 mt-4">
            We only request necessary permissions to read and delete your tweets.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Twitter className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">X Tweet Cleaner</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={session.user.image}
                alt={session.user.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700">
                @{session.user.username}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Tweets</h2>
          
          {tweets.length === 0 && !loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Click the button below to load your tweets.</p>
              <button
                onClick={fetchTweets}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Load Tweets
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  {loading ? 'Loading tweets...' : `Found ${tweets.length} tweets`}
                </p>
                
                {tweets.length > 0 && (
                  <div className="flex gap-3">
                    <button
                      onClick={downloadBackup}
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Backup
                    </button>
                    
                    <button
                      onClick={deleteAllTweets}
                      disabled={deleting}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All Tweets
                    </button>
                  </div>
                )}
              </div>

              {deleting && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-800 font-medium">Deleting tweets...</span>
                    <span className="text-red-600 text-sm">{progress}%</span>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tweets.slice(0, 10).map((tweet) => (
                    <div key={tweet.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 text-sm mb-2">{tweet.text}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                            <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
                            <span>🔄 {tweet.public_metrics?.retweet_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tweets.length > 10 && (
                    <p className="text-center text-gray-500 text-sm py-4">
                      ... and {tweets.length - 10} more tweets
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Important Notes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong> THIS IS A TEST APP -- As much as I would love to make it official, X has a very very very restrictive plan. If it doesn't work, it's likely due to the rate limits. If you somehow know someone who can get the free plan to be more than a joke please let them know T_T</strong></li>
            <li>• If you want to see this function, feel free to create your own X project with all the scopes and copy the credentials into a .env.local! The .env setup is: <br/>
            NEXTAUTH_URL <br/> NEXTAUTH_SECRET <br/> TWITTER_CLIENT_ID <br />TWITTER_CLIENT_SECRET<br/></li>
            <li>• Always download a backup before deleting tweets -- you never know where it may be useful/needed!</li>
            <li>• Deletion is permanent and cannot be undone, as per X guidelines</li>
            <li>• Retweets and quote tweets will also be removed!</li>
            <li>• The X rate limit on the free plan is DIABOLICAL, but in the spirit of keeping this as a free service, please be advised that you can only load your tweets every 15 minutes, and the deletion process may take a while. There are better services out there, albeit for a small fee.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
