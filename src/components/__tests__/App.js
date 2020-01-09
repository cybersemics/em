import React from 'react'
import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import { App } from '../App'

it('App', async () => {
  document.getSelection = () => ({ type: 'None' })
  let wrapper // eslint-disable-line fp/no-let,no-unused-vars
  await act(async () => {
    wrapper = await mount(
      <App />
    )
  })
})
