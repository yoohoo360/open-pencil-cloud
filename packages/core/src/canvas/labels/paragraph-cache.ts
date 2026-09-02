import type { Canvas, CanvasKit, Paragraph, TypefaceFontProvider } from 'canvaskit-wasm'

interface LabelParagraphEntry {
  paragraph: Paragraph
  width: number
  height: number
}

const MAX_LABEL_PARAGRAPHS = 512

export class LabelParagraphCache {
  private readonly entries = new Map<string, LabelParagraphEntry>()
  private fontGeneration = -1

  measure(
    ck: CanvasKit,
    provider: TypefaceFontProvider,
    text: string,
    fontSize: number,
    maxWidth: number,
    color: Float32Array,
    generation: number
  ): Pick<LabelParagraphEntry, 'width' | 'height'> {
    return this.entry(ck, provider, text, fontSize, maxWidth, color, generation)
  }

  draw(
    ck: CanvasKit,
    canvas: Canvas,
    provider: TypefaceFontProvider,
    text: string,
    fontSize: number,
    maxWidth: number,
    color: Float32Array,
    generation: number,
    x: number,
    y: number
  ): number {
    const entry = this.entry(ck, provider, text, fontSize, maxWidth, color, generation)
    canvas.drawParagraph(entry.paragraph, x, y)
    return entry.width
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.paragraph.delete()
    this.entries.clear()
  }

  size(): number {
    return this.entries.size
  }

  private entry(
    ck: CanvasKit,
    provider: TypefaceFontProvider,
    text: string,
    fontSize: number,
    maxWidth: number,
    color: Float32Array,
    generation: number
  ): LabelParagraphEntry {
    if (generation !== this.fontGeneration) {
      this.clear()
      this.fontGeneration = generation
    }
    const boundedWidth = Math.max(1, maxWidth)
    const key = `${fontSize}\0${boundedWidth}\0${Array.from(color).join(',')}\0${text}`
    let entry = this.entries.get(key)
    if (!entry) {
      const style = new ck.ParagraphStyle({
        maxLines: 1,
        ellipsis: '…',
        textStyle: { color, fontFamilies: ['Inter'], fontSize }
      })
      const builder = ck.ParagraphBuilder.MakeFromFontProvider(style, provider)
      builder.addText(text)
      const paragraph = builder.build()
      builder.delete()
      paragraph.layout(boundedWidth)
      entry = {
        paragraph,
        width: Math.min(paragraph.getLongestLine(), boundedWidth),
        height: paragraph.getHeight()
      }
      this.entries.set(key, entry)
      this.evict()
    } else {
      this.entries.delete(key)
      this.entries.set(key, entry)
    }
    return entry
  }

  private evict(): void {
    while (this.entries.size > MAX_LABEL_PARAGRAPHS) {
      const oldestKey = this.entries.keys().next().value
      if (!oldestKey) return
      this.entries.get(oldestKey)?.paragraph.delete()
      this.entries.delete(oldestKey)
    }
  }
}
