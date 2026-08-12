import { render } from '@testing-library/react'
import { createElement } from 'react'
import ReactDOM from 'react-dom'
import FadeTransition from '../FadeTransition'

const findDOMNode = vi.fn(() => document.createElement('span'))
const legacyReactDOM = ReactDOM as typeof ReactDOM & { findDOMNode?: typeof findDOMNode }

beforeAll(() => {
  legacyReactDOM.findDOMNode = findDOMNode
})

afterAll(() => {
  delete legacyReactDOM.findDOMNode
})

it('renders an appearing transition without falling back to findDOMNode', () => {
  const view = render(
    createElement(
      FadeTransition,
      { type: 'fast', in: true, appear: true, nodeRef: undefined },
      createElement('span', null, 'transition content'),
    ),
  )

  expect(view.getByText('transition content')).toBeInTheDocument()
  expect(findDOMNode).not.toHaveBeenCalled()
})
