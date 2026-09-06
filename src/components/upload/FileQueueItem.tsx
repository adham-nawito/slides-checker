import { FileBarChart2, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { TagBadge } from '@/components/shared/TagBadge'
import type { Tag } from '@/types'

export interface QueuedFile {
  id: string
  file: File
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
  tagIds: string[]
}

interface FileQueueItemProps {
  item: QueuedFile
  tags: Tag[]
  onRemove: (id: string) => void
  onRemoveTag: (fileId: string, tagId: string) => void
}

export function FileQueueItem({ item, tags, onRemove, onRemoveTag }: FileQueueItemProps) {
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]))
  const sizeMb = (item.file.size / (1024 * 1024)).toFixed(1)

  return (
    <li className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-card" aria-label={`File: ${item.file.name}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 shrink-0">
          <FileBarChart2 className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.file.name}</p>
          <p className="text-xs text-muted-foreground">{sizeMb} MB</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.status === 'uploading' && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" aria-label="Uploading" />
          )}
          {item.status === 'done' && (
            <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="Upload complete" />
          )}
          {item.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-600" aria-label="Upload failed" />
          )}
          {item.status !== 'uploading' && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.file.name}`}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {item.status === 'uploading' && (
        <Progress value={item.progress} className="h-1.5" aria-label={`Upload progress: ${item.progress}%`} />
      )}

      {item.error && (
        <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {item.error}
        </p>
      )}

      {item.tagIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1" aria-label="File tags">
          {item.tagIds.map((tid) => tagMap[tid] && (
            <TagBadge
              key={tid}
              tag={tagMap[tid]}
              onRemove={() => onRemoveTag(item.id, tid)}
            />
          ))}
        </div>
      )}
    </li>
  )
}
