import React from 'react'
import { act } from 'react-dom/test-utils'
import Adapter from 'enzyme-adapter-react-16'
import { configure, mount } from 'enzyme'
import 'jest-localstorage-mock'

import App, { initialized } from './App'

configure({ adapter: new Adapter() })

/** Dispatches an event on the window object. */
export const windowEvent = (...args) =>
  window.dispatchEvent(new KeyboardEvent(...args))

/** Set up testing and mock document and window functions. */
export const createTestApp = async () => {
  await act(async () => {
    try {
      jest.useFakeTimers()

      // wait for app to be initialized
      // specifically for initialSettings to be loaded via loadLocalState
      await initialized

      const root = document.body.appendChild(document.createElement('div'))
      const wrapper = await mount(
        <App />,
        { attachTo: root }
      )
      const skipTutorial = wrapper.find('div.modal-actions div a')
      skipTutorial.simulate('click')
      document.wrapper = wrapper
    }
    catch(e) {
      console.error(e)
    }
  })
}
