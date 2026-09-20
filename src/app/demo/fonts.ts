import { loadFont } from '@/app/editor/fonts'

export async function loadDemoFonts() {
  await Promise.all([
    loadFont('Inter', 'Regular'),
    loadFont('Inter', 'Medium'),
    loadFont('Inter', 'SemiBold'),
    loadFont('Inter', 'Bold')
  ])
}
