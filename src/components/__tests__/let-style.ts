import { queryByLabelText } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import * as thoughtStyleHook from '../../hooks/useThoughtStyle'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import getClosestByLabel from '../../test-helpers/queries/getClosestByLabel'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)
afterEach(vi.restoreAllMocks)

describe('let-style', () => {
  it('does not render a parent when only its ordinary children reorder', async () => {
    const useThoughtStyle = vi.spyOn(thoughtStyleHook, 'default')
    await dispatch(importText({ text: '- Parent\n  - first\n  - second\n- Elsewhere' }))
    await act(vi.runAllTimersAsync)
    const parent = await findThoughtByText('Parent')
    expect(parent).toHaveAttribute('aria-label', expect.stringMatching(/^editable-/))
    const thoughtId = parent!.getAttribute('aria-label')!.slice('editable-'.length)
    expect(useThoughtStyle).toHaveBeenCalledWith(expect.objectContaining({ thoughtId }))
    useThoughtStyle.mockClear()

    await dispatch(moveThought({ from: ['Parent', 'second'], to: ['Parent', 'second'], after: null }))
    await act(vi.runAllTimersAsync)

    expect(useThoughtStyle).not.toHaveBeenCalledWith(expect.objectContaining({ thoughtId }))
    expect(await findThoughtByText('Parent')).toBeInTheDocument()
  })

  it('updates env styles and bullets when expressions and definitions change', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
            - =styleContainer
              - opacity
                - 0.5
            - =bullet
              - None
        - Razzle
          - dazzle
        - Nuzzle
      `,
      }),
    ])

    const thoughtRazzle = getClosestByLabel(await findThoughtByText('Razzle'), 'child')!
    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)', opacity: '0.5' })
    expect(queryByLabelText(thoughtRazzle, 'bullet')).toBeNull()

    const thoughtNuzzle = await findThoughtByText('Nuzzle')
    expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

    await dispatch(editThought(['Razzle', 'dazzle'], 'ordinary'))

    expect(thoughtRazzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
    expect(thoughtRazzle).not.toHaveStyle({ opacity: '0.5' })
    expect(queryByLabelText(thoughtRazzle, 'bullet')).not.toBeNull()

    await dispatch(editThought(['Razzle', 'ordinary'], 'dazzle'))

    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)', opacity: '0.5' })
    expect(queryByLabelText(thoughtRazzle, 'bullet')).toBeNull()

    await dispatch(
      editThought(['=let', 'dazzle', '=style', 'color', 'rgba(255, 192, 203, 1)'], 'rgba(100, 100, 100, 1)'),
    )

    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(100, 100, 100, 1)' })
  })

  it('=let/x/=style is not applied to siblings and sibling descendants', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
        - Razzle
          - =dazzle
          - Roo
      `,
      }),
    ])

    const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="child"]')
    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

    const thoughtNuzzle = await findThoughtByText('Roo')
    expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
  })

  it('=let/=test/=style is not applied to =test within the =let definition', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
      `,
      }),
      setCursor(['=let']),
    ])

    const thoughtDazzle = await findThoughtByText('=dazzle')
    expect(thoughtDazzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
  })

  it('=let/x/=style is not applied to =let itself', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
      `,
      }),
      setCursor(['=let']),
    ])

    const thoughtLet = await findThoughtByText('=let')
    expect(thoughtLet).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
  })

  it('=let/x/=style is available to all descendants', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
        - Shoozle
          - Razzle
            - =dazzle
        - Nuzzle
      `,
      }),
      setCursor(['Shoozle']),
    ])

    const thoughtShoozle = await findThoughtByText('Shoozle')
    expect(thoughtShoozle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

    const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="child"]')
    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

    const thoughtNuzzle = await findThoughtByText('Nuzzle')
    expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
  })

  it('multiple definitions in same =let', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - =fizzle
            - =style
              - fontStyle
                - italic
              - color
                - rgba(100, 100, 100, 1)
        - Razzle
          - =dazzle
          - =fizzle
      `,
      }),
      setCursor(['Razzle']),
    ])

    const thoughtRazzleContainer = (await findThoughtByText('Razzle'))?.closest('[aria-label="child"]')
    expect(thoughtRazzleContainer).toHaveStyle({
      color: 'rgba(100, 100, 100, 1)',
    })

    const thoughtRazzle = await findThoughtByText('Razzle')
    expect(thoughtRazzle).toHaveStyle({
      fontStyle: 'italic',
    })

    await dispatch(
      moveThought({ from: ['Razzle', '=dazzle'], to: ['Razzle', '=dazzle'], after: ['Razzle', '=fizzle'] }),
    )

    expect(thoughtRazzleContainer).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
    expect(thoughtRazzle).toHaveStyle({ fontStyle: 'italic' })
  })

  it('deep let > shallow let', async () => {
    await dispatch([
      importText({
        text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
        - Shoozle
          - =let
            - =dazzle
              - =style
                - color
                  - rgba(100, 100, 100, 1)
          - Razzle
            - =dazzle
      `,
      }),
      setCursor(['Shoozle']),
    ])

    const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="child"]')
    expect(thoughtRazzle).toHaveStyle({ color: 'rgba(100, 100, 100, 1)' })
  })
})
