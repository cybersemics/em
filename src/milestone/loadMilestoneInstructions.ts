import fs from 'fs'
import path from 'path'

/** Loads milestone inference instructions from the repository. */
const loadMilestoneInstructions = (): string => {
  const filePath = path.resolve('.github/instructions/milestone/milestone.instructions.md')
  return fs.readFileSync(filePath, 'utf-8')
}

export default loadMilestoneInstructions
