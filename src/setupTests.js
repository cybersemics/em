import React from 'react'
import { act } from 'react-dom/test-utils'
import Adapter from 'enzyme-adapter-react-16'
import { configure, mount } from 'enzyme'
import 'jest-localstorage-mock'

import App from './App'
import { keyDown } from './shortcuts'

configure({ adapter: new Adapter() })

/** Set up testing and mock document and window functions. */
const createTestApp = async app => {
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

  window.getSelection = () => ({
    focusOffset: 3,
    removeAllRanges: () => {},
    addRange: () => {},
  })

  window.location = {
    pathname: '',
    search: ''
  }

  await act(async () => {
    jest.useFakeTimers()

    const root = document.body.appendChild(document.createElement('div'))
    const wrapper = await mount(
      <div
        id="keyboard"
        onKeyDown={keyDown}
        tabIndex="0"
      >
        {app}
      </div>,
      { attachTo: root }
    )
    const skipTutorial = wrapper.find('div.modal-actions div a')
    skipTutorial.simulate('click')
    document.wrapper = wrapper
  })
}

beforeAll(async () => {
  createTestApp(<App />)
})

afterAll(async () => {
  document.wrapper.unmount()
})
