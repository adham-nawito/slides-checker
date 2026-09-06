import { XCircle, AlertTriangle, Info } from 'lucide-react'
import type { IssueSeverity } from '@/types'

/**
 * Small icon that conveys severity visually.
 * size="sm"  → 12×12  (used in dense issue lists)
 * size="md"  → 14×14  (used in result panels)
 */
export function SeverityIcon({
  severity,
  size = 'sm',
}: {
  severity: IssueSeverity
  size?: 'sm' | 'md'
}) {
  const cls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  if (severity === 'error')
    return <XCircle className={`${cls} text-red-500 shrink-0`} aria-label="Error" />
  if (severity === 'warning')
    return <AlertTriangle className={`${cls} text-amber-500 shrink-0`} aria-label="Warning" />
  return <Info className={`${cls} text-blue-500 shrink-0`} aria-label="Info" />
}
