import { useState } from 'react'
import { CheckCircle2, Clock, ChevronDown, ChevronUp, FileBarChart2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { submissionsApi } from '@/lib/api'
import type { Submission, SlideIssue } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

function severityIcon(s: SlideIssue['severity']) {
  if (s === 'error')   return <XCircle       className="w-3 h-3 text-red-500   shrink-0" />
  if (s === 'warning') return <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
  return                      <Info          className="w-3 h-3 text-blue-500  shrink-0" />
}

// ─── Submission card ──────────────────────────────────────────────────────────

function SubmissionCard({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false)
  const isReviewed = sub.status === 'reviewed'

  return (
    <Card className={isReviewed ? 'border-green-200 bg-green-50/30' : ''}>
      <CardContent className="py-4 px-5 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
            <FileBarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{sub.fileName}</p>
              {isReviewed ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px] py-0 shrink-0">
                  Reviewed by admin
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] py-0 shrink-0">
                  Awaiting review
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ background: sub.tagColor || '#6366f1' }}
              />
              {sub.tagName} · {formatBytes(sub.fileSize)} · {sub.slideCount} slides · {timeAgo(sub.submittedAt)}
            </p>
          </div>

          {/* Pass score */}
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold text-green-600">{sub.passPercent}%</p>
            <p className="text-[10px] text-muted-foreground">pass rate</p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          {sub.summary.errors   > 0 && <Badge variant="destructive" className="text-[10px]">{sub.summary.errors} errors</Badge>}
          {sub.summary.warnings > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px]">{sub.summary.warnings} warnings</Badge>
          )}
          {sub.summary.infos    > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px]">{sub.summary.infos} info</Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{sub.summary.passing} rules passing</Badge>
        </div>

        {/* Reviewed timestamp */}
        {isReviewed && sub.reviewedAt && (
          <p className="text-xs text-green-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Reviewed {timeAgo(sub.reviewedAt)}
          </p>
        )}

        {/* Toggle issues */}
        {sub.issues.length > 0 && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} issues ({sub.issues.length})
          </button>
        )}

        {expanded && (
          <>
            <Separator />
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {sub.issues.map((issue) => (
                <div key={issue.id} className="flex gap-2 items-start py-1">
                  {severityIcon(issue.severity)}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium">{issue.ruleName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {issue.slideIndex > 0 && <span className="mr-1">Slide {issue.slideIndex + 1}:</span>}
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MySubmissions() {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: submissionsApi.mine,
    refetchInterval: 30_000, // poll so reviewed status updates automatically
  })

  const pending  = submissions.filter((s) => s.status === 'pending').length
  const reviewed = submissions.filter((s) => s.status === 'reviewed').length

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Submissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Presentations you have submitted for admin review.
          </p>
        </div>
        {submissions.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {pending > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                {pending} pending
              </div>
            )}
            {reviewed > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {reviewed} reviewed
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => <div key={k} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Validate a presentation and it will appear here once it passes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <SubmissionCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  )
}
