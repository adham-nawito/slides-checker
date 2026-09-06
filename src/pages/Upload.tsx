import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatBytes } from '@/lib/utils'
import { SeverityIcon } from '@/components/shared/SeverityIcon'
import { QueryError } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DropZone } from '@/components/upload/DropZone'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { tagsApi, submissionsApi } from '@/lib/api'
import { parsePptx } from '@/lib/pptxParser'
import { validatePresentation, checkPresentationLevelRules } from '@/lib/pptxValidator'
import type { Tag, ValidationReport, SlideIssue, RuleSet } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'validating' | 'passed' | 'failed' | 'error' | 'submitting' | 'submitted'

interface Result {
  report: ValidationReport
  passPercent: number
  passed: boolean
  slideCount: number
}

// yield to the browser for one frame so progress updates render
const tick = () => new Promise<void>((r) => setTimeout(r, 0))

// ─── Component ────────────────────────────────────────────────────────────────

export default function Upload() {
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [file, setFile]                   = useState<File | null>(null)
  const [status, setStatus]               = useState<Status>('idle')
  const [progress, setProgress]           = useState(0)
  const [progressMsg, setProgressMsg]     = useState('')
  const [result, setResult]               = useState<Result | null>(null)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)

  const {
    data: tags = [],
    isLoading: tagsLoading,
    isError: tagsError,
    error: tagsErrorMsg,
    refetch: refetchTags,
  } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const selectedTag = tags.find((t) => t.id === selectedTagId) ?? null

  function handleFiles(dropped: { file: File; error?: string }[]) {
    const valid = dropped.find((d) => !d.error)
    if (!valid) return
    setFile(valid.file)
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
  }

  async function startValidation() {
    if (!file || !selectedTag) return

    setStatus('validating')
    setProgress(0)
    setProgressMsg('Reading file…')
    setResult(null)
    setErrorMsg(null)

    try {
      // Build internal RuleSet adapter from the tag
      const ruleSet: RuleSet = {
        id:          selectedTag.id,
        name:        selectedTag.name,
        description: '',
        rules:       selectedTag.rules,
        tags:        [],
        createdAt:   selectedTag.createdAt,
        updatedAt:   selectedTag.createdAt,
      }

      setProgress(15); setProgressMsg('Unpacking slides…'); await tick()
      const parsed = await parsePptx(file)

      setProgress(60); setProgressMsg(`Checking ${parsed.slideCount} slides…`); await tick()
      const presIssues = checkPresentationLevelRules(parsed, ruleSet)

      setProgress(80); setProgressMsg('Applying rules…'); await tick()
      const report = validatePresentation(parsed, ruleSet, 'local', file.name)

      // Merge presentation-level issues
      if (presIssues.length > 0) {
        report.issues.unshift(...presIssues)
        presIssues.forEach((i) => {
          if (i.severity === 'error')   report.summary.errors++
          if (i.severity === 'warning') report.summary.warnings++
          if (i.severity === 'info')    report.summary.infos++
        })
      }

      setProgress(95); setProgressMsg('Calculating score…'); await tick()

      const totalRules   = ruleSet.rules.length
      const passPercent  = totalRules > 0
        ? Math.round((report.summary.passing / totalRules) * 100)
        : 100
      const passed = passPercent >= selectedTag.threshold

      const res: Result = { report, passPercent, passed, slideCount: parsed.slideCount }
      setProgress(100)
      setResult(res)

      if (passed) {
        setStatus('submitting')
        try {
          await submissionsApi.submit({
            fileName:    file.name,
            fileSize:    file.size,
            tagId:       selectedTag.id,
            tagName:     selectedTag.name,
            tagColor:    selectedTag.color,
            passPercent,
            slideCount:  parsed.slideCount,
            summary:     report.summary,
            issues:      report.issues,
          }, file)
          setStatus('submitted')
        } catch (submitErr) {
          // Still show the pass result; just note the submission failed
          setErrorMsg(submitErr instanceof Error ? submitErr.message : 'Submission failed')
          setStatus('passed')
        }
      } else {
        setStatus('failed')
      }

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process file')
      setStatus('error')
    }
  }

  const canValidate   = !!file && !!selectedTagId && status !== 'validating' && status !== 'submitting'
  const isProcessing  = status === 'validating' || status === 'submitting'

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Validate Presentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a PowerPoint file and check it against your team&apos;s formatting guidelines.
        </p>
      </div>

      {/* Tag selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Select Guideline Set</CardTitle>
        </CardHeader>
        <CardContent>
          {tagsLoading ? (
            <div className="h-9 bg-muted animate-pulse rounded-md" />
          ) : tagsError ? (
            <QueryError error={tagsErrorMsg} onRetry={refetchTags} />
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No guidelines configured yet. Ask your admin to create one.
            </p>
          ) : (
            <>
              <Select value={selectedTagId} onValueChange={setSelectedTagId} disabled={isProcessing}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose guidelines to validate against…" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: tag.color }}
                        />
                        {tag.name}
                        <span className="text-muted-foreground text-xs">
                          ({tag.rules.length} rules · {tag.threshold}% threshold)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTag && selectedTag.rules.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  This guideline set has no rules — any file will pass automatically. Ask your admin to add rules.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Presentation File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DropZone onFiles={handleFiles} disabled={isProcessing} />

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
              <FileCheck className="w-4 h-4 text-green-600 shrink-0" />
              <span className="font-medium text-foreground truncate">{file.name}</span>
              <span className="ml-auto shrink-0">{formatBytes(file.size)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validate button */}
      <Button className="w-full" size="lg" onClick={startValidation} disabled={!canValidate}>
        {isProcessing
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
          : 'Validate Presentation'
        }
      </Button>

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{progressMsg}</p>
        </div>
      )}

      {/* Result */}
      {(status === 'passed' || status === 'submitted' || status === 'failed' || status === 'error') && result && (
        <ResultPanel status={status} result={result} tag={selectedTag} />
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({ status, result, tag }: { status: Status; result: Result; tag: Tag | null }) {
  const { report, passPercent, passed } = result

  return (
    <Card className={passed ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}>
      <CardContent className="pt-5 space-y-4">

        {/* Pass / Fail header */}
        <div className="flex items-center gap-3">
          {passed
            ? <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />
            : <XCircle      className="w-7 h-7 text-red-600   shrink-0" />
          }
          <div>
            <p className={`text-lg font-bold ${passed ? 'text-green-700' : 'text-red-700'}`}>
              {passed ? 'Passed' : 'Failed'} — {passPercent}% pass rate
            </p>
            {tag && (
              <p className="text-xs text-muted-foreground">
                Threshold: {tag.threshold}% · {report.slideCount} slides checked
              </p>
            )}
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          {report.summary.errors   > 0 && <Badge variant="destructive">{report.summary.errors} errors</Badge>}
          {report.summary.warnings > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">{report.summary.warnings} warnings</Badge>
          )}
          {report.summary.infos    > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">{report.summary.infos} info</Badge>
          )}
          <Badge variant="outline">{report.summary.passing} rules passing</Badge>
        </div>

        {/* Submitted notice */}
        {status === 'submitted' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 border border-green-200 text-green-800 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Submitted for admin review.
          </div>
        )}

        {/* Issues list */}
        {report.issues.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {report.issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function IssueRow({ issue }: { issue: SlideIssue }) {
  return (
    <div className="flex gap-2 items-start rounded-md px-2 py-1.5 hover:bg-background/60 transition-colors">
      <SeverityIcon severity={issue.severity} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{issue.ruleName}</p>
        <p className="text-xs text-muted-foreground">
          {issue.slideIndex > 0 && <span className="mr-1">Slide {issue.slideIndex + 1}:</span>}
          {issue.message}
        </p>
      </div>
      <SeverityBadge severity={issue.severity} />
    </div>
  )
}
