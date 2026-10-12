import { render, renderHook } from '@testing-library/react'
import { createElement, createRef } from 'react'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import Timestamp from '../../@types/Timestamp'
import { HOME_TOKEN } from '../../constants'
import useCachedThoughtHtml from '../useCachedThoughtHtml'

it('preserves the latest rendered HTML when an unchanged thought is deleted', () => {
  const thought: Thought = {
    id: 'c' as ThoughtId,
    parentId: HOME_TOKEN,
    value: 'c',
    created: 0 as Timestamp,
    lastUpdated: 0 as Timestamp,
    updatedBy: 'test',
  }
  const elementRef = createRef<HTMLDivElement>()
  const element = render(createElement('div', { ref: elementRef }, createElement('span', null, '3.'), 'c'))
  const { result, rerender } = renderHook(useCachedThoughtHtml, {
    initialProps: { thought: thought as Thought | undefined, elementRef },
  })
  expect(result.current.current).toBe('<span>3.</span>c')

  // Reordering siblings changes rendered numbering without changing the thought object.
  element.rerender(createElement('div', { ref: elementRef }, createElement('span', null, '2.'), 'c'))
  rerender({ thought, elementRef })
  expect(result.current.current).toBe('<span>2.</span>c')

  element.unmount()
  rerender({ thought: undefined, elementRef })
  expect(result.current.current).toBe('<span>2.</span>c')
})
