import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  className?: string
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white', className)}
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-full"
          aria-label={`Remove tag ${tag.name}`}
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
