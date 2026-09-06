/**
 * Web Worker — parses and validates a PPTX file off the main thread.
 * Keeps the UI responsive even for decks with hundreds of slides.
 *
 * Message in:  { file: File, tag: Tag }
 * Messages out:
 *   { type: 'progress', percent: number, message: string }
 *   { type: 'result',   report: ValidationReport, passPercent: number, passed: boolean, slideCount: number }
 *   { type: 'error',    message: string }
 */

import { parsePptx } from '../lib/pptxParser'
import { validatePresentation, checkPresentationLevelRules } from '../lib/pptxValidator'
import type { Tag, RuleSet, ValidationReport } from '../types'

interface WorkerInput {
  file: File
  tag: Tag
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { file, tag } = e.data

  try {
    self.postMessage({ type: 'progress', percent: 5,  message: 'Reading file…' })

    // Build a RuleSet adapter (validators expect RuleSet shape)
    const ruleSet: RuleSet = {
      id:          tag.id,
      name:        tag.name,
      description: '',
      rules:       tag.rules,
      tags:        [],
      createdAt:   tag.createdAt,
      updatedAt:   tag.createdAt,
    }

    self.postMessage({ type: 'progress', percent: 15, message: 'Unpacking slides…' })
    const parsed = await parsePptx(file)

    self.postMessage({ type: 'progress', percent: 65, message: `Checking ${parsed.slideCount} slides…` })
    const presIssues = checkPresentationLevelRules(parsed, ruleSet)
    const report: ValidationReport = validatePresentation(parsed, ruleSet, 'local', file.name)

    // Merge presentation-level issues into the report
    if (presIssues.length > 0) {
      report.issues.unshift(...presIssues)
      presIssues.forEach((i) => {
        if (i.severity === 'error')   report.summary.errors++
        if (i.severity === 'warning') report.summary.warnings++
        if (i.severity === 'info')    report.summary.infos++
      })
    }

    self.postMessage({ type: 'progress', percent: 95, message: 'Calculating score…' })

    const totalRules = ruleSet.rules.length
    const passPercent = totalRules > 0
      ? Math.round((report.summary.passing / totalRules) * 100)
      : 100

    const passed = passPercent >= tag.threshold

    self.postMessage({
      type: 'result',
      report,
      passPercent,
      passed,
      slideCount: parsed.slideCount,
    })

  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to process file',
    })
  }
}
