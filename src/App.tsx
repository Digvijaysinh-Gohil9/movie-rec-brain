import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { FeedPage } from './pages/FeedPage'
import { RatePage } from './pages/RatePage'
import { DetailPage } from './pages/DetailPage'
import { LibraryPage } from './pages/LibraryPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { SettingsPage } from './pages/SettingsPage'
import { useWatchlistCount } from './hooks/useDb'

function BottomNav() {
  const { pathname } = useLocation()
  const watchlistCount = useWatchlistCount()
  const hidden = pathname.startsWith('/feed') || pathname.startsWith('/detail')
  if (hidden) return null

  const NAV_ITEMS = [
    { path: '/',          label: 'Discover',  icon: '🎬' },
    { path: '/watchlist', label: 'Watchlist', icon: '📋', badge: watchlistCount },
    { path: '/rate',      label: 'Rate',      icon: '⭐' },
    { path: '/library',   label: 'Library',   icon: '📚' },
    { path: '/settings',  label: 'Settings',  icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f0f]/90 backdrop-blur border-t border-white/8 pb-safe">
      <div className="flex">
        {NAV_ITEMS.map(({ path, label, icon, badge }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                active ? 'text-amber-400' : 'text-gray-600'
              }`}
            >
              <span className="text-xl leading-none relative">
                {icon}
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-amber-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-4xl animate-pulse">🎬</p>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <>
      <Routes>
        <Route path="/"                        element={<HomePage />} />
        <Route path="/feed"                    element={<FeedPage />} />
        <Route path="/rate"                    element={<RatePage />} />
        <Route path="/library"                 element={<LibraryPage />} />
        <Route path="/watchlist"               element={<WatchlistPage />} />
        <Route path="/settings"                element={<SettingsPage />} />
        <Route path="/detail/:mediaType/:id"   element={<DetailPage />} />
        <Route path="*"                        element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
