import Index from '../../../src/@types/IndexType'

interface Database {
  email: string
  lastClientId?: string
  lastUpdated?: string
  lexemeIndex: Index<any>
  schemaVersion?: number
  thoughtIndex: Index<any>
}

export default Database
