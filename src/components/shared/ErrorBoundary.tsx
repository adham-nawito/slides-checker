import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── React Error Boundary (class component — hooks can't catch render errors) ──

interface BoundaryProps {
  children: ReactNode
  /** Override the default crash UI */
  fallback?: ReactNode
}

interface BoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <PageError error={this.state.error} onReset={this.reset} />
      )
    }
    return this.props.children
  }
}

// ─── Full-page error fallback ─────────────────────────────────────────────────

export function PageError({
  error,
  onReset,
  title = 'Something went wrong',
}: {
  error?: Error | null
  onReset?: () => void
  title?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
      <div className="p-4 rounded-full bg-red-50 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
      {error?.message && (
        <p className="text-sm text-muted-foreground mb-5 max-w-md">{error.message}</p>
      )}
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}

// ─── Inline query / fetch error banner ───────────────────────────────────────
// Use this inside pages when a useQuery call fails.

export function QueryError({
  error,
  onRetry,
}: {
  error: Error | null | unknown
  onRetry?: () => void
}) {
  if (!error) return null
  const message =
    error instanceof Error
      ? error.message
      : 'Failed to load data. Please try again.'

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs font-medium underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}
