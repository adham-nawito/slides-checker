// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'

export interface AuthUser {
  username: string
  role: UserRole
  token: string
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
// Tags now own their rules + pass threshold (no separate RuleSet concept in UI)

export interface Tag {
  id: string
  name: string
  color: string
  threshold: number          // 0–100: minimum pass % required
  rules: ValidationRule[]
  createdAt: string
}

// ─── Rule Builder ─────────────────────────────────────────────────────────────

export type RuleType =
  | 'font_size'
  | 'font_family'
  | 'font_color'
  | 'background_color'
  | 'header_presence'
  | 'footer_presence'
  | 'slide_count'
  | 'image_count'
  | 'text_alignment'
  | 'line_spacing'

export type RuleOperator =
  | 'equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'exists'

export type RuleScope = 'all' | 'title' | 'heading' | 'body' | 'footer'

/**
 * Controls how a rule is aggregated across slides.
 *
 * - `all`     Every included slide must satisfy the rule (default — good for font_size, font_family, …)
 * - `any`     At least one included slide must satisfy the rule (good for header_presence)
 * - `min`     At least `matchValue` slides must satisfy the rule (e.g. "at least 5 slides have an image")
 * - `percent` At least `matchValue`% of included slides must satisfy the rule
 */
export type RuleMatchMode = 'all' | 'any' | 'min' | 'percent'

export interface ValidationRule {
  id: string
  name: string
  type: RuleType
  operator: RuleOperator
  value: string
  severity: 'error' | 'warning' | 'info'
  scope: RuleScope      // which text placeholder this rule targets (text-based rules only)
  description?: string

  // ── Slide-matching options ────────────────────────────────────────────────
  /** How to aggregate the per-slide results. Defaults to 'all'. */
  matchMode?: RuleMatchMode
  /** Threshold for 'min' (slide count) and 'percent' (0–100) modes. */
  matchValue?: number
  /** Skip the first N slides when evaluating this rule (e.g. skip cover/title slides). */
  excludeFirst?: number
}

// Internal adapter — used only by the validator functions
export interface RuleSet {
  id: string
  name: string
  description: string
  template?: string
  rules: ValidationRule[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface SlideIssue {
  id: string
  slideIndex: number
  slideTitle?: string
  ruleId: string
  ruleName: string
  severity: IssueSeverity
  message: string
  actual?: string
  expected?: string
}

export interface ValidationReport {
  id: string
  fileId: string
  fileName: string
  ruleSetId: string
  ruleSetName: string
  slideCount: number
  issues: SlideIssue[]
  issuesByType: Record<string, SlideIssue[]>
  summary: {
    errors: number
    warnings: number
    infos: number
    passing: number
  }
  createdAt: string
}

// ─── Submissions (passed files sent to admin review) ──────────────────────────

export interface Submission {
  id: string
  fileName: string
  fileSize: number
  tagId: string
  tagName: string
  passPercent: number
  slideCount: number
  summary: {
    errors: number
    warnings: number
    infos: number
    passing: number
  }
  issues: SlideIssue[]
  submittedBy: string
  tagColor: string           // snapshot of the tag colour at submit time
  storedName: string | null  // server-side filename; null for legacy submissions
  status: 'pending' | 'reviewed' | 'failed'
  submittedAt: string
  reviewedAt: string | null
}
