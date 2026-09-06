import { useRef, useState, useCallback } from 'react'
import { Upload, FileX } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = ['.ppt', '.pptx', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export interface DroppedFile {
  file: File
  error?: string
}

interface DropZoneProps {
  onFiles: (files: DroppedFile[]) => void
  disabled?: boolean
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((rawFiles: FileList | File[]) => {
    const arr = Array.from(rawFiles)
    const results: DroppedFile[] = arr.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !['ppt', 'pptx'].includes(ext)) {
        return { file, error: 'Only .ppt and .pptx files are supported.' }
      }
      if (file.size > MAX_SIZE_BYTES) {
        return { file, error: `File exceeds ${MAX_SIZE_MB}MB limit.` }
      }
      return { file }
    })
    onFiles(results)
  }, [onFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }, [disabled, processFiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="File upload drop zone. Press Enter or Space to open file picker."
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-accent/50',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
    >
      <div className={cn('p-4 rounded-full transition-colors', dragging ? 'bg-primary/10' : 'bg-muted')}>
        {dragging ? (
          <Upload className="w-8 h-8 text-primary animate-bounce" aria-hidden="true" />
        ) : (
          <Upload className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .ppt, .pptx &mdash; up to {MAX_SIZE_MB}MB per file &mdash; batch upload supported
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}

export function FileValidationError({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
      <FileX className="w-4 h-4 shrink-0" aria-hidden="true" />
      {error}
    </div>
  )
}
