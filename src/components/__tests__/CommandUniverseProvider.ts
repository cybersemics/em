import { fireEvent, render, screen } from '@testing-library/react'
import { createElement, useState } from 'react'
import useCommandUniverseNavigator from '../../hooks/useCommandUniverseNavigator'
import CommandUniverseProvider from '../CommandUniverse/CommandUniverseProvider'

/** A separate consumer initiates navigation, as a header or embedded link would. */
const Opener = () => {
  const navigator = useCommandUniverseNavigator()
  return createElement('button', { onClick: () => navigator.open('grid', {}) }, 'Visit')
}

/** Another consumer observes the same navigator and owns independent page-local input. */
const Reader = () => {
  const navigator = useCommandUniverseNavigator()
  return createElement(
    'div',
    null,
    createElement('output', null, String(navigator.entries.length)),
    createElement('input', { 'aria-label': 'Local page state', defaultValue: '' }),
  )
}

/** Presentation changes preserve the provider and the same subtree rather than replacing either. */
const PresentationFixture = () => {
  const [docked, setDocked] = useState(false)
  return createElement(
    CommandUniverseProvider,
    { isOpen: true },
    createElement('button', { onClick: () => setDocked(!docked) }, docked ? 'Show modal' : 'Dock'),
    createElement(
      'section',
      { 'aria-label': docked ? 'Docked view' : 'Modal view' },
      createElement(Opener),
      createElement(Reader),
    ),
  )
}

it('shares one navigator across consumers and preserves it while presentation changes', () => {
  render(createElement(PresentationFixture))
  fireEvent.change(screen.getByRole('textbox', { name: 'Local page state' }), { target: { value: 'keep me' } })
  fireEvent.click(screen.getByRole('button', { name: 'Visit' }))
  expect(screen.getByRole('status')).toHaveTextContent('2')
  fireEvent.click(screen.getByRole('button', { name: 'Dock' }))
  expect(screen.getByRole('region', { name: 'Docked view' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('2')
  expect(screen.getByRole('textbox', { name: 'Local page state' })).toHaveValue('keep me')
})

it('rejects navigation access outside its provider', () => {
  expect(() => render(createElement(Opener))).toThrow('Command Universe navigation requires a CommandUniverseProvider.')
})
