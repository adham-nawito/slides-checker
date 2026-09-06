import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { Skeleton } from './components/ui/skeleton'
import { getStoredUser } from '@/store/authStore'

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const Login          = lazy(() => import('./pages/Login'))
const Upload         = lazy(() => import('./pages/Upload'))
const MySubmissions  = lazy(() => import('./pages/user/MySubmissions'))
const TagManager     = lazy(() => import('./pages/admin/TagManager'))
const ReviewQueue    = lazy(() => import('./pages/admin/ReviewQueue'))

// ─── Loading fallback ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}

// ─── Route tree ───────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  ),
})

// Public — login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: () => {
    const user = getStoredUser()
    if (user) {
      throw redirect({ to: user.role === 'admin' ? '/admin/tags' : '/upload' })
    }
  },
})

// Protected layout (both roles)
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: AppLayout,
  beforeLoad: () => {
    if (!getStoredUser()) throw redirect({ to: '/login' })
  },
})

// User: /upload
const uploadRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/upload',
  component: Upload,
  beforeLoad: () => {
    const user = getStoredUser()
    if (!user) throw redirect({ to: '/login' })
    if (user.role === 'admin') throw redirect({ to: '/admin/tags' })
  },
})

// User: /my-submissions
const mySubmissionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/my-submissions',
  component: MySubmissions,
  beforeLoad: () => {
    const user = getStoredUser()
    if (!user) throw redirect({ to: '/login' })
    if (user.role === 'admin') throw redirect({ to: '/admin/tags' })
  },
})

// Admin: /admin/tags
const adminTagsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin/tags',
  component: TagManager,
  beforeLoad: () => {
    const user = getStoredUser()
    if (!user) throw redirect({ to: '/login' })
    if (user.role !== 'admin') throw redirect({ to: '/upload' })
  },
})

// Admin: /admin/review
const adminReviewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin/review',
  component: ReviewQueue,
  beforeLoad: () => {
    const user = getStoredUser()
    if (!user) throw redirect({ to: '/login' })
    if (user.role !== 'admin') throw redirect({ to: '/upload' })
  },
})

// Root redirect — send to correct home based on role
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const user = getStoredUser()
    throw redirect({ to: user?.role === 'admin' ? '/admin/tags' : user ? '/upload' : '/login' })
  },
  component: () => null,
})

// ─── Router ───────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  layoutRoute.addChildren([
    uploadRoute,
    mySubmissionsRoute,
    adminTagsRoute,
    adminReviewRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
