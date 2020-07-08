import React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import { App } from '../components/App'

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  await act(async () => {

    // Note: initialize is not called here because it is always called before all the tests
    jest.useFakeTimers()

    const root = document.body.appendChild(document.createElement('div'))
    const wrapper = await mount(
      <App />,
      { attachTo: root }
    )

    wrapper.update()
    const skipTutorial = wrapper.find('div.modal-actions div a')
    skipTutorial.simulate('click')
    document.wrapper = wrapper
  })
}

export default createTestApp
