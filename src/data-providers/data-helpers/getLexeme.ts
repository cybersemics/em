import { hashThought } from '../../util'
import { DataProvider } from '../DataProvider'

/** Gets the Lexeme object of a value. */
const getLexeme = async (provider: DataProvider, value: string) => provider.getLexemeById(hashThought(value))

export default getLexeme
