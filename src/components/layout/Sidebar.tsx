import { Link, useRouterState } from '@tanstack/react-router'
import { Upload, Tag, ClipboardList, ChevronRight, LogOut, Presentation } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { submissionsApi } from '@/lib/api'
import type { UserRole } from '@/types'

const USER_NAV = [{ to: '/upload', label: 'Validate', icon: Upload }]

export function Sidebar({ role }: { role: UserRole }) {
  const { location } = useRouterState()
  const { logout }   = useAuth()

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
    { to: '/admin/tags',   label: 'Guideline Sets', icon: Tag,          badge: 0            },
    { to: '/admin/review', label: 'Review Queue',   icon: ClipboardList, badge: pendingCount },
  ]

  const navItems = role === 'admin' ? ADMIN_NAV : USER_NAV.map((n) => ({ ...n, badge: 0 }))

  return (
    <aside
      className="flex flex-col w-56 min-h-screen bg-white border-r border-border shrink-0"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Presentation className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-base tracking-tight block">SlideCheck</span>
          <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" role="navigation">
        {navItems.map(({ to, label, icon: Icon, badge }) => {
          const isActive = location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                    isActive
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-red-500 text-white',
                  )}
                  aria-label={`${badge} pending`}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {!badge && isActive && <ChevronRight className="w-3 h-3" aria-hidden="true" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
