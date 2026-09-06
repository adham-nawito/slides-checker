import { useState, useRef } from 'react'
import { Plus, Save, Trash2, Download, Upload, Undo2, Redo2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { RuleRow } from '@/components/rules/RuleRow'
import { TagBadge } from '@/components/shared/TagBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAppStore } from '@/store/useAppStore'
import { TEMPLATES, TAG_TEMPLATE_MAP } from '@/lib/templates'
import type { ValidationRule, RuleSet, TemplateId } from '@/types'

function randomId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function newRule(): ValidationRule {
  return {
    id: randomId(),
    name: '',
    type: 'font_size',
    operator: 'equals',
    value: '',
    severity: 'error',
  }
}

function newRuleSet(name = ''): RuleSet {
  return {
    id: `rs-${Date.now()}`,
    name,
    description: '',
    template: 'custom',
    rules: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function RuleBuilder() {
  const ruleSets = useAppStore((s) => s.ruleSets)
  const tags = useAppStore((s) => s.tags)
  const addRuleSet = useAppStore((s) => s.addRuleSet)
  const updateRuleSet = useAppStore((s) => s.updateRuleSet)
  const deleteRuleSet = useAppStore((s) => s.deleteRuleSet)
  const undoRuleSet = useAppStore((s) => s.undoRuleSet)
  const redoRuleSet = useAppStore((s) => s.redoRuleSet)
  const pushRuleSetHistory = useAppStore((s) => s.pushRuleSetHistory)

  const [activeId, setActiveId] = useState<string | null>(ruleSets[0]?.id ?? null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState('')
  const [saveAlert, setSaveAlert] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const active = ruleSets.find((rs) => rs.id === activeId) ?? null
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]))

  const mutate = (patch: Partial<RuleSet>) => {
    if (!active) return
    pushRuleSetHistory(active)
    updateRuleSet(active.id, { ...patch, updatedAt: new Date().toISOString() })
  }

  const handleRuleChange = (ruleId: string, patch: Partial<ValidationRule>) => {
    if (!active) return
    const rules = active.rules.map((r) => r.id === ruleId ? { ...r, ...patch } : r)
    mutate({ rules })
  }

  const handleAddRule = () => {
    if (!active) return
    mutate({ rules: [...active.rules, newRule()] })
  }

  const handleDeleteRule = (ruleId: string) => {
    if (!active) return
    mutate({ rules: active.rules.filter((r) => r.id !== ruleId) })
  }

  const handleCreateRuleSet = () => {
    const rs = newRuleSet(`Rule Set ${ruleSets.length + 1}`)
    addRuleSet(rs)
    setActiveId(rs.id)
  }

  const handleApplyTemplate = (templateId: TemplateId) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template || !active) return
    const rules: ValidationRule[] = template.rules.map((r) => ({ ...r, id: randomId() }))
    mutate({ template: templateId, rules, name: active.name || template.name, description: active.description || template.description })
    setTemplateDialogOpen(false)
  }

  const handleSuggestFromTags = () => {
    if (!active) return
    const tagNames = active.tags.map((tid) => tagMap[tid]?.name).filter(Boolean)
    const suggested = tagNames.map((n) => TAG_TEMPLATE_MAP[n]).find(Boolean)
    if (suggested) handleApplyTemplate(suggested as TemplateId)
  }

  const handleToggleTag = (tagId: string) => {
    if (!active) return
    const tags = active.tags.includes(tagId)
      ? active.tags.filter((t) => t !== tagId)
      : [...active.tags, tagId]
    mutate({ tags })
  }

  const handleExport = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${active.name.replace(/\s+/g, '_') || 'rule_set'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string)
      setImportDialogOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importJson) as RuleSet
      if (!parsed.name || !Array.isArray(parsed.rules)) throw new Error('Invalid rule set format.')
      const imported: RuleSet = {
        ...parsed,
        id: `rs-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addRuleSet(imported)
      setActiveId(imported.id)
      setImportDialogOpen(false)
      setImportJson('')
      setImportError('')
    } catch (e) {
      setImportError((e as Error).message)
    }
  }

  const handleSave = () => {
    setSaveAlert(true)
    setTimeout(() => setSaveAlert(false), 2500)
  }

  const suggestedTemplate = (() => {
    if (!active) return null
    const tagNames = active.tags.map((tid) => tagMap[tid]?.name).filter(Boolean)
    const suggested = tagNames.map((n) => TAG_TEMPLATE_MAP[n]).find(Boolean)
    return suggested ? TEMPLATES.find((t) => t.id === suggested) : null
  })()

  return (
    <div>
      <PageHeader
        title="Rule Builder"
        description="Create and manage validation rule sets for PowerPoint formatting checks."
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="sr-only"
              aria-hidden="true"
              onChange={handleImportFile}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Import JSON
            </Button>
            <Button onClick={handleCreateRuleSet}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              New Rule Set
            </Button>
          </div>
        }
      />

      <div className="flex h-[calc(100vh-89px)]">
        {/* Left panel: rule set list */}
        <aside className="w-64 border-r border-border bg-muted/30 flex flex-col" aria-label="Rule sets">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rule Sets</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1" role="navigation" aria-label="Rule set navigation">
            {ruleSets.map((rs) => (
              <button
                key={rs.id}
                onClick={() => setActiveId(rs.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeId === rs.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-accent text-foreground'
                }`}
                aria-current={activeId === rs.id ? 'true' : undefined}
              >
                <p className="truncate">{rs.name}</p>
                <p className={`text-xs mt-0.5 ${activeId === rs.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {rs.rules.length} rule{rs.rules.length !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
            {ruleSets.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No rule sets yet.</p>
            )}
          </nav>
        </aside>

        {/* Right panel: editor */}
        <div className="flex-1 overflow-y-auto">
          {!active ? (
            <EmptyState
              icon={<Wand2 className="w-12 h-12" />}
              title="No rule set selected"
              description="Create a new rule set or select one from the list."
              action={<Button onClick={handleCreateRuleSet}><Plus className="w-4 h-4 mr-2" />New Rule Set</Button>}
            />
          ) : (
            <div className="p-6 max-w-4xl space-y-6">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={undoRuleSet} aria-label="Undo">
                      <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={redoRuleSet} aria-label="Redo">
                      <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Apply Template
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Export JSON
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { deleteRuleSet(active.id); setActiveId(ruleSets.filter((r) => r.id !== active.id)[0]?.id ?? null) }}
                  aria-label={`Delete rule set ${active.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Delete
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Save
                </Button>
              </div>

              {saveAlert && (
                <Alert className="border-green-500/50 bg-green-50" role="status">
                  <AlertDescription className="text-green-700 text-sm">Rule set saved successfully.</AlertDescription>
                </Alert>
              )}

              {/* Tag-based suggestion */}
              {suggestedTemplate && active.template === 'custom' && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertDescription className="flex items-center justify-between flex-wrap gap-2 text-sm">
                    <span>
                      Based on your tags, <strong>{suggestedTemplate.name}</strong> template is recommended.
                    </span>
                    <Button size="sm" variant="outline" onClick={handleSuggestFromTags}>
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      Apply suggestion
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="rules">
                <TabsList>
                  <TabsTrigger value="rules">Rules <Badge variant="secondary" className="ml-1.5">{active.rules.length}</Badge></TabsTrigger>
                  <TabsTrigger value="meta">Metadata & Tags</TabsTrigger>
                  <TabsTrigger value="json">JSON Preview</TabsTrigger>
                </TabsList>

                {/* Rules tab */}
                <TabsContent value="rules" className="mt-4 space-y-4">
                  {active.rules.length === 0 ? (
                    <Card>
                      <CardContent className="py-10">
                        <EmptyState
                          title="No rules yet"
                          description="Add your first rule or apply a template to get started."
                          action={
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                                <Wand2 className="w-4 h-4 mr-2" />Apply Template
                              </Button>
                              <Button onClick={handleAddRule}>
                                <Plus className="w-4 h-4 mr-2" />Add Rule
                              </Button>
                            </div>
                          }
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <ul className="space-y-3" aria-label="Validation rules">
                        {active.rules.map((rule, i) => (
                          <RuleRow
                            key={rule.id}
                            rule={rule}
                            index={i}
                            onChange={(patch) => handleRuleChange(rule.id, patch)}
                            onDelete={() => handleDeleteRule(rule.id)}
                          />
                        ))}
                      </ul>
                      <Button variant="outline" className="w-full" onClick={handleAddRule}>
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                        Add Rule
                      </Button>
                    </>
                  )}

                  {/* Rule summary */}
                  {active.rules.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {(['error', 'warning', 'info'] as const).map((sev) => {
                            const count = active.rules.filter((r) => r.severity === sev).length
                            return count > 0 ? (
                              <div key={sev} className="flex items-center gap-1.5">
                                <SeverityBadge severity={sev} />
                                <span className="text-sm text-muted-foreground">&times; {count}</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Meta tab */}
                <TabsContent value="meta" className="mt-4 space-y-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <Label htmlFor="rs-name">Rule Set Name</Label>
                        <Input
                          id="rs-name"
                          value={active.name}
                          onChange={(e) => mutate({ name: e.target.value })}
                          placeholder="e.g. Corporate Branding"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rs-desc">Description</Label>
                        <Textarea
                          id="rs-desc"
                          value={active.description}
                          onChange={(e) => mutate({ description: e.target.value })}
                          placeholder="Describe what this rule set validates..."
                          className="mt-1 resize-none"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label className="block mb-2">Associated Tags</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Tagged rule sets are suggested when files with matching tags are uploaded.
                        </p>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Tag associations">
                          {tags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleToggleTag(tag.id)}
                              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                              aria-pressed={active.tags.includes(tag.id)}
                            >
                              <TagBadge
                                tag={tag}
                                className={active.tags.includes(tag.id) ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-50 hover:opacity-80'}
                              />
                            </button>
                          ))}
                          {tags.length === 0 && (
                            <p className="text-sm text-muted-foreground">No tags available. Create tags in Tag Manager.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* JSON tab */}
                <TabsContent value="json" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre
                        className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-[500px] text-foreground"
                        aria-label="Rule set JSON preview"
                        tabIndex={0}
                      >
                        {JSON.stringify(active, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Template picker dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg" aria-labelledby="template-dialog-title">
          <DialogHeader>
            <DialogTitle id="template-dialog-title">Apply Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleApplyTemplate(t.id)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                <p className="text-xs text-primary mt-1">{t.rules.length} predefined rules</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(o) => { if (!o) { setImportDialogOpen(false); setImportError('') } }}>
        <DialogContent className="sm:max-w-lg" aria-labelledby="import-dialog-title">
          <DialogHeader>
            <DialogTitle id="import-dialog-title">Import Rule Set JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={importJson}
              onChange={(e) => { setImportJson(e.target.value); setImportError('') }}
              placeholder='{"name": "My Rules", "rules": [...]}'
              className="font-mono text-xs resize-none"
              rows={12}
              aria-label="JSON rule set input"
              aria-invalid={!!importError}
            />
            {importError && <p className="text-xs text-red-600" role="alert">{importError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportSubmit}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
