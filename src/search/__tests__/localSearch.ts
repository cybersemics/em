import { HOME_PATH } from '../../constants'
import initDB, * as db from '../../data-providers/dexie'
import { importText } from '../../reducers'
import { Context } from '../../types'
import { initialState } from '../../util'
import * as localSearch from '../localSearch'

/** Import text into the root of a blank initial state. */
const importThoughts = (text: string) => {
  const stateNew = importText(initialState(), { path: HOME_PATH, text })
  return {
    contextIndex: stateNew.thoughts.contextIndex,
    thoughtIndex: stateNew.thoughts.thoughtIndex,
  }
}

describe('local search', () => {
  beforeEach(initDB)
  afterEach(db.clearAll)

  it('full text search with single word', async () => {

    const { thoughtIndex } = importThoughts(`
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

    await Promise.all(Object.keys(thoughtIndex).map(hash => db.updateThought(hash, thoughtIndex[hash])))

    const contextMap = await localSearch.searchAndGenerateContextMap('One')

    const expectedContexts: Context[] = [
      ['LP'],
      ['Katty Perry'],
      ['Metallica'],
      ['Three Dog Night']
    ]

    const contexts = Object.values(contextMap)

    expect(contexts).toHaveLength(4)
    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
  })

  it('full text search with multiple words', async () => {

    const { thoughtIndex } = importThoughts(`
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

    await Promise.all(Object.keys(thoughtIndex).map(hash => db.updateThought(hash, thoughtIndex[hash])))

    const contextMap = await localSearch.searchAndGenerateContextMap('products and')

    const expectedContexts: Context[] = [['Tasks', 'Errands'], ['Tasks', 'Projects', 'Multi vendor project']]

    const contexts = Object.values(contextMap)

    expect(contexts).toHaveLength(2)
    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
  })

  it('full text search with ignore case', async () => {

    const { thoughtIndex } = importThoughts(`
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

    await Promise.all(Object.keys(thoughtIndex).map(hash => db.updateThought(hash, thoughtIndex[hash])))

    const contextMap = await localSearch.searchAndGenerateContextMap('tenacious')

    const expectedContexts: Context[] = [
      ['Anime Characters', 'Naruto'],
      ['Anime Characters', 'Eren']
    ]

    const contexts = Object.values(contextMap)

    expect(contexts).toHaveLength(2)
    expect(contexts).toEqual(expect.arrayContaining(expectedContexts))
  })
})
