import fs from 'fs'
import path from 'path'

interface MilestoneMapping {
  id: string
  githubTitle: string
}

/** Loads the milestone mapping file that maps stable IDs to GitHub milestone titles. */
const loadMilestoneMap = (): MilestoneMapping[] => {
  const filePath = path.resolve('.github/instructions/milestone/milestones.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MilestoneMapping[]
}

export default loadMilestoneMap
