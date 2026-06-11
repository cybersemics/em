import fs from 'fs'
import path from 'path'

interface MilestoneSample {
  input: {
    title: string
    body: string
    labels: string[]
  }
  expected: {
    milestone: string
  }
}

/** Loads milestone inference samples from the repository. */
const loadMilestoneSamples = (): MilestoneSample[] => {
  const samplesDir = path.resolve('.github/instructions/milestone/samples')
  if (!fs.existsSync(samplesDir)) return []

  const files = fs.readdirSync(samplesDir).filter(file => file.endsWith('.json'))
  return files.map(file => JSON.parse(fs.readFileSync(path.join(samplesDir, file), 'utf-8')) as MilestoneSample)
}

export default loadMilestoneSamples
