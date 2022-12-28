import Index from './IndexType'
import LexemeDb from './LexemeDb'
import ThoughtDb from './ThoughtDb'

interface DatabaseUpdates {
  lastClientId?: string
  lastUpdated?: string
  lexemeIndex?: Index<LexemeDb | null>
  schemaVersion?: number
  thoughtIndex?: Index<ThoughtDb | null>
}

export default DatabaseUpdates
