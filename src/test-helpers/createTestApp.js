import React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import App, { initialize } from '../App'

/** Set up testing and mock document and window functions. */
const createTestApp = async () => {
  await act(async () => {
    jest.useFakeTimers()

    // wait for app to be initialized
    // specifically for initialSettings to be loaded via loadLocalState
    await initialize()

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
