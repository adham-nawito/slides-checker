/**
 * Pure browser-side PPTX parser using JSZip + DOMParser.
 *
 * A .pptx file is a ZIP archive containing:
 *   ppt/slides/slide1.xml, slide2.xml, …
 *   ppt/slideLayouts/slideLayout*.xml
 *   ppt/theme/theme1.xml
 *
 * We extract font sizes, font families, colors, header/footer presence,
 * text alignment, and line spacing from each slide's XML.
 *
 * Each paragraph is tagged with its placeholder type (title / heading /
 * body / footer) so the validator can apply scoped rules correctly.
 */

import JSZip from 'jszip'

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Maps PPTX placeholder types to our rule-scope vocabulary.
 *
 * PPTX <p:ph> type attribute → PlaceholderType
 *   "title" | "ctrTitle"  → "title"
 *   "subTitle"             → "heading"
 *   "body" | (default)     → "body"
 *   "ftr"                  → "footer"
 */
export type PlaceholderType = 'title' | 'heading' | 'body' | 'footer'

export interface ParsedSlide {
  index: number          // 0-based
  title: string | null
  paragraphs: ParsedParagraph[]
  hasHeader: boolean
  hasFooter: boolean
}

export interface ParsedParagraph {
  text: string
  runs: ParsedRun[]
  alignment: 'left' | 'center' | 'right' | 'justify' | null
  lineSpacing: number | null      // in points (spcPts / 100) or null
  placeholderType: PlaceholderType // which placeholder this paragraph came from
}

export interface ParsedRun {
  text: string
  fontSizePt: number | null    // sz / 100 → pt
  fontFamily: string | null
  color: string | null         // #RRGGBB or null
  bold: boolean
  italic: boolean
}

export interface ParsedPresentation {
  slideCount: number
  slides: ParsedSlide[]
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export async function parsePptx(file: File): Promise<ParsedPresentation> {
  const buffer = await file.arrayBuffer()
  const zip    = await JSZip.loadAsync(buffer)

  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b))

  const slides: ParsedSlide[] = await Promise.all(
    slideEntries.map((path, index) => parseSlideXml(zip, path, index)),
  )

  return { slideCount: slides.length, slides }
}

// ─── Slide parsing ───────────────────────────────────────────────────────────

async function parseSlideXml(zip: JSZip, path: string, index: number): Promise<ParsedSlide> {
  const xmlText = await zip.file(path)!.async('string')
  const doc     = new DOMParser().parseFromString(xmlText, 'application/xml')

  // Iterate over every text shape (<p:sp>) and tag its paragraphs with the
  // shape's placeholder type. Shapes without a <p:ph> element default to "body".
  const paragraphs: ParsedParagraph[] = []
  for (const shape of Array.from(doc.querySelectorAll('sp'))) {
    const phEl           = shape.querySelector('ph')
    const placeholderType = resolvePlaceholderType(phEl?.getAttribute('type') ?? null)
    paragraphs.push(...parseParagraphsInShape(shape, placeholderType))
  }

  // Title: first paragraph from a title placeholder (fallback: first paragraph overall)
  const titlePara = paragraphs.find((p) => p.placeholderType === 'title')
  const titleText = titlePara?.text ?? paragraphs[0]?.text ?? null

  // hasHeader/hasFooter remain presence checks on the slide XML
  const hasHeader = doc.querySelector('[type="title"], [type="ctrTitle"]') !== null
  const hasFooter = doc.querySelector('[type="ftr"]') !== null

  return { index, title: titleText || null, paragraphs, hasHeader, hasFooter }
}

/**
 * Maps a raw PPTX placeholder type string to our PlaceholderType enum.
 * Anything unrecognised is treated as body content.
 */
function resolvePlaceholderType(phType: string | null): PlaceholderType {
  switch (phType) {
    case 'title':
    case 'ctrTitle':  return 'title'
    case 'subTitle':  return 'heading'
    case 'ftr':       return 'footer'
    default:          return 'body'   // "body", null, or any other value
  }
}

function parseParagraphsInShape(
  shape: Element,
  placeholderType: PlaceholderType,
): ParsedParagraph[] {
  return Array.from(shape.querySelectorAll('p'))
    .map((pEl) => {
      const runs = parseRuns(pEl)
      const text = runs.map((r) => r.text).join('')

      const pPrEl       = pEl.querySelector('pPr')
      const alignment   = parseAlignment(pPrEl?.getAttribute('algn') ?? null)

      const spcPtsEl    = pEl.querySelector('lnSpc spcPts')
      const lineSpacing = spcPtsEl
        ? parseInt(spcPtsEl.getAttribute('val') ?? '0', 10) / 100
        : null

      return { text, runs, alignment, lineSpacing, placeholderType }
    })
    .filter((p) => p.text.trim().length > 0)
}

function parseRuns(pEl: Element): ParsedRun[] {
  return Array.from(pEl.querySelectorAll('r')).map((rEl) => {
    const tEl  = rEl.querySelector('t')
    const text = tEl?.textContent ?? ''

    const rPrEl = rEl.querySelector('rPr')

    const szRaw     = rPrEl?.getAttribute('sz')
    const fontSizePt = szRaw ? parseInt(szRaw, 10) / 100 : null

    const latinEl   = rPrEl?.querySelector('latin')
    const fontFamily = latinEl?.getAttribute('typeface') ?? null

    const solidFillEl = rPrEl?.querySelector('solidFill')
    const color       = parseSolidFill(solidFillEl)

    const bold   = rPrEl?.getAttribute('b') === '1'
    const italic = rPrEl?.getAttribute('i') === '1'

    return { text, fontSizePt, fontFamily, color, bold, italic }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSolidFill(el: Element | null | undefined): string | null {
  if (!el) return null
  const srgbEl = el.querySelector('srgbClr')
  if (srgbEl) {
    const val = srgbEl.getAttribute('val')
    return val ? `#${val.toUpperCase()}` : null
  }
  // Theme color references (schemeClr) require theme.xml resolution — return null
  return null
}

function parseAlignment(raw: string | null): ParsedParagraph['alignment'] {
  const map: Record<string, ParsedParagraph['alignment']> = {
    l: 'left', ctr: 'center', r: 'right', just: 'justify',
  }
  return raw ? (map[raw] ?? null) : null
}

function slideNumber(path: string): number {
  const m = path.match(/slide(\d+)\.xml$/)
  return m ? parseInt(m[1], 10) : 0
}
