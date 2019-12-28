import React from 'react'
import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import { App } from '../App'

it('App', async () => {
  let wrapper // eslint-disable-line fp/no-let,no-unused-vars
  await act(async () => {
    wrapper = await mount(
      <App />
    )
  })
  // expect(service.fetch).toHaveBeenCalled() // eslint-disable-line no-undef
  // const email = wrapper.find('input')
  // expect(email.instance().value).toBe('admin@example.com') // eslint-disable-line no-undef
})
