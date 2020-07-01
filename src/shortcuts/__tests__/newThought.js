import React from 'react'
import { store } from '../../store'
import { keyDown } from '../../shortcuts'
import { mount } from 'enzyme'
import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'

/** Wrapper dummy component to simulate global key down events for shortcuts. */
const TestWrapper = () => <div onKeyDown={keyDown}></div>

it('empty thought should outdent when hit enter', async () => {

  // skip tutorial and close welcome modal
  await store.dispatch({ type: 'modalComplete', id: 'welcome' })
  await store.dispatch({ type: 'tutorial', value: false })

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
      - c
        - d 
          - e
            - f`))

  await store.dispatch({ type: 'setCursor', thoughtsRanked: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
    { value: 'c', rank: '2' },
    { value: 'd', rank: '3' },
    { value: 'e', rank: '4' },
    { value: 'f', rank: '5' },
  ] })

  // mount wrapper component to simulate global key down events
  const wrapper = await mount(<TestWrapper/>)

  // create a new empty subthought
  wrapper.simulate('keydown', { key: 'Enter', ctrlKey: true })

  // this should cause outdent instead of creating new thought
  await wrapper.simulate('keydown', { key: 'Enter' })
  await wrapper.simulate('keydown', { key: 'Enter' })
  await wrapper.simulate('keydown', { key: 'Enter' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d
          - e
            - f
        -${' '}`

  expect(exported).toEqual(expectedOutput)
})
