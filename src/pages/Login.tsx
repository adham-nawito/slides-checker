import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Presentation, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/types'

export default function Login() {
  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      const data = await authApi.login(username.trim(), password)
      login({ token: data.token, role: data.role as UserRole, username: data.username })
      navigate({ to: data.role === 'admin' ? '/admin/tags' : '/upload' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand identity (desktop only) ────────── */}
      <div className="hidden lg:flex flex-col justify-between px-12 py-12 bg-zinc-900 w-[420px] shrink-0">
        {/* Top: logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">SlideCheck</span>
        </div>

        {/* Middle: copy */}
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Every presentation,<br />up to standard.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Upload a file and check it against your team's formatting guidelines in seconds.
          </p>
        </div>

        {/* Bottom: subtle note */}
        <p className="text-zinc-600 text-xs">
          Sign in with your assigned credentials.
        </p>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 bg-white">

        {/* Mobile-only logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Presentation className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-semibold text-zinc-900">SlideCheck</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Sign in</h1>
          <p className="text-zinc-500 text-sm mb-8">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-zinc-700">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !password}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
