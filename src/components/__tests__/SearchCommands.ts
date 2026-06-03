import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchCommands from '../SearchCommands'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SearchCommands', () => {
  it('blurs the search input on scroll', () => {
    render(createElement(SearchCommands))

    const input = screen.getByPlaceholderText('Search commands...')
    const blur = vi.spyOn(input, 'blur')

    input.focus()
    fireEvent.scroll(window)

    expect(blur).toHaveBeenCalled()
  })

  it('blurs the search input on touchmove', () => {
    render(createElement(SearchCommands))

    const input = screen.getByPlaceholderText('Search commands...')
    const blur = vi.spyOn(input, 'blur')

    input.focus()
    fireEvent.touchMove(window)

    expect(blur).toHaveBeenCalled()
  })
})
