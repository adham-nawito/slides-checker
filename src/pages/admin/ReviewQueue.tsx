import { useState } from 'react'
import { CheckCircle2, Clock, ChevronDown, ChevronUp, FileBarChart2, XCircle, AlertTriangle, Info, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function download(id: string, fileName: string) {
    if (downloading) return
    setDownloading(id)
    try {
      const raw = localStorage.getItem('pptx-auth')
      const token = raw ? JSON.parse(raw).token : null
      const res = await fetch(submissionsApi.downloadUrl(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(null)
    }
  }

  return { download, downloading }
}

function SubmissionCard({ sub, onReview }: { sub: Submission; onReview: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { download, downloading } = useDownload()
  const isPending = sub.status === 'pending'

  return (
    <Card className={isPending ? 'border-green-200' : 'opacity-70'}>
      <CardContent className="py-4 px-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
            <FileBarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{sub.fileName}</p>
              {isPending
                ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] py-0 shrink-0">Pending review</Badge>
                : <Badge variant="secondary" className="text-[10px] py-0 shrink-0">Reviewed</Badge>
              }
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ background: '#6366f1' }}
              />
              {sub.tagName} · {formatBytes(sub.fileSize)} · {sub.slideCount} slides · {timeAgo(sub.submittedAt)}
              {sub.submittedBy && (
                <span className="ml-1.5 text-muted-foreground/70">· by {sub.submittedBy}</span>
              )}
            </p>
          </div>

          {/* Pass badge */}
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

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'View'} issues ({sub.issues.length})
          </Button>

          {/* Download button — always visible for admin */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => download(sub.id, sub.fileName)}
            disabled={downloading === sub.id}
          >
            <Download className="w-3.5 h-3.5" />
            {downloading === sub.id ? 'Downloading…' : 'Download'}
          </Button>

          {isPending && (
            <Button
              size="sm"
              className="ml-auto text-xs"
              onClick={() => onReview(sub.id)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Mark as Reviewed
            </Button>
          )}

          {!isPending && sub.reviewedAt && (
            <p className="ml-auto text-xs text-muted-foreground">
              Reviewed {timeAgo(sub.reviewedAt)}
            </p>
          )}
        </div>

        {/* Expanded issues */}
        {expanded && sub.issues.length > 0 && (
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

        {expanded && sub.issues.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No issues — all rules passed.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const qc = useQueryClient()

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: submissionsApi.list,
    refetchInterval: 15_000, // poll every 15s for new submissions
  })

  const reviewMutation = useMutation({
    mutationFn: submissionsApi.markReviewed,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions'] }),
  })

  const pending  = submissions.filter((s) => s.status === 'pending')
  const reviewed = submissions.filter((s) => s.status === 'reviewed')

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Presentations that passed validation and are awaiting your content review.
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {pending.length} pending
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
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Queue is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submissions will appear here when users upload presentations that pass validation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending
              {pending.length > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200 border text-[10px]">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Reviewed
              {reviewed.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">{reviewed.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending submissions.</p>
            ) : (
              pending.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  onReview={(id) => reviewMutation.mutate(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-3">
            {reviewed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No reviewed submissions yet.</p>
            ) : (
              reviewed.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  onReview={(id) => reviewMutation.mutate(id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
