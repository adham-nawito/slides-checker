import type { Template } from '@/types'

export const TEMPLATES: Template[] = [
  {
    id: 'corporate_branding',
    name: 'Corporate Branding',
    description: 'Enforces consistent font, color, and layout for company presentations.',
    rules: [
      { name: 'Title Font Size', type: 'font_size', operator: 'equals', value: '44', severity: 'error', description: 'Slide titles must be 44pt' },
      { name: 'Body Font Size', type: 'font_size', operator: 'greater_than', value: '18', severity: 'warning', description: 'Body text must be at least 18pt' },
      { name: 'Font Family', type: 'font_family', operator: 'equals', value: 'Arial', severity: 'error', description: 'All text must use Arial' },
      { name: 'Brand Color', type: 'font_color', operator: 'equals', value: '#003087', severity: 'warning', description: 'Title text should use brand blue' },
      { name: 'Header Presence', type: 'header_presence', operator: 'exists', value: 'true', severity: 'error', description: 'Every slide must have a header' },
    ],
  },
  {
    id: 'academic_presentation',
    name: 'Academic Presentation',
    description: 'Standard rules for academic and research presentations.',
    rules: [
      { name: 'Title Font Size', type: 'font_size', operator: 'equals', value: '36', severity: 'error', description: 'Titles must be 36pt' },
      { name: 'Body Font Size', type: 'font_size', operator: 'greater_than', value: '20', severity: 'warning', description: 'Body text at least 20pt for readability' },
      { name: 'Font Family', type: 'font_family', operator: 'equals', value: 'Times New Roman', severity: 'warning', description: 'Prefer Times New Roman' },
      { name: 'Footer Presence', type: 'footer_presence', operator: 'exists', value: 'true', severity: 'info', description: 'Include slide numbers in footer' },
      { name: 'Slide Count', type: 'slide_count', operator: 'less_than', value: '30', severity: 'warning', description: 'Keep presentations under 30 slides' },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Lightweight rules focused on basic formatting consistency.',
    rules: [
      { name: 'Font Size Check', type: 'font_size', operator: 'greater_than', value: '16', severity: 'warning', description: 'Text should be readable' },
      { name: 'Header Presence', type: 'header_presence', operator: 'exists', value: 'true', severity: 'warning', description: 'Slides should have headers' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start from scratch and build your own rule set.',
    rules: [],
  },
]

export const TAG_TEMPLATE_MAP: Record<string, string> = {
  Marketing: 'corporate_branding',
  'Q2 Report': 'corporate_branding',
  Research: 'academic_presentation',
  Thesis: 'academic_presentation',
  Internal: 'minimal',
}
