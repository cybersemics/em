import { screen } from '@testing-library/react'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/6080
it('shows the Repeat description once', async () => {
  await dispatch(desktopCommandUniverse())

  const description = screen.getByText(/^Repeats the last command\./)
  expect(description).toHaveTextContent(/^Repeats the last command\.$/)
})
