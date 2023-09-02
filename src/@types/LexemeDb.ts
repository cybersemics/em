import Lexeme from './Lexeme'

type FlatContexts = {
  // mapped to docKey to allow co-location of children in db
  [key in `cx-${string}`]: string | null
}

/** A Lexeme database type that defines contexts as separate keys. */
type LexemeDb = Omit<Lexeme, 'contexts'> & FlatContexts

export default LexemeDb
