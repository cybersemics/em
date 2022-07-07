import Index from './IndexType'
import LexemeDb from './LexemeDb'
import ThoughtWithChildren from './ThoughtWithChildren'

interface DatabaseUpdates {
  lastClientId?: string
  lastUpdated?: string
  lexemeIndex?: Index<LexemeDb | null>
  schemaVersion?: number
  thoughtIndex?: Index<ThoughtWithChildren | null>
}

export default DatabaseUpdates
