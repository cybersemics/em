import React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import { App } from '../components/App'
import { initialize } from '../initialize'

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  await act(async () => {

    await initialize()

    jest.useFakeTimers()

    const root = document.body.appendChild(document.createElement('div'))
    const wrapper = await mount(<App />, { attachTo: root })
    wrapper.update()

    // dismiss the tutorial
    // make sure it has not already been dismissed
    // i.e. the DOM will be reused when there are multiple tests within the same file
    const skipTutorial = wrapper.find('div.modal-actions div a')
    if (skipTutorial.length > 0) {
      skipTutorial.simulate('click')
    }

    // make wrapper available to tests
    document.wrapper = wrapper
  })
}

export default createTestApp
