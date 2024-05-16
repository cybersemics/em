// import _ from 'lodash'
// import SimplePath from '../../@types/SimplePath'
// import deleteThought from '../../actions/deleteThought'
// import editThought from '../../actions/editThought'
// import importText from '../../actions/importText'
// import { HOME_PATH, HOME_TOKEN } from '../../constants'
// import db from '../../data-providers/yjs'
// import contextToPath from '../../selectors/contextToPath'
// import store from '../../stores/app'
// import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

// import testTimer from '../../test-helpers/testTimer'

// import head from '../../util/head'
// import parentOf from '../../util/parentOf'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

// const fakeTimer = testTimer()

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// TODO: test stopped working with yjs
// currently all lexemes are loaded in memory
it.skip('editing a thought should load the lexeme and merge contexts', async () => {
  //   // Related issue: https://github.com/cybersemics/em/issues/1074
  //
  //   fakeTimer.useFakeTimer()
  //
  //   store.dispatch(
  //     importText({
  //       text: `
  //       - g
  //         - h
  //       - a
  //         - b
  //           - c
  //             - d
  //               - e
  //                 - f`,
  //     }),
  //   )
  //
  //   await fakeTimer.runAllAsync()
  //
  //   await fakeTimer.useRealTimer()
  //
  //   expect((await getLexemeDb(db, 'f'))?.contexts).toHaveLength(1)
  //
  //   const thoughtH = contextToThought(store.getState(), ['g', 'h'])
  //   const thoughtF = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e', 'f'])
  //
  //   await refreshTestApp()
  //
  //   fakeTimer.useFakeTimer()
  //
  //   // lexeme for 'f' should not be loaded into the state yet.
  //   expect(getLexemeState(store.getState(), 'f')).toBeFalsy()
  //
  //   const pathGH = contextToPath(store.getState(), ['g', 'h']) as SimplePath
  //
  //   store.dispatch(
  //     editThought({
  //       oldValue: 'h',
  //       newValue: 'f',
  //       path: pathGH,
  //     }),
  //   )
  //   await fakeTimer.runAllAsync()
  //
  //   fakeTimer.useRealTimer()
  //
  //   // existing Lexemes should be pulled and synced after thought is edited.
  //
  //   // both db and state should have same updated lexeme
  //   const thoughtContextsState = getLexemeState(store.getState(), 'f')?.contexts
  //
  //   // Note: Thought h has been changed to f but the id remains the same
  //   // check that state has the correct contexts, ignoring order and ids
  //   expect(thoughtContextsState).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))
  //   expect(thoughtContextsState).toHaveLength(2)
  //
  //   // check that db has the correct contexts, ignoring order and ids
  //   const thoughtContextsDb = (await getLexemeDb(db, 'f'))?.contexts
  //   expect(thoughtContextsDb).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))
  //
  //   expect(thoughtContextsState).toHaveLength(2)
})
