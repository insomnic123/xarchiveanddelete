import './globals.css'
import AuthProvider from './providers/auth-provider'

export const metadata = {
  title: 'X Tweet Cleaner',
  description: 'Delete all your tweets and retweets with backup',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}