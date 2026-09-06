import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tag, UploadedFile, RuleSet, ValidationReport } from '@/types'
import { mockTags, mockFiles, mockRuleSets, mockReport } from '@/lib/mock'

interface AppState {
  // Data
  tags: Tag[]
  files: UploadedFile[]
  ruleSets: RuleSet[]
  reports: ValidationReport[]
  // UI
  selectedFileIds: string[]
  activeRuleSetId: string | null
  // Rule builder undo/redo
  ruleSetHistory: RuleSet[][]
  ruleSetHistoryIndex: number

  // Tag actions
  addTag: (tag: Tag) => void
  updateTag: (id: string, patch: Partial<Tag>) => void
  deleteTag: (id: string) => void

  // File actions
  addFiles: (files: UploadedFile[]) => void
  updateFile: (id: string, patch: Partial<UploadedFile>) => void
  deleteFile: (id: string) => void
  toggleFileSelection: (id: string) => void
  clearSelection: () => void

  // Rule set actions
  addRuleSet: (rs: RuleSet) => void
  updateRuleSet: (id: string, patch: Partial<RuleSet>) => void
  deleteRuleSet: (id: string) => void
  setActiveRuleSet: (id: string | null) => void
  pushRuleSetHistory: (rs: RuleSet) => void
  undoRuleSet: () => void
  redoRuleSet: () => void

  // Report actions
  addReport: (report: ValidationReport) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tags: mockTags,
      files: mockFiles,
      ruleSets: mockRuleSets,
      reports: [mockReport],
      selectedFileIds: [],
      activeRuleSetId: null,
      ruleSetHistory: [],
      ruleSetHistoryIndex: -1,

      addTag: (tag) => set((s) => ({ tags: [...s.tags, tag] })),
      updateTag: (id, patch) =>
        set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTag: (id) => set((s) => ({ tags: s.tags.filter((t) => t.id !== id) })),

      addFiles: (files) => set((s) => ({ files: [...s.files, ...files] })),
      updateFile: (id, patch) =>
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      deleteFile: (id) =>
        set((s) => ({
          files: s.files.filter((f) => f.id !== id),
          selectedFileIds: s.selectedFileIds.filter((fid) => fid !== id),
        })),
      toggleFileSelection: (id) =>
        set((s) => ({
          selectedFileIds: s.selectedFileIds.includes(id)
            ? s.selectedFileIds.filter((fid) => fid !== id)
            : [...s.selectedFileIds, id],
        })),
      clearSelection: () => set({ selectedFileIds: [] }),

      addRuleSet: (rs) => set((s) => ({ ruleSets: [...s.ruleSets, rs] })),
      updateRuleSet: (id, patch) =>
        set((s) => ({ ruleSets: s.ruleSets.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRuleSet: (id) => set((s) => ({ ruleSets: s.ruleSets.filter((r) => r.id !== id) })),
      setActiveRuleSet: (id) => set({ activeRuleSetId: id }),

      pushRuleSetHistory: (rs) => {
        const { ruleSetHistory, ruleSetHistoryIndex } = get()
        const newHistory = ruleSetHistory.slice(0, ruleSetHistoryIndex + 1)
        newHistory.push(
          get().ruleSets.map((r) => (r.id === rs.id ? { ...rs } : r)),
        )
        set({ ruleSetHistory: newHistory, ruleSetHistoryIndex: newHistory.length - 1 })
      },
      undoRuleSet: () => {
        const { ruleSetHistory, ruleSetHistoryIndex } = get()
        if (ruleSetHistoryIndex <= 0) return
        const idx = ruleSetHistoryIndex - 1
        set({ ruleSets: ruleSetHistory[idx], ruleSetHistoryIndex: idx })
      },
      redoRuleSet: () => {
        const { ruleSetHistory, ruleSetHistoryIndex } = get()
        if (ruleSetHistoryIndex >= ruleSetHistory.length - 1) return
        const idx = ruleSetHistoryIndex + 1
        set({ ruleSets: ruleSetHistory[idx], ruleSetHistoryIndex: idx })
      },

      addReport: (report) => set((s) => ({ reports: [...s.reports, report] })),
    }),
    { name: 'pptx-validator-store', partialize: (s) => ({ tags: s.tags, ruleSets: s.ruleSets }) },
  ),
)
