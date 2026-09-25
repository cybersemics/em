import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import archiveThought from '../archiveThought'
import newThought from '../newThought'
import toggleHiddenThoughts from '../toggleHiddenThoughts'
import undoArchive from '../undoArchive'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('restores the thought and removes only the empty archive when hidden thoughts are visible', () => {
  const state = runDocumentCommand(reducerFlow([newThought('a'), newThought('b')]), initialState())
  const originalPath = contextToPathOrThrow(state, ['b'], 'undoArchive')
  const archived = runDocumentCommand(reducerFlow([archiveThought({}), toggleHiddenThoughts]), state)

  const restored = runDocumentCommand(
    undoArchive({ originalPath, currPath: contextToPathOrThrow(archived, ['=archive', 'b'], 'undoArchive') }),
    archived,
  )

  expect(exportContext(restored, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
  expectPathToEqual(restored, restored.cursor, ['b'])
})
