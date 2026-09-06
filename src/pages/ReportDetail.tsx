import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import {
  Download, AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronLeft,
  LayoutGrid, List, FileBarChart2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/layout/PageHeader'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { useAppStore } from '@/store/useAppStore'
import type { SlideIssue, IssueSeverity } from '@/types'

// Simulated slide thumbnail component
function SlideThumbnail({
  slideIndex,
  issues,
  onClick,
  active,
}: {
  slideIndex: number
  issues: SlideIssue[]
  onClick: () => void
  active: boolean
}) {
  const hasErrors = issues.some((i) => i.severity === 'error')
  const hasWarnings = issues.some((i) => i.severity === 'warning')

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
      aria-label={`Slide ${slideIndex + 1}${issues.length > 0 ? `, ${issues.length} issue${issues.length > 1 ? 's' : ''}` : ', no issues'}`}
      aria-pressed={active}
    >
      {/* Simulated slide preview */}
      <div
        className="w-full aspect-video rounded bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-2 left-2 right-2 h-2 bg-slate-300 rounded" />
        <div className="absolute top-6 left-2 right-8 h-1.5 bg-slate-200 rounded" />
        <div className="absolute top-9 left-2 right-6 h-1.5 bg-slate-200 rounded" />
        <span className="text-slate-400 text-xs font-mono">{slideIndex + 1}</span>

        {/* Issue indicators */}
        {(hasErrors || hasWarnings) && (
          <div className="absolute top-1 right-1 flex gap-0.5">
            {hasErrors && <div className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />}
            {hasWarnings && <div className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />}
          </div>
        )}

        {/* Issue highlight overlay */}
        {issues.length > 0 && (
          <div
            className={`absolute inset-0 border-2 rounded opacity-60 ${
              hasErrors ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'
            }`}
            aria-hidden="true"
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">Slide {slideIndex + 1}</span>
      {issues.length > 0 && (
        <Badge
          variant={hasErrors ? 'destructive' : 'secondary'}
          className={`text-xs h-4 px-1 ${!hasErrors ? 'bg-amber-100 text-amber-700' : ''}`}
        >
          {issues.length}
        </Badge>
      )}
    </button>
  )
}

function IssueListItem({ issue }: { issue: SlideIssue }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
      role="listitem"
    >
      <SeverityBadge severity={issue.severity} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{issue.message}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span>Slide {issue.slideIndex + 1}{issue.slideTitle ? ` — ${issue.slideTitle}` : ''}</span>
          {issue.actual && <span>Got: <code className="bg-muted px-1 rounded">{issue.actual}</code></span>}
          {issue.expected && <span>Expected: <code className="bg-muted px-1 rounded">{issue.expected}</code></span>}
        </div>
      </div>
    </div>
  )
}

export default function ReportDetail() {
  const { reportId } = useParams({ from: '/layout/reports/$reportId' })
  const reports = useAppStore((s) => s.reports)
  const report = reports.find((r) => r.id === reportId)

  const [activeSlide, setActiveSlide] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="text-center">
          <p className="text-lg font-semibold">Report not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/reports">Back to Reports</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Build per-slide issue map
  const slideIssues: Record<number, SlideIssue[]> = {}
  report.issues.forEach((issue) => {
    if (!slideIssues[issue.slideIndex]) slideIssues[issue.slideIndex] = []
    slideIssues[issue.slideIndex].push(issue)
  })

  const slides = Array.from({ length: report.slideCount }, (_, i) => i)

  const filteredIssues = report.issues.filter(
    (i) => severityFilter === 'all' || i.severity === severityFilter,
  )

  const activeSlideIssues = activeSlide !== null ? (slideIssues[activeSlide] ?? []) : []

  const passPercent = Math.round((report.summary.passing / (report.summary.passing + report.summary.errors + report.summary.warnings + report.summary.infos)) * 100)

  const handleExportPdf = () => {
    // In a real app: call validationApi.exportPdf(report.id) and download blob
    alert('PDF export would be triggered here via the backend API.')
  }

  return (
    <div>
      <PageHeader
        title={report.fileName}
        description={`Validation report · Rule set: ${report.ruleSetName} · ${new Date(report.createdAt).toLocaleString()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/reports">
                <ChevronLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
                All Reports
              </Link>
            </Button>
            <Button onClick={handleExportPdf}>
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="px-8 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Errors"
            value={report.summary.errors}
            color="text-red-600 bg-red-50"
            onClick={() => setSeverityFilter(severityFilter === 'error' ? 'all' : 'error')}
            active={severityFilter === 'error'}
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Warnings"
            value={report.summary.warnings}
            color="text-amber-600 bg-amber-50"
            onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
            active={severityFilter === 'warning'}
          />
          <SummaryCard
            icon={<Info className="w-5 h-5" />}
            label="Info"
            value={report.summary.infos}
            color="text-blue-600 bg-blue-50"
            onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
            active={severityFilter === 'info'}
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Passing"
            value={report.summary.passing}
            color="text-green-600 bg-green-50"
            onClick={() => setSeverityFilter('all')}
            active={false}
          />
        </div>

        {/* Pass rate */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Pass Rate</span>
              <span className="text-sm font-bold">{passPercent}%</span>
            </div>
            <Progress
              value={passPercent}
              className="h-2"
              aria-label={`Pass rate: ${passPercent}%`}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="slides">
          <TabsList>
            <TabsTrigger value="slides">Slide View</TabsTrigger>
            <TabsTrigger value="issues">Issue List ({filteredIssues.length})</TabsTrigger>
            <TabsTrigger value="bytype">By Type</TabsTrigger>
          </TabsList>

          {/* Slide grid tab */}
          <TabsContent value="slides" className="mt-4">
            <div className="flex gap-6">
              {/* Thumbnail grid */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{report.slideCount} slides</p>
                  <div className="flex items-center gap-1" role="group" aria-label="View mode">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setViewMode('grid')}
                      aria-pressed={viewMode === 'grid'}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setViewMode('list')}
                      aria-pressed={viewMode === 'list'}
                      aria-label="List view"
                    >
                      <List className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {viewMode === 'grid' ? (
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
                    role="list"
                    aria-label="Slide thumbnails"
                  >
                    {slides.map((i) => (
                      <div key={i} role="listitem">
                        <SlideThumbnail
                          slideIndex={i}
                          issues={slideIssues[i] ?? []}
                          onClick={() => setActiveSlide(activeSlide === i ? null : i)}
                          active={activeSlide === i}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2" aria-label="Slide list">
                    {slides.map((i) => {
                      const issues = slideIssues[i] ?? []
                      const hasErrors = issues.some((iss) => iss.severity === 'error')
                      return (
                        <li key={i}>
                          <button
                            onClick={() => setActiveSlide(activeSlide === i ? null : i)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              activeSlide === i ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                            }`}
                            aria-pressed={activeSlide === i}
                          >
                            <FileBarChart2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <span className="flex-1 text-sm">Slide {i + 1}</span>
                            {issues.length > 0 ? (
                              <Badge
                                variant={hasErrors ? 'destructive' : 'secondary'}
                                className={`text-xs ${!hasErrors ? 'bg-amber-100 text-amber-700' : ''}`}
                              >
                                {issues.length} issue{issues.length !== 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Issue detail panel */}
              {activeSlide !== null && (
                <div className="w-72 shrink-0" aria-live="polite" aria-label="Slide issues detail">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Slide {activeSlide + 1} Issues
                        {activeSlideIssues.length === 0 && (
                          <span className="ml-2 text-green-600 font-normal text-xs">No issues</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {activeSlideIssues.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 pb-4 text-sm text-green-700">
                          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                          All rules pass for this slide.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border" role="list">
                          {activeSlideIssues.map((issue) => (
                            <li key={issue.id}>
                              <IssueListItem issue={issue} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Issues list tab */}
          <TabsContent value="issues" className="mt-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">All Issues</CardTitle>
                {severityFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setSeverityFilter('all')}>
                    Clear filter
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {filteredIssues.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">No issues match the current filter.</p>
                ) : (
                  <ul className="divide-y divide-border" role="list" aria-label="All validation issues">
                    {filteredIssues.map((issue) => (
                      <li key={issue.id}>
                        <IssueListItem issue={issue} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By type tab */}
          <TabsContent value="bytype" className="mt-4">
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(report.issuesByType).map(([typeName, issues]) => (
                <AccordionItem key={typeName} value={typeName} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={issues[0].severity} />
                      <span className="font-medium text-sm">{typeName}</span>
                      <Badge variant="secondary" className="ml-1">{issues.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <ul className="divide-y divide-border border-t" role="list">
                      {issues.map((issue) => (
                        <li key={issue.id}>
                          <IssueListItem issue={issue} />
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'
      }`}
      aria-pressed={active}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`} aria-hidden="true">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </button>
  )
}
