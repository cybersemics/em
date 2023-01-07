import hashThought from '../../util/hashThought'
import { DataProvider } from '../DataProvider'

/** Gets a Lexeme by value from a provider. */
const getLexeme = async (provider: DataProvider, value: string) => provider.getLexemeById(hashThought(value))

export default getLexeme
