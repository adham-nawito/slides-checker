/**
 * Validates a parsed PPTX presentation against a ValidationRuleSet.
 * Runs entirely in the browser — no server required.
 */

import type { ParsedPresentation, ParsedSlide, ParsedRun } from './pptxParser'
import type { ValidationRule, ValidationReport, SlideIssue, RuleSet } from '@/types'

// ─── Entry point ─────────────────────────────────────────────────────────────

export function validatePresentation(
  parsed: ParsedPresentation,
  ruleSet: RuleSet,
  fileId: string,
  fileName: string,
): ValidationReport {
  const issues: SlideIssue[] = []

  for (const slide of parsed.slides) {
    for (const rule of ruleSet.rules) {
      const slideIssues = evaluateRule(rule, slide, parsed)
      issues.push(...slideIssues)
    }
  }

  const issuesByType: Record<string, SlideIssue[]> = {}
  for (const issue of issues) {
    if (!issuesByType[issue.ruleName]) issuesByType[issue.ruleName] = []
    issuesByType[issue.ruleName].push(issue)
  }

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  const infos = issues.filter((i) => i.severity === 'info').length

  // "Passing" = rules that produced zero issues across all slides
  const failingRuleIds = new Set(issues.map((i) => i.ruleId))
  const passing = ruleSet.rules.filter((r) => !failingRuleIds.has(r.id)).length

  return {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fileId,
    fileName,
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    slideCount: parsed.slideCount,
    issues,
    issuesByType,
    summary: { errors, warnings, infos, passing },
    createdAt: new Date().toISOString(),
  }
}

// ─── Rule evaluator ──────────────────────────────────────────────────────────

function evaluateRule(
  rule: ValidationRule,
  slide: ParsedSlide,
  _parsed: ParsedPresentation,
): SlideIssue[] {
  switch (rule.type) {
    case 'font_size':        return checkFontSize(rule, slide)
    case 'font_family':      return checkFontFamily(rule, slide)
    case 'font_color':       return checkFontColor(rule, slide)
    case 'background_color': return []  // bg color requires theme resolution — not yet supported
    case 'header_presence':  return checkPresence(rule, slide, 'header')
    case 'footer_presence':  return checkPresence(rule, slide, 'footer')
    case 'slide_count':      return []  // checked at presentation level, not per-slide
    case 'image_count':      return []  // requires parsing <p:sp> blipFill — future extension
    case 'text_alignment':   return checkAlignment(rule, slide)
    case 'line_spacing':     return checkLineSpacing(rule, slide)
    default:                 return []
  }
}

// ─── Individual rule checkers ─────────────────────────────────────────────────

function checkFontSize(rule: ValidationRule, slide: ParsedSlide): SlideIssue[] {
  const expected = parseFloat(rule.value)
  if (isNaN(expected)) return []

  const issues: SlideIssue[] = []

  for (const para of slide.paragraphs) {
    for (const run of para.runs) {
      if (run.fontSizePt === null) continue
      if (!compareNumbers(run.fontSizePt, expected, rule.operator)) {
        issues.push(makeIssue(rule, slide, {
          actual: `${run.fontSizePt}pt`,
          expected: `${operatorLabel(rule.operator)} ${expected}pt`,
          message: `"${truncate(run.text)}" — font size is ${run.fontSizePt}pt, expected ${operatorLabel(rule.operator)} ${expected}pt`,
        }))
        break  // one issue per slide per rule is enough
      }
    }
    if (issues.length > 0) break
  }

  return issues
}

function checkFontFamily(rule: ValidationRule, slide: ParsedSlide): SlideIssue[] {
  const expected = rule.value.trim().toLowerCase()
  const issues: SlideIssue[] = []

  for (const para of slide.paragraphs) {
    for (const run of para.runs) {
      if (!run.fontFamily) continue
      const actual = run.fontFamily.toLowerCase()
      const passes =
        rule.operator === 'contains' ? actual.includes(expected) : actual === expected
      if (!passes) {
        issues.push(makeIssue(rule, slide, {
          actual: run.fontFamily,
          expected: rule.value,
          message: `Font "${run.fontFamily}" found in "${truncate(run.text)}", expected ${rule.operator === 'contains' ? 'containing' : ''} "${rule.value}"`,
        }))
        break
      }
    }
    if (issues.length > 0) break
  }

  return issues
}

function checkFontColor(rule: ValidationRule, slide: ParsedSlide): SlideIssue[] {
  const expected = normalizeHex(rule.value)
  if (!expected) return []

  const issues: SlideIssue[] = []

  for (const para of slide.paragraphs) {
    for (const run of para.runs) {
      if (!run.color) continue
      const actual = normalizeHex(run.color)
      if (actual && actual !== expected) {
        issues.push(makeIssue(rule, slide, {
          actual: run.color,
          expected: rule.value,
          message: `Color ${run.color} found in "${truncate(run.text)}", expected ${rule.value}`,
        }))
        break
      }
    }
    if (issues.length > 0) break
  }

  return issues
}

function checkPresence(
  rule: ValidationRule,
  slide: ParsedSlide,
  target: 'header' | 'footer',
): SlideIssue[] {
  const present = target === 'header' ? slide.hasHeader : slide.hasFooter
  if (!present) {
    return [makeIssue(rule, slide, {
      actual: 'absent',
      expected: 'present',
      message: `Slide has no ${target}`,
    })]
  }
  return []
}

function checkAlignment(rule: ValidationRule, slide: ParsedSlide): SlideIssue[] {
  const expected = rule.value.toLowerCase()
  const issues: SlideIssue[] = []

  for (const para of slide.paragraphs) {
    if (!para.alignment) continue
    if (para.alignment !== expected) {
      issues.push(makeIssue(rule, slide, {
        actual: para.alignment,
        expected: rule.value,
        message: `Paragraph "${truncate(para.text)}" is ${para.alignment}-aligned, expected ${rule.value}`,
      }))
      break
    }
  }

  return issues
}

function checkLineSpacing(rule: ValidationRule, slide: ParsedSlide): SlideIssue[] {
  const expected = parseFloat(rule.value)
  if (isNaN(expected)) return []

  const issues: SlideIssue[] = []

  for (const para of slide.paragraphs) {
    if (para.lineSpacing === null) continue
    if (!compareNumbers(para.lineSpacing, expected, rule.operator)) {
      issues.push(makeIssue(rule, slide, {
        actual: `${para.lineSpacing}`,
        expected: `${operatorLabel(rule.operator)} ${expected}`,
        message: `Line spacing is ${para.lineSpacing}pt, expected ${operatorLabel(rule.operator)} ${expected}pt`,
      }))
      break
    }
  }

  return issues
}

// ─── Presentation-level checks (called separately) ───────────────────────────

export function checkPresentationLevelRules(
  parsed: ParsedPresentation,
  ruleSet: RuleSet,
): SlideIssue[] {
  const issues: SlideIssue[] = []

  for (const rule of ruleSet.rules) {
    if (rule.type === 'slide_count') {
      const expected = parseInt(rule.value, 10)
      if (!isNaN(expected) && !compareNumbers(parsed.slideCount, expected, rule.operator)) {
        issues.push({
          id: issueId(),
          slideIndex: 0,
          slideTitle: 'Presentation',
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          actual: `${parsed.slideCount}`,
          expected: `${operatorLabel(rule.operator)} ${expected}`,
          message: `Presentation has ${parsed.slideCount} slides, expected ${operatorLabel(rule.operator)} ${expected}`,
        })
      }
    }
  }

  return issues
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeIssue(
  rule: ValidationRule,
  slide: ParsedSlide,
  overrides: { actual?: string; expected?: string; message: string },
): SlideIssue {
  return {
    id: issueId(),
    slideIndex: slide.index,
    slideTitle: slide.title ?? undefined,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: overrides.message,
    actual: overrides.actual,
    expected: overrides.expected,
  }
}

function compareNumbers(actual: number, expected: number, operator: ValidationRule['operator']): boolean {
  switch (operator) {
    case 'equals':       return actual === expected
    case 'greater_than': return actual > expected
    case 'less_than':    return actual < expected
    default:             return true
  }
}

function operatorLabel(op: ValidationRule['operator']): string {
  switch (op) {
    case 'equals':       return '='
    case 'greater_than': return '>'
    case 'less_than':    return '<'
    default:             return op
  }
}

function normalizeHex(color: string): string | null {
  const clean = color.replace(/^#/, '').toUpperCase()
  return /^[0-9A-F]{6}$/.test(clean) ? `#${clean}` : null
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function issueId(): string {
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Exported so slide_count rule can be evaluated after slides are parsed
export type { ParsedRun }
