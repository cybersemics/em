import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import * as stripModule from '../../util/strip'
import EditorProvider from '../EditorProvider'
import Link from '../Link'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)
afterEach(vi.restoreAllMocks)

it('does not restrip an unchanged link after an unrelated move', async () => {
  await dispatch(importText({ text: '- linked\n- source\n  - other\n- destination', preventSetCursor: true }))
  const simplePath = contextToPathOrThrow(store.getState(), ['linked'], 'Link')
  const strip = vi.spyOn(stripModule, 'default')
  render(createElement(EditorProvider, { store, children: createElement(Link, { simplePath }) }))
  expect(screen.getByText('linked')).toBeInTheDocument()
  expect(strip).toHaveBeenCalledWith('linked')
  strip.mockClear()

  await dispatch(moveThought({ from: ['source', 'other'], to: ['destination', 'other'], after: null }))

  expect(strip).not.toHaveBeenCalledWith('linked')
  expect(screen.getByText('linked')).toBeInTheDocument()

  await dispatch(editThought(['linked'], 'updated <b>label</b>'))

  expect(screen.getByText('updated label')).toBeInTheDocument()
})
