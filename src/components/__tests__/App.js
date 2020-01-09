import React from 'react'
import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import { App } from '../App'

// eslint-disable-next-line no-undef
beforeAll(() => {
  document.getSelection = () => ({ type: 'None' })
})

// eslint-disable-next-line no-undef
afterAll(() => {
  // eslint-disable-next-line fp/no-delete
  delete document.getSelection
})

it('App', async () => {
  let wrapper // eslint-disable-line fp/no-let,no-unused-vars
  await act(async () => {
    wrapper = await mount(
      <App />
    )
  })
})
