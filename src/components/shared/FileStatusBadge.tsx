import { cn } from '@/lib/utils'
import type { FileStatus } from '@/types'

const config: Record<FileStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  uploading: { label: 'Uploading', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  uploaded: { label: 'Uploaded', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  validating: { label: 'Validating', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  validated: { label: 'Validated', className: 'bg-green-100 text-green-700 border-green-200' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 border-red-200' },
}

export function FileStatusBadge({ status, className }: { status: FileStatus; className?: string }) {
  const { label, className: cls } = config[status]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', cls, className)}>
      {label}
    </span>
  )
}
