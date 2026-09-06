import { Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { ValidationRule, RuleType, RuleOperator, IssueSeverity } from '@/types'

const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: 'font_size', label: 'Font Size (pt)' },
  { value: 'font_family', label: 'Font Family' },
  { value: 'font_color', label: 'Font Color' },
  { value: 'background_color', label: 'Background Color' },
  { value: 'header_presence', label: 'Header Presence' },
  { value: 'footer_presence', label: 'Footer Presence' },
  { value: 'slide_count', label: 'Slide Count' },
  { value: 'image_count', label: 'Image Count' },
  { value: 'text_alignment', label: 'Text Alignment' },
  { value: 'line_spacing', label: 'Line Spacing' },
]

const OPERATORS_BY_TYPE: Record<RuleType, { value: RuleOperator; label: string }[]> = {
  font_size: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  font_family: [{ value: 'equals', label: 'equals' }, { value: 'contains', label: 'contains' }],
  font_color: [{ value: 'equals', label: 'equals' }],
  background_color: [{ value: 'equals', label: 'equals' }],
  header_presence: [{ value: 'exists', label: 'exists' }],
  footer_presence: [{ value: 'exists', label: 'exists' }],
  slide_count: [{ value: 'equals', label: 'equals' }, { value: 'less_than', label: 'less than' }, { value: 'greater_than', label: 'greater than' }],
  image_count: [{ value: 'equals', label: 'equals' }, { value: 'less_than', label: 'less than' }, { value: 'greater_than', label: 'greater than' }],
  text_alignment: [{ value: 'equals', label: 'equals' }],
  line_spacing: [{ value: 'equals', label: 'equals' }, { value: 'greater_than', label: 'greater than' }],
}

const VALUE_PLACEHOLDERS: Record<RuleType, string> = {
  font_size: '24',
  font_family: 'Arial',
  font_color: '#003087',
  background_color: '#FFFFFF',
  header_presence: 'true',
  footer_presence: 'true',
  slide_count: '20',
  image_count: '1',
  text_alignment: 'left',
  line_spacing: '1.5',
}

const SEVERITIES: { value: IssueSeverity; label: string }[] = [
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

interface RuleRowProps {
  rule: ValidationRule
  index: number
  onChange: (patch: Partial<ValidationRule>) => void
  onDelete: () => void
}

export function RuleRow({ rule, index, onChange, onDelete }: RuleRowProps) {
  const operators = OPERATORS_BY_TYPE[rule.type] ?? []
  const isPresenceRule = rule.type === 'header_presence' || rule.type === 'footer_presence'

  return (
    <li
      className="grid gap-3 p-4 rounded-lg border border-border bg-card"
      aria-label={`Rule ${index + 1}: ${rule.name || 'Unnamed rule'}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground mt-2 shrink-0 cursor-grab" aria-hidden="true" />
        <div className="flex-1 grid gap-3 sm:grid-cols-2">
          {/* Name */}
          <div>
            <Label htmlFor={`rule-name-${rule.id}`} className="text-xs">Rule Name</Label>
            <Input
              id={`rule-name-${rule.id}`}
              value={rule.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Title Font Size"
              className="mt-1 h-8 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor={`rule-type-${rule.id}`} className="text-xs">Rule Type</Label>
            <Select
              value={rule.type}
              onValueChange={(v) => onChange({ type: v as RuleType, operator: OPERATORS_BY_TYPE[v as RuleType][0].value })}
            >
              <SelectTrigger id={`rule-type-${rule.id}`} className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          {!isPresenceRule && (
            <div>
              <Label htmlFor={`rule-op-${rule.id}`} className="text-xs">Operator</Label>
              <Select value={rule.operator} onValueChange={(v) => onChange({ operator: v as RuleOperator })}>
                <SelectTrigger id={`rule-op-${rule.id}`} className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value */}
          {!isPresenceRule && (
            <div>
              <Label htmlFor={`rule-val-${rule.id}`} className="text-xs">Expected Value</Label>
              <Input
                id={`rule-val-${rule.id}`}
                value={rule.value}
                onChange={(e) => onChange({ value: e.target.value })}
                placeholder={VALUE_PLACEHOLDERS[rule.type]}
                className="mt-1 h-8 text-sm"
                type={rule.type === 'font_color' || rule.type === 'background_color' ? 'text' : 'text'}
              />
            </div>
          )}

          {/* Severity */}
          <div>
            <Label htmlFor={`rule-sev-${rule.id}`} className="text-xs">Severity</Label>
            <Select value={rule.severity} onValueChange={(v) => onChange({ severity: v as IssueSeverity })}>
              <SelectTrigger id={`rule-sev-${rule.id}`} className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Description (optional) */}
          <div className="sm:col-span-2">
            <Label htmlFor={`rule-desc-${rule.id}`} className="text-xs">Description (optional)</Label>
            <Input
              id={`rule-desc-${rule.id}`}
              value={rule.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Brief explanation for report output"
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
          onClick={onDelete}
          aria-label={`Delete rule ${rule.name || index + 1}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
