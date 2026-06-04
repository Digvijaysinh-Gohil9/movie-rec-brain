import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, or sign in if confirmation is disabled.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Auth context picks up the session change automatically
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <p className="text-5xl mb-3">🎬</p>
        <h1 className="text-2xl font-bold text-white">Movie Recommender</h1>
        <p className="text-gray-500 text-sm mt-1">Your personal taste, everywhere</p>
      </div>

      {/* Tab toggle */}
      <div className="w-full max-w-sm bg-white/5 rounded-2xl p-1 flex gap-1 mb-6">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setSuccess(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === m ? 'bg-white text-black shadow' : 'text-gray-400'
            }`}
          >
            {m === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-white/8 text-white placeholder-gray-500 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-amber-400/50"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full bg-white/8 text-white placeholder-gray-500 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-amber-400/50"
        />

        {error && (
          <div className="px-4 py-3 rounded-2xl bg-red-600/15 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-2xl bg-green-600/15 text-green-400 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-amber-400 text-black font-bold text-base disabled:opacity-50 active:opacity-80 transition-opacity mt-1"
        >
          {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="text-gray-600 text-xs text-center mt-8 max-w-xs">
        Your ratings and watchlist are synced to your account — access them on any device.
      </p>
    </div>
  )
}
