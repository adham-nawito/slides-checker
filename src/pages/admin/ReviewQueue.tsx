import { useState, useMemo } from 'react'
import { CheckCircle2, Search, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { submissionsApi, tagsApi } from '@/lib/api'
import { SubmissionCard, PendingBadge } from '@/components/shared/SubmissionCard'
import { QueryError } from '@/components/shared/ErrorBoundary'

export default function ReviewQueue() {
  const qc = useQueryClient()
  const [search,      setSearch]      = useState('')
  const [filterTagId, setFilterTagId] = useState('all')

  const {
    data: allSubmissions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['submissions'],
    queryFn:  submissionsApi.list,
    refetchInterval: 15_000,
  })

  const reviewMutation = useMutation({
    mutationFn: submissionsApi.markReviewed,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['submissions'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: submissionsApi.remove,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['submissions'] }),
  })

  // All tags — drives the filter dropdown independently of what's in the queue
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn:  tagsApi.list,
  })

  // Admin review queue only shows pending + reviewed (not failed — those are user history only)
  const queueSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.status !== 'failed'),
    [allSubmissions],
  )

  // Reset tag filter if the selected tag is deleted
  const tagOptions = allTags

  // Apply search + tag filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return queueSubmissions.filter((s) => {
      const matchesSearch = !q ||
        s.fileName.toLowerCase().includes(q) ||
        s.submittedBy?.toLowerCase().includes(q)
      const matchesTag = filterTagId === 'all' || s.tagId === filterTagId
      return matchesSearch && matchesTag
    })
  }, [queueSubmissions, search, filterTagId])

  const pending  = filtered.filter((s) => s.status === 'pending')
  const reviewed = filtered.filter((s) => s.status === 'reviewed')
  const totalPending = queueSubmissions.filter((s) => s.status === 'pending').length
  const isFiltering  = search.trim() !== '' || filterTagId !== 'all'

  function clearFilters() { setSearch(''); setFilterTagId('all') }

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
        <PendingBadge count={totalPending} />
      </div>

      {isError ? (
        <QueryError error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => <div key={k} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : queueSubmissions.length === 0 ? (
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
        <>
          {/* Filter bar */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by file name or user…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={filterTagId} onValueChange={setFilterTagId}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All guideline tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All guideline tags</SelectItem>
                {tagOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>

            {isFiltering && (
              <Button variant="ghost" size="sm" className="text-xs h-9 px-2 text-muted-foreground" onClick={clearFilters}>
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Tabs */}
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
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isFiltering ? 'No pending submissions match your filters.' : 'No pending submissions.'}
                </p>
              ) : (
                pending.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    variant="admin"
                    sub={sub}
                    onReview={(id) => reviewMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    deleting={deleteMutation.isPending && deleteMutation.variables === sub.id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="space-y-3">
              {reviewed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isFiltering ? 'No reviewed submissions match your filters.' : 'No reviewed submissions yet.'}
                </p>
              ) : (
                reviewed.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    variant="admin"
                    sub={sub}
                    onReview={(id) => reviewMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    deleting={deleteMutation.isPending && deleteMutation.variables === sub.id}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
