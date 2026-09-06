import { Link } from '@tanstack/react-router'
import { FileBarChart2, AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAppStore } from '@/store/useAppStore'

export default function Reports() {
  const reports = useAppStore((s) => s.reports)

  return (
    <div>
      <PageHeader
        title="Validation Reports"
        description="View and download formatting validation reports for your uploaded files."
      />

      <div className="px-8 py-8 max-w-4xl space-y-4">
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileBarChart2 className="w-12 h-12" />}
            title="No reports yet"
            description="Upload files and run validation to generate reports."
            action={
              <Button asChild>
                <Link to="/upload">Upload Files</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4" aria-label="Validation reports">
            {reports.map((report) => (
              <li key={report.id}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-primary/10 shrink-0">
                          <FileBarChart2 className="w-4 h-4 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{report.fileName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Rule set: <span className="font-medium">{report.ruleSetName}</span>
                            &nbsp;&middot;&nbsp;{report.slideCount} slides
                            &nbsp;&middot;&nbsp;{new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="shrink-0">
                        <Link to="/reports/$reportId" params={{ reportId: report.id }}>
                          View Report
                          <ChevronRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
                        <span className="text-sm font-medium text-red-700">{report.summary.errors}</span>
                        <span className="text-xs text-muted-foreground">errors</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        <span className="text-sm font-medium text-amber-700">{report.summary.warnings}</span>
                        <span className="text-xs text-muted-foreground">warnings</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-500" aria-hidden="true" />
                        <span className="text-sm font-medium text-blue-700">{report.summary.infos}</span>
                        <span className="text-xs text-muted-foreground">infos</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-muted-foreground">Passing:</span>
                        <span className="text-sm font-medium text-green-700">{report.summary.passing}</span>
                      </div>
                    </div>

                    {/* Top issues */}
                    {report.issues.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2" aria-label="Top issue types">
                        {Object.keys(report.issuesByType).slice(0, 4).map((typeName) => (
                          <div key={typeName} className="flex items-center gap-1">
                            <SeverityBadge severity={report.issuesByType[typeName][0].severity} />
                            <span className="text-xs text-muted-foreground">{typeName} ({report.issuesByType[typeName].length})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
