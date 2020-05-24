import React from 'react'
import { act } from 'react-dom/test-utils'
import Adapter from 'enzyme-adapter-react-16'
import { configure, mount } from 'enzyme'
import 'jest-localstorage-mock'

import App, { initialized } from './App'
import { keyDown } from './shortcuts'

configure({ adapter: new Adapter() })

/** Set up testing and mock document and window functions. */
export const createTestApp = async () => {

  document.getSelection = () => ({
    type: 'None',
    removeAllRanges: () => {},
  })

  document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
    collapse: () => {},
  })

  // Upgrade to jsdom v16 which implemented the selection API
  // https://github.com/SimenB/jest-environment-jsdom-sixteen
  window.getSelection = () => ({
    focusOffset: 0,
    removeAllRanges: () => {},
    addRange: () => {},
  })

  window.location = {
    pathname: '',
    search: ''
  }

  await act(async () => {
    jest.useFakeTimers()

    // wait for app to be initialized
    // specifically for initialSettings to be loaded via loadLocalState
    await initialized

    const root = document.body.appendChild(document.createElement('div'))
    const wrapper = await mount(
      <div
        id="keyboard"
        onKeyDown={keyDown}
        tabIndex="0"
      >
        <App />
      </div>,
      { attachTo: root }
    )
    const skipTutorial = wrapper.find('div.modal-actions div a')
    skipTutorial.simulate('click')
    document.wrapper = wrapper
  })
}
