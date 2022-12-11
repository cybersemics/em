import Context from '../../@types/Context'
import initDB, * as db from '../../data-providers/dexie'
import importText from '../../reducers/importText'
import initialState from '../../util/initialState'
import localSearch from '../localSearch'

/** Import text into the root of a blank initial state. */
const importThoughts = (text: string) => {
  const stateNew = importText(initialState(), { text })
  return {
    thoughtIndex: stateNew.thoughts.thoughtIndex,
    lexemeIndex: stateNew.thoughts.lexemeIndex,
  }
}

describe('local search', () => {
  beforeEach(initDB)
  afterEach(db.clear)

  it('full text search with single word', async () => {
    const { lexemeIndex, thoughtIndex } = importThoughts(`
    - LP
      - Lost on you
      - One last time
    - Katty Perry
      - Fireworks
      - Roar
      - One That Got Away
    - Metallica
      - One
      - Fade To Black
      - Nothing Else Matters
    - Three Dog Night
      - East To Be Hard
      - One`)

    await Promise.all(Object.keys(lexemeIndex).map(hash => db.updateLexeme(hash, lexemeIndex[hash])))

    const state = initialState()

    const search = localSearch({
      ...state,
      thoughts: {
        ...state.thoughts,
        lexemeIndex,
        thoughtIndex,
      },
    })

    const contextMap = await search.searchAndGenerateContextMap('One')

    const expectedContexts: Context[] = [['LP'], ['Katty Perry'], ['Metallica'], ['Three Dog Night']]

    const contexts = Object.values(contextMap)

    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
    expect(contexts).toHaveLength(4)
  })

  // In database schema v8, Lexeme.value has been changed to the normalized Lexeme.lemma, which removes whitespace
  // This breaks full text search which relies on whitespace for word indexing
  // We may need to look up one of the Lexeme context thoughts in the dexie hooks that index the words
  it.skip('full text search with multiple words', async () => {
    const { lexemeIndex, thoughtIndex } = importThoughts(`
    - Tasks
      - Errands
        - Get apple juice
        - Buy anime posters
        - Get hair products and a body lotion
      - Projects
        - Multi vendor project
          - Add products CRUD api and write swagger docs
          - Pass regionId to header
      - Personal
        - Update CV and check emails
    `)

    await Promise.all(Object.keys(lexemeIndex).map(hash => db.updateLexeme(hash, lexemeIndex[hash])))

    const state = initialState()

    const search = localSearch({
      ...state,
      thoughts: {
        ...state.thoughts,
        lexemeIndex,
        thoughtIndex,
      },
    })

    const contextMap = await search.searchAndGenerateContextMap('products and')

    const expectedContexts: Context[] = [
      ['Tasks', 'Errands'],
      ['Tasks', 'Projects', 'Multi vendor project'],
    ]

    const contexts = Object.values(contextMap)

    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
    expect(contexts).toHaveLength(2)
  })

  it.skip('full text search with ignore case', async () => {
    const { lexemeIndex, thoughtIndex } = importThoughts(`
    - Anime Characters
      - Naruto
        - Knucklehead
        - Tenacious
      - Eren
        - Hard working and tenacious
        - Caring
      - Light Yagami
        - Smart
        - Evil
        - Bold
    `)

    await Promise.all(Object.keys(lexemeIndex).map(hash => db.updateLexeme(hash, lexemeIndex[hash])))

    const state = initialState()

    const search = localSearch({
      ...state,
      thoughts: {
        ...state.thoughts,
        lexemeIndex,
        thoughtIndex,
      },
    })

    const contextMap = await search.searchAndGenerateContextMap('tenacious')

    const expectedContexts: Context[] = [
      ['Anime Characters', 'Naruto'],
      ['Anime Characters', 'Eren'],
    ]

    const contexts = Object.values(contextMap)

    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
    expect(contexts).toHaveLength(2)
  })
})
