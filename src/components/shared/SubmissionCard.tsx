/**
 * Shared submission card used by both ReviewQueue (admin) and MySubmissions (user).
 *
 * Use `variant="admin"` and pass the action callbacks for the admin view.
 * Use `variant="user"` for the read-only user view.
 */

import { useState } from 'react'
import {
  CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
  FileBarChart2, Download, Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { submissionsApi } from '@/lib/api'
import { formatBytes, timeAgo } from '@/lib/utils'
import { SeverityIcon } from '@/components/shared/SeverityIcon'
import { getStoredUser } from '@/store/authStore'
import type { Submission } from '@/types'

// ─── Download hook ────────────────────────────────────────────────────────────

function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function download(id: string, fileName: string) {
    if (downloading) return
    setDownloading(id)
    try {
      const token = getStoredUser()?.token
      const res = await fetch(submissionsApi.downloadUrl(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[download]', err)
    } finally {
      setDownloading(null)
    }
  }

  return { download, downloading }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, variant }: { status: Submission['status']; variant: 'admin' | 'user' }) {
  if (status === 'failed') {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 border text-[10px] py-0 shrink-0">
        Failed validation
      </Badge>
    )
  }
  if (status === 'reviewed') {
    return variant === 'user' ? (
      <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px] py-0 shrink-0">
        Reviewed by admin
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-[10px] py-0 shrink-0">Reviewed</Badge>
    )
  }
  // pending
  return variant === 'user' ? (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] py-0 shrink-0">
      Awaiting review
    </Badge>
  ) : (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] py-0 shrink-0">
      Pending review
    </Badge>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type AdminProps = {
  variant: 'admin'
  sub: Submission
  onReview: (id: string) => void
  onDelete: (id: string) => void
  deleting: boolean
}

type UserProps = {
  variant: 'user'
  sub: Submission
}

type SubmissionCardProps = AdminProps | UserProps

export function SubmissionCard(props: SubmissionCardProps) {
  const { sub, variant } = props
  const [expanded,      setExpanded]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { download, downloading }         = useDownload()

  const isPending  = sub.status === 'pending'
  const isReviewed = sub.status === 'reviewed'
  const isFailed   = sub.status === 'failed'

  // Card border: green tint when reviewed (user view), normal highlight when pending (admin view)
  const cardCls =
    variant === 'user' && isReviewed ? 'border-green-200 bg-green-50/30' :
    variant === 'admin' && isPending ? 'border-green-200' :
    variant === 'admin' && !isPending ? 'opacity-70' :
    ''

  return (
    <Card className={cardCls}>
      <CardContent className="py-4 px-5 space-y-3">

        {/* ── Header ── */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
            <FileBarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{sub.fileName}</p>
              <StatusBadge status={sub.status} variant={variant} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ background: sub.tagColor || '#6366f1' }}
              />
              {sub.tagName} · {formatBytes(sub.fileSize)} · {sub.slideCount} slides · {timeAgo(sub.submittedAt)}
              {variant === 'admin' && sub.submittedBy && (
                <span className="ml-1.5 text-muted-foreground/70">· by {sub.submittedBy}</span>
              )}
            </p>
          </div>

          {/* Pass score */}
          <div className="shrink-0 text-right">
            <p className={`text-xl font-bold ${isFailed ? 'text-red-500' : 'text-green-600'}`}>
              {sub.passPercent}%
            </p>
            <p className="text-[10px] text-muted-foreground">pass rate</p>
          </div>
        </div>

        {/* ── Summary badges ── */}
        <div className="flex gap-2 flex-wrap">
          {sub.summary.errors   > 0 && (
            <Badge variant="destructive" className="text-[10px]">{sub.summary.errors} errors</Badge>
          )}
          {sub.summary.warnings > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px]">
              {sub.summary.warnings} warnings
            </Badge>
          )}
          {sub.summary.infos    > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px]">
              {sub.summary.infos} info
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{sub.summary.passing} rules passing</Badge>
        </div>

        {/* ── User: reviewed timestamp ── */}
        {variant === 'user' && isReviewed && sub.reviewedAt && (
          <p className="text-xs text-green-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Reviewed {timeAgo(sub.reviewedAt)}
          </p>
        )}

        {/* ── Admin: action row ── */}
        {variant === 'admin' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* View issues toggle */}
            <Button
              variant="ghost" size="sm" className="text-xs gap-1"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide' : 'View'} issues ({sub.issues.length})
            </Button>

            {/* Download — disabled for failed/legacy submissions without a stored file */}
            <Button
              variant="outline" size="sm" className="text-xs gap-1"
              onClick={() => download(sub.id, sub.fileName)}
              disabled={!sub.storedName || downloading === sub.id}
              title={!sub.storedName ? 'File not available for this submission' : undefined}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading === sub.id ? 'Downloading…' : 'Download'}
            </Button>

            {isPending && (
              <Button
                size="sm" className="ml-auto text-xs"
                onClick={() => (props as AdminProps).onReview(sub.id)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Mark as Reviewed
              </Button>
            )}

            {isReviewed && sub.reviewedAt && (
              <p className="text-xs text-muted-foreground ml-auto">
                Reviewed {timeAgo(sub.reviewedAt)}
              </p>
            )}

            {/* Delete with inline confirmation */}
            <div className={`flex items-center gap-1.5 shrink-0 ${isPending ? '' : 'ml-auto'}`}>
              {confirmDelete ? (
                <>
                  <span className="text-xs text-muted-foreground">Delete permanently?</span>
                  <Button
                    variant="ghost" size="sm" className="text-xs h-7 px-2"
                    onClick={() => setConfirmDelete(false)}
                    disabled={(props as AdminProps).deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive" size="sm" className="text-xs h-7 px-2"
                    onClick={() => (props as AdminProps).onDelete(sub.id)}
                    disabled={(props as AdminProps).deleting}
                  >
                    {(props as AdminProps).deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost" size="sm"
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-red-500"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── User: issues toggle ── */}
        {variant === 'user' && sub.issues.length > 0 && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} issues ({sub.issues.length})
          </button>
        )}

        {/* ── Expanded issues (both variants) ── */}
        {expanded && sub.issues.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {sub.issues.map((issue) => (
                <div key={issue.id} className="flex gap-2 items-start py-1">
                  <SeverityIcon severity={issue.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium">{issue.ruleName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {issue.slideIndex >= 0 && <span className="mr-1">Slide {issue.slideIndex + 1}:</span>}
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

// ─── Pending count badge (used by Sidebar and ReviewQueue header) ─────────────

export function PendingBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium shrink-0">
      <Clock className="w-3.5 h-3.5" />
      {count} pending
    </div>
  )
}

// ─── Failed badge (used by MySubmissions header) ──────────────────────────────

export function FailedBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium shrink-0">
      <XCircle className="w-3.5 h-3.5" />
      {count} failed
    </div>
  )
}
