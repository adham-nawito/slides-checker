import type { Tag, UploadedFile, RuleSet, ValidationReport } from '@/types'

// Mock data for demo/development (no backend required)

export const mockTags: Tag[] = [
  { id: 't1', name: 'Marketing', color: '#6366f1', createdAt: '2024-01-10T10:00:00Z' },
  { id: 't2', name: 'Q2 Report', color: '#f59e0b', createdAt: '2024-01-12T11:00:00Z' },
  { id: 't3', name: 'Research', color: '#10b981', createdAt: '2024-01-15T09:00:00Z' },
  { id: 't4', name: 'Internal', color: '#6b7280', createdAt: '2024-01-18T14:00:00Z' },
]

export const mockFiles: UploadedFile[] = [
  { id: 'f1', name: 'Q2_Brand_Deck.pptx', size: 4_200_000, status: 'validated', progress: 100, tags: ['t1', 't2'], ruleSetId: 'rs1', uploadedAt: '2024-04-01T09:00:00Z' },
  { id: 'f2', name: 'Research_Presentation.pptx', size: 8_100_000, status: 'validated', progress: 100, tags: ['t3'], ruleSetId: 'rs2', uploadedAt: '2024-04-02T11:30:00Z' },
  { id: 'f3', name: 'Internal_Update.pptx', size: 2_300_000, status: 'uploaded', progress: 100, tags: ['t4'], uploadedAt: '2024-04-03T14:00:00Z' },
]

export const mockRuleSets: RuleSet[] = [
  {
    id: 'rs1',
    name: 'Corporate Branding',
    description: 'Enforces consistent font, color, and layout for company presentations.',
    template: 'corporate_branding',
    tags: ['t1', 't2'],
    rules: [
      { id: 'r1', name: 'Title Font Size', type: 'font_size', operator: 'equals', value: '44', severity: 'error', description: 'Slide titles must be 44pt' },
      { id: 'r2', name: 'Body Font Size', type: 'font_size', operator: 'greater_than', value: '18', severity: 'warning', description: 'Body text must be at least 18pt' },
      { id: 'r3', name: 'Font Family', type: 'font_family', operator: 'equals', value: 'Arial', severity: 'error' },
      { id: 'r4', name: 'Brand Color', type: 'font_color', operator: 'equals', value: '#003087', severity: 'warning' },
      { id: 'r5', name: 'Header Presence', type: 'header_presence', operator: 'exists', value: 'true', severity: 'error' },
    ],
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-03-15T14:00:00Z',
  },
  {
    id: 'rs2',
    name: 'Academic Presentation',
    description: 'Standard rules for academic and research presentations.',
    template: 'academic_presentation',
    tags: ['t3'],
    rules: [
      { id: 'r6', name: 'Title Font Size', type: 'font_size', operator: 'equals', value: '36', severity: 'error' },
      { id: 'r7', name: 'Body Font Size', type: 'font_size', operator: 'greater_than', value: '20', severity: 'warning' },
      { id: 'r8', name: 'Footer Presence', type: 'footer_presence', operator: 'exists', value: 'true', severity: 'info' },
    ],
    createdAt: '2024-02-05T09:00:00Z',
    updatedAt: '2024-02-05T09:00:00Z',
  },
]

export const mockReport: ValidationReport = {
  id: 'rep1',
  fileId: 'f1',
  fileName: 'Q2_Brand_Deck.pptx',
  ruleSetId: 'rs1',
  ruleSetName: 'Corporate Branding',
  slideCount: 12,
  issues: [
    { id: 'i1', slideIndex: 2, slideTitle: 'Q2 Highlights', ruleId: 'r1', ruleName: 'Title Font Size', severity: 'error', message: 'Title font size is 32pt, expected 44pt', actual: '32pt', expected: '44pt' },
    { id: 'i2', slideIndex: 2, slideTitle: 'Q2 Highlights', ruleId: 'r3', ruleName: 'Font Family', severity: 'error', message: 'Font "Calibri" found, expected Arial', actual: 'Calibri', expected: 'Arial' },
    { id: 'i3', slideIndex: 5, slideTitle: 'Revenue Growth', ruleId: 'r2', ruleName: 'Body Font Size', severity: 'warning', message: 'Body text is 16pt, expected >18pt', actual: '16pt', expected: '>18pt' },
    { id: 'i4', slideIndex: 7, slideTitle: 'Team Structure', ruleId: 'r4', ruleName: 'Brand Color', severity: 'warning', message: 'Title color #333333 does not match brand color', actual: '#333333', expected: '#003087' },
    { id: 'i5', slideIndex: 9, slideTitle: 'Roadmap', ruleId: 'r5', ruleName: 'Header Presence', severity: 'error', message: 'Slide has no header text', actual: 'none', expected: 'present' },
    { id: 'i6', slideIndex: 11, slideTitle: 'Thank You', ruleId: 'r2', ruleName: 'Body Font Size', severity: 'warning', message: 'Body text is 14pt, expected >18pt', actual: '14pt', expected: '>18pt' },
  ],
  issuesByType: {},
  summary: { errors: 3, warnings: 3, infos: 0, passing: 9 },
  createdAt: '2024-04-01T09:30:00Z',
}

// Populate issuesByType
mockReport.issues.forEach((issue) => {
  if (!mockReport.issuesByType[issue.ruleName]) mockReport.issuesByType[issue.ruleName] = []
  mockReport.issuesByType[issue.ruleName].push(issue)
})
