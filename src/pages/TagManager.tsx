import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag as TagIcon, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/PageHeader'
import { TagBadge } from '@/components/shared/TagBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAppStore } from '@/store/useAppStore'
import type { Tag } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9', '#6b7280',
]

function randomId() {
  return `tag-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface TagFormState {
  name: string
  color: string
}

interface TagDialogProps {
  open: boolean
  initial?: Tag | null
  onSave: (data: TagFormState) => void
  onClose: () => void
}

function TagDialog({ open, initial, onSave, onClose }: TagDialogProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [nameError, setNameError] = useState('')

  const handleSave = () => {
    if (!name.trim()) { setNameError('Tag name is required.'); return }
    onSave({ name: name.trim(), color })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm" aria-labelledby="tag-dialog-title">
        <DialogHeader>
          <DialogTitle id="tag-dialog-title">{initial ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder="e.g. Marketing"
              className="mt-1"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'tag-name-error' : undefined}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            {nameError && <p id="tag-name-error" className="text-xs text-red-600 mt-1" role="alert">{nameError}</p>}
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-2" role="radiogroup" aria-label="Tag color">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  className="w-7 h-7 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Custom color picker"
                title="Custom color"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <TagBadge tag={{ id: 'preview', name: name || 'Tag Name', color, createdAt: '' }} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? 'Save changes' : 'Create tag'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TagManager() {
  const tags = useAppStore((s) => s.tags)
  const files = useAppStore((s) => s.files)
  const addTag = useAppStore((s) => s.addTag)
  const updateTag = useAppStore((s) => s.updateTag)
  const deleteTag = useAppStore((s) => s.deleteTag)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const tagUsage = Object.fromEntries(
    tags.map((t) => [t.id, files.filter((f) => f.tags.includes(t.id)).length]),
  )

  const filtered = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (tag: Tag) => { setEditing(tag); setDialogOpen(true) }

  const handleSave = (data: { name: string; color: string }) => {
    if (editing) {
      updateTag(editing.id, data)
    } else {
      addTag({ id: randomId(), ...data, createdAt: new Date().toISOString() })
    }
  }

  const handleDelete = (id: string) => {
    deleteTag(id)
    setDeleteConfirmId(null)
  }

  const tagToDelete = tags.find((t) => t.id === deleteConfirmId)

  return (
    <div>
      <PageHeader
        title="Tag Manager"
        description="Organize your files with tags. Tags help categorize presentations and suggest rule sets."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            New Tag
          </Button>
        }
      />

      <div className="px-8 py-8 max-w-3xl space-y-6">
        {tags.length > 3 && (
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search tags"
          />
        )}

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
              {filtered.length} {filtered.length === 1 ? 'tag' : 'tags'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<TagIcon className="w-12 h-12" />}
                title="No tags yet"
                description="Create tags to categorize your PowerPoint files and enable smart configuration suggestions."
                action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create your first tag</Button>}
              />
            ) : (
              <ul className="divide-y divide-border" role="list" aria-label="Tags list">
                {filtered.map((tag) => (
                  <li key={tag.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent/40 transition-colors">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Used in {tagUsage[tag.id] ?? 0} file{tagUsage[tag.id] !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <TagBadge tag={tag} />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(tag)}
                        aria-label={`Edit tag ${tag.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(tag.id)}
                        aria-label={`Delete tag ${tag.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Delete confirm */}
        {deleteConfirmId && tagToDelete && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm">
                Delete tag <strong>{tagToDelete.name}</strong>?
                {tagUsage[tagToDelete.id] > 0 && (
                  <span className="text-muted-foreground ml-1">(used in {tagUsage[tagToDelete.id]} file{tagUsage[tagToDelete.id] !== 1 ? 's' : ''})</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                  <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(tagToDelete.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />Delete
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <TagDialog
        open={dialogOpen}
        initial={editing}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
