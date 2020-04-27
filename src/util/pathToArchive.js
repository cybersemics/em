
import { splice } from './splice'

// Return path to archive in the same context
export const pathToArchive = path => {
  const archive = [{ value: '=archive' }]
  return splice(path, path.length - 1, 0, ...archive)
}
