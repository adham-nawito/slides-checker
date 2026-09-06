import { Link, useRouterState } from '@tanstack/react-router'
import { Upload, Tag, ClipboardList, LogOut, Presentation, History, Sun, Moon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { submissionsApi } from '@/lib/api'
import type { UserRole } from '@/types'

const USER_NAV = [
  { to: '/upload',         label: 'Validate',        icon: Upload  },
  { to: '/my-submissions', label: 'My Submissions',   icon: History },
]

export function Sidebar({ role }: { role: UserRole }) {
  const { location } = useRouterState()
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { dark, toggle } = useTheme()

  // Poll pending submissions count — admin only
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions'],
    queryFn: submissionsApi.list,
    enabled: role === 'admin',
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const pendingCount = submissions.filter((s) => s.status === 'pending').length

  const ADMIN_NAV = [
    { to: '/admin/tags',   label: 'Guideline Tag', icon: Tag,           badge: 0            },
    { to: '/admin/review', label: 'Review Queue',   icon: ClipboardList, badge: pendingCount },
  ]

  const navItems = role === 'admin'
    ? ADMIN_NAV
    : USER_NAV.map((n) => ({ ...n, badge: 0 }))

  const initial = user?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <aside
      className="flex flex-col w-56 min-h-screen bg-zinc-900 shrink-0"
      aria-label="Main navigation"
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Presentation className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-semibold text-white tracking-tight">SlideCheck</span>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5" role="navigation">
        {navItems.map(({ to, label, icon: Icon, badge }) => {
          const isActive = location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
              {badge > 0 && (
                <span
                  className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none bg-indigo-500 text-white"
                  aria-label={`${badge} pending`}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User + Logout ─────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 space-y-0.5">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-0.5">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.username}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{role}</p>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark
            ? <Sun  className="w-4 h-4 shrink-0" aria-hidden="true" />
            : <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
          }
          {dark ? 'Light mode' : 'Dark mode'}
        </button>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
