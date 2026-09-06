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
 */

import JSZip from 'jszip'

// ─── Public types ────────────────────────────────────────────────────────────

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
  lineSpacing: number | null   // in points (spcPts / 100) or null
}

export interface ParsedRun {
  text: string
  fontSizePt: number | null    // emu hundredths → pt  (sz / 100)
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
  const zip = await JSZip.loadAsync(buffer)

  // Collect slide XML files in order
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
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')

  const paragraphs = parseParagraphs(doc)

  // Title heuristic: first non-empty paragraph in a title/body placeholder (ph type="title" or idx=0)
  const titleEl = doc.querySelector('[type="title"] ~ * p, [type="ctrTitle"] ~ * p')
  const titleText = titleEl ? innerText(titleEl) : (paragraphs[0]?.text ?? null)

  // Header = any text shape tagged as hdr, or a placeholder with idx=0 outside the body
  const hasHeader = doc.querySelector('[type="title"], [type="ctrTitle"]') !== null
  const hasFooter = doc.querySelector('[type="ftr"]') !== null

  return { index, title: titleText || null, paragraphs, hasHeader, hasFooter }
}

function parseParagraphs(doc: Document): ParsedParagraph[] {
  return Array.from(doc.querySelectorAll('p')).map((pEl) => {
    const runs = parseRuns(pEl)
    const text = runs.map((r) => r.text).join('')

    const pPrEl = pEl.querySelector('pPr')
    const alignment = parseAlignment(pPrEl?.getAttribute('algn') ?? null)

    // Line spacing: lnSpc > spcPts (in hundredths of a point) or spcPct
    const spcPtsEl = pEl.querySelector('lnSpc spcPts')
    const lineSpacing = spcPtsEl ? parseInt(spcPtsEl.getAttribute('val') ?? '0', 10) / 100 : null

    return { text, runs, alignment, lineSpacing }
  }).filter((p) => p.text.trim().length > 0)
}

function parseRuns(pEl: Element): ParsedRun[] {
  return Array.from(pEl.querySelectorAll('r')).map((rEl) => {
    const tEl = rEl.querySelector('t')
    const text = tEl?.textContent ?? ''

    const rPrEl = rEl.querySelector('rPr')

    const szRaw = rPrEl?.getAttribute('sz')           // hundredths of a point
    const fontSizePt = szRaw ? parseInt(szRaw, 10) / 100 : null

    const latinEl = rPrEl?.querySelector('latin')
    const fontFamily = latinEl?.getAttribute('typeface') ?? null

    const solidFillEl = rPrEl?.querySelector('solidFill')
    const color = parseSolidFill(solidFillEl)

    const bold = rPrEl?.getAttribute('b') === '1'
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
  // Theme color references (schemeClr) — we can't resolve without theme.xml, return null
  return null
}

function parseAlignment(raw: string | null): ParsedParagraph['alignment'] {
  const map: Record<string, ParsedParagraph['alignment']> = {
    l: 'left', ctr: 'center', r: 'right', just: 'justify',
  }
  if (!raw) return null
  return map[raw] ?? null
}

function innerText(el: Element): string {
  return Array.from(el.querySelectorAll('t')).map((t) => t.textContent ?? '').join('')
}

function slideNumber(path: string): number {
  const m = path.match(/slide(\d+)\.xml$/)
  return m ? parseInt(m[1], 10) : 0
}
