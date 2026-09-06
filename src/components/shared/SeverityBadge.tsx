import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IssueSeverity } from '@/types'

const config: Record<IssueSeverity, { label: string; className: string; Icon: typeof Info }> = {
  error: { label: 'Error', className: 'bg-red-100 text-red-700 border-red-200', Icon: AlertCircle },
  warning: { label: 'Warning', className: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertTriangle },
  info: { label: 'Info', className: 'bg-blue-100 text-blue-700 border-blue-200', Icon: Info },
}

interface SeverityBadgeProps {
  severity: IssueSeverity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const { label, className: cls, Icon } = config[severity]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cls, className)}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  )
}
