import { useState } from 'react'
import { Plus, Pencil, Trash2, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { tagsApi } from '@/lib/api'
import type { Tag, ValidationRule, RuleType, RuleOperator } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#1e293b',
]

const RULE_TYPE_OPTIONS: { value: RuleType; label: string }[] = [
  { value: 'font_size',        label: 'Font Size'         },
  { value: 'font_family',      label: 'Font Family'       },
  { value: 'font_color',       label: 'Font Color'        },
  { value: 'text_alignment',   label: 'Text Alignment'    },
  { value: 'line_spacing',     label: 'Line Spacing'      },
  { value: 'header_presence',  label: 'Header Presence'   },
  { value: 'footer_presence',  label: 'Footer Presence'   },
  { value: 'slide_count',      label: 'Slide Count'       },
  { value: 'background_color', label: 'Background Color'  },
  { value: 'image_count',      label: 'Image Count'       },
]

const OPERATORS_FOR_TYPE: Record<RuleType, RuleOperator[]> = {
  font_size:        ['equals', 'greater_than', 'less_than'],
  font_family:      ['equals', 'contains'],
  font_color:       ['equals'],
  background_color: ['equals'],
  header_presence:  ['exists'],
  footer_presence:  ['exists'],
  slide_count:      ['equals', 'greater_than', 'less_than'],
  image_count:      ['equals', 'greater_than', 'less_than'],
  text_alignment:   ['equals'],
  line_spacing:     ['equals', 'greater_than', 'less_than'],
}

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals:       'equals',
  greater_than: 'greater than',
  less_than:    'less than',
  contains:     'contains',
  not_contains: 'does not contain',
  exists:       'must exist',
}

const ALIGNMENT_OPTIONS = ['left', 'center', 'right', 'justify']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newRule(): ValidationRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    type: 'font_size',
    operator: 'equals',
    value: '',
    severity: 'error',
  }
}

function defaultValueForType(type: RuleType): string {
  if (type === 'font_size' || type === 'line_spacing') return '24'
  if (type === 'slide_count' || type === 'image_count') return '10'
  if (type === 'font_color' || type === 'background_color') return '#000000'
  if (type === 'text_alignment') return 'left'
  if (type === 'header_presence' || type === 'footer_presence') return 'true'
  return ''
}

function needsValueInput(type: RuleType): boolean {
  return type !== 'header_presence' && type !== 'footer_presence'
}

// ─── Rule row editor ──────────────────────────────────────────────────────────

function RuleEditor({
  rule,
  onChange,
  onDelete,
}: {
  rule: ValidationRule
  onChange: (updated: ValidationRule) => void
  onDelete: () => void
}) {
  const operators = OPERATORS_FOR_TYPE[rule.type]

  function setType(type: RuleType) {
    const ops = OPERATORS_FOR_TYPE[type]
    onChange({
      ...rule,
      type,
      operator: ops[0],
      value: defaultValueForType(type),
    })
  }

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-start gap-2">
        {/* Rule name */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Rule name (e.g. Title font size)"
            value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            className="text-xs h-8"
          />
        </div>
        {/* Severity */}
        <Select value={rule.severity} onValueChange={(v) => onChange({ ...rule, severity: v as ValidationRule['severity'] })}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Type */}
        <Select value={rule.type} onValueChange={(v) => setType(v as RuleType)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator */}
        {operators.length > 1 && (
          <Select value={rule.operator} onValueChange={(v) => onChange({ ...rule, operator: v as RuleOperator })}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Value */}
        {needsValueInput(rule.type) && (
          rule.type === 'text_alignment' ? (
            <Select value={rule.value} onValueChange={(v) => onChange({ ...rule, value: v })}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENT_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : rule.type === 'font_color' || rule.type === 'background_color' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={rule.value || '#000000'}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                className="h-8 w-8 rounded border cursor-pointer"
              />
              <Input
                value={rule.value}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                className="w-24 h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          ) : (
            <Input
              value={rule.value}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              className="w-24 h-8 text-xs"
              placeholder={rule.type.includes('size') || rule.type.includes('count') || rule.type.includes('spacing') ? 'e.g. 24' : ''}
            />
          )
        )}
      </div>
    </div>
  )
}

// ─── Tag form (create / edit) ─────────────────────────────────────────────────

interface TagFormState {
  name: string
  color: string
  threshold: number
  rules: ValidationRule[]
}

function TagDialog({
  open,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean
  initial: TagFormState
  onClose: () => void
  onSave: (form: TagFormState) => void
  saving: boolean
}) {
  const [form, setForm] = useState<TagFormState>(initial)
  const [rulesExpanded, setRulesExpanded] = useState(true)

  function addRule() {
    setForm((f) => ({ ...f, rules: [...f.rules, newRule()] }))
  }

  function updateRule(idx: number, updated: ValidationRule) {
    setForm((f) => {
      const rules = [...f.rules]
      rules[idx] = updated
      return { ...f, rules }
    })
  }

  function deleteRule(idx: number) {
    setForm((f) => ({ ...f, rules: f.rules.filter((_, i) => i !== idx) }))
  }

  const isValid = form.name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.name ? `Edit "${initial.name}"` : 'New Guideline Set'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Corporate Branding"
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5">
            <Label htmlFor="threshold">Pass Threshold</Label>
            <div className="flex items-center gap-3">
              <input
                id="threshold"
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-medium w-12 text-right">{form.threshold}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              File must pass at least {form.threshold}% of rules to be accepted.
            </p>
          </div>

          <Separator />

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setRulesExpanded((v) => !v)}
              >
                <Settings2 className="w-4 h-4" />
                Rules
                <Badge variant="secondary" className="ml-1">{form.rules.length}</Badge>
                {rulesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <Button type="button" variant="outline" size="sm" onClick={addRule}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
              </Button>
            </div>

            {rulesExpanded && (
              <div className="space-y-2">
                {form.rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    No rules yet. Add rules to define formatting requirements.
                  </p>
                ) : (
                  form.rules.map((rule, idx) => (
                    <RuleEditor
                      key={rule.id}
                      rule={rule}
                      onChange={(updated) => updateRule(idx, updated)}
                      onDelete={() => deleteRule(idx)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!isValid || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EMPTY_FORM: TagFormState = { name: '', color: PRESET_COLORS[5], threshold: 80, rules: [] }

export default function TagManager() {
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<{ open: boolean; editing: Tag | null }>({ open: false, editing: null })

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (form: TagFormState) => tagsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setDialog({ open: false, editing: null }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: TagFormState }) => tagsApi.update(id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setDialog({ open: false, editing: null }) },
  })

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })

  function openCreate() {
    setDialog({ open: true, editing: null })
  }

  function openEdit(tag: Tag) {
    setDialog({ open: true, editing: tag })
  }

  function handleSave(form: TagFormState) {
    if (dialog.editing) {
      updateMutation.mutate({ id: dialog.editing.id, form })
    } else {
      createMutation.mutate(form)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const initialForm: TagFormState = dialog.editing
    ? { name: dialog.editing.name, color: dialog.editing.color, threshold: dialog.editing.threshold, rules: dialog.editing.rules }
    : EMPTY_FORM

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guideline Sets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage formatting rules that presentations are validated against.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Set
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => <div key={k} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No guideline sets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first set to start validating presentations.</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Create first set</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5 flex items-center gap-4">
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-xl shrink-0"
                  style={{ background: tag.color }}
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{tag.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tag.rules.length} rule{tag.rules.length !== 1 ? 's' : ''} · {tag.threshold}% pass threshold
                  </p>
                  {tag.rules.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {tag.rules.slice(0, 4).map((r) => (
                        <Badge key={r.id} variant="secondary" className="text-[10px] py-0">
                          {r.name || r.type}
                        </Badge>
                      ))}
                      {tag.rules.length > 4 && (
                        <Badge variant="secondary" className="text-[10px] py-0">+{tag.rules.length - 4} more</Badge>
                      )}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tag)} aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => deleteMutation.mutate(tag.id)}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <TagDialog
        key={dialog.editing?.id ?? 'new'}
        open={dialog.open}
        initial={initialForm}
        onClose={() => setDialog({ open: false, editing: null })}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
