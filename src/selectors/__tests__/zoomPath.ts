import importText from '../../actions/importText'
import setCursor from '../../actions/setCursor'
import toggleContextView from '../../actions/toggleContextView'
import unfoldContext from '../../actions/unfoldContext'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import appendToPath from '../../util/appendToPath'
import head from '../../util/head'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import zoomPath from '../zoomPath'

it('applies an unfolded nominal thought zoom only when that thought is a visible ancestor', () => {
  const state = reducerFlow([
    importText({
      text: `
- Reading
  - m
- Outside
  - District
    - Park
      - m
        - =focus
          - Zoom
        - detail
`,
    }),
    setCursorFirstMatch(['Reading', 'm']),
    toggleContextView,
  ])(initialState())
  const contextViewPath = contextToPathOrThrow(state, ['Reading', 'm'], 'zoom test')
  const district = contextToPathOrThrow(state, ['Outside', 'District'], 'zoom test')
  const nominal = contextToPathOrThrow(state, ['Outside', 'District', 'Park', 'm'], 'zoom test')
  const unfolded = unfoldContext(state, { contextViewPath, contextId: head(nominal), ancestorId: head(district) })

  // The hidden occurrence anchor identifies the portal instance; its attributes are not visible ancestor attributes.
  expect(zoomPath(unfolded)).toBeNull()

  const nominalRoute = appendToPath(unfolded.cursor!, ...nominal.slice(district.length))
  const detailRoute = appendToPath(
    nominalRoute,
    head(contextToPathOrThrow(state, ['Outside', 'District', 'Park', 'm', 'detail'], 'zoom test')),
  )
  expect(zoomPath(setCursor(unfolded, { path: detailRoute }))).toEqual(nominalRoute)
})
