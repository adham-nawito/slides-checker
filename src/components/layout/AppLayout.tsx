import { useEffect } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/context/AuthContext'

export function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate({ to: '/login' })
  }, [user, navigate])

  if (!user) return null

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={user.role} />
        <main
          id="main-content"
          className="flex-1 overflow-auto focus:outline-none"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}
