import { Link } from '@tanstack/react-router'
import { Upload, FileBarChart2, Tag, Settings2, AlertCircle, AlertTriangle, CheckCircle2, Files } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { FileStatusBadge } from '@/components/shared/FileStatusBadge'
import { TagBadge } from '@/components/shared/TagBadge'
import { useAppStore } from '@/store/useAppStore'

export default function Dashboard() {
  const files = useAppStore((s) => s.files)
  const tags = useAppStore((s) => s.tags)
  const reports = useAppStore((s) => s.reports)
  const ruleSets = useAppStore((s) => s.ruleSets)

  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]))

  const totalErrors = reports.reduce((acc, r) => acc + r.summary.errors, 0)
  const totalWarnings = reports.reduce((acc, r) => acc + r.summary.warnings, 0)
  const validatedFiles = files.filter((f) => f.status === 'validated').length

  const recentFiles = [...files].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your PowerPoint validation workspace."
        actions={
          <Button asChild>
            <Link to="/upload">
              <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
              Upload Files
            </Link>
          </Button>
        }
      />

      <div className="px-8 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Files className="w-5 h-5" />} label="Total Files" value={files.length} color="bg-blue-50 text-blue-600" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Validated" value={validatedFiles} color="bg-green-50 text-green-600" />
          <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Total Errors" value={totalErrors} color="bg-red-50 text-red-600" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Total Warnings" value={totalWarnings} color="bg-amber-50 text-amber-600" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent files */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Files</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/upload">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border" role="list" aria-label="Recent files">
                {recentFiles.map((file) => (
                  <li key={file.id} className="flex items-center gap-4 px-6 py-3 hover:bg-accent/50 transition-colors">
                    <FileBarChart2 className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {file.tags.slice(0, 2).map((tid) => tagMap[tid] && (
                        <TagBadge key={tid} tag={tagMap[tid]} />
                      ))}
                      <FileStatusBadge status={file.status} />
                    </div>
                  </li>
                ))}
                {recentFiles.length === 0 && (
                  <li className="px-6 py-8 text-center text-sm text-muted-foreground">No files uploaded yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickAction to="/upload" icon={<Upload className="w-4 h-4" />} label="Upload Files" description="Add new .pptx files" />
                <QuickAction to="/tags" icon={<Tag className="w-4 h-4" />} label="Manage Tags" description={`${tags.length} tags configured`} />
                <QuickAction to="/rules" icon={<Settings2 className="w-4 h-4" />} label="Rule Builder" description={`${ruleSets.length} rule sets`} />
                <QuickAction to="/reports" icon={<FileBarChart2 className="w-4 h-4" />} label="View Reports" description={`${reports.length} reports generated`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => <TagBadge key={t.id} tag={t} />)}
                  {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reports summary */}
        {reports.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Latest Reports</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reports">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border" role="list" aria-label="Validation reports">
                {reports.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-6 py-3 hover:bg-accent/50 transition-colors">
                    <FileBarChart2 className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.fileName}</p>
                      <p className="text-xs text-muted-foreground">Rule set: {r.ruleSetName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.summary.errors > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {r.summary.errors} errors
                        </Badge>
                      )}
                      {r.summary.warnings > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs border">
                          {r.summary.warnings} warnings
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/reports/$reportId" params={{ reportId: r.id }}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${color}`} aria-hidden="true">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({ to, icon, label, description }: { to: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0" aria-hidden="true">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
