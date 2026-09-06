import { CheckCircle2, FileBarChart2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { submissionsApi } from '@/lib/api'
import { SubmissionCard, PendingBadge, FailedBadge } from '@/components/shared/SubmissionCard'
import { QueryError } from '@/components/shared/ErrorBoundary'

export default function MySubmissions() {
  const {
    data: submissions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-submissions'],
    queryFn:  submissionsApi.mine,
    refetchInterval: 30_000,
  })

  const pendingCount  = submissions.filter((s) => s.status === 'pending').length
  const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length
  const failedCount   = submissions.filter((s) => s.status === 'failed').length

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Submissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All presentations you have validated — passed and failed.
          </p>
        </div>
        {submissions.length > 0 && (
          <div className="flex gap-2 shrink-0 flex-wrap">
            <PendingBadge count={pendingCount} />
            {reviewedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {reviewedCount} reviewed
              </div>
            )}
            <FailedBadge count={failedCount} />
          </div>
        )}
      </div>

      {isError ? (
        <QueryError error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => <div key={k} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Validate a presentation and your results will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <SubmissionCard key={sub.id} variant="user" sub={sub} />
          ))}
        </div>
      )}
    </div>
  )
}
