import { readFigFile } from '@open-pencil/core/io/formats/fig'

export function readFigDocument(file: File, signal?: AbortSignal) {
  return readFigFile(file, {
    populate: 'first-page',
    signal
  })
}
