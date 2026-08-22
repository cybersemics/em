import { queryByLabelText } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import getClosestByLabel from '../../test-helpers/queries/getClosestByLabel'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('hide the bullet of the cursor with =focus/Zoom/=bullet/None defined in a =let expression', async () => {
  await dispatch([
    importText({
      text: `
        - =let
          - =foo
            - =focus
              - Zoom
                - =bullet
                  - None
        - apple
          - =foo
        - bear
      `,
    }),
  ])

  const editableApple = (await findThoughtByText('apple'))!
  const thoughtApple = getClosestByLabel(editableApple, 'thought-container')!
  const thoughtBear = getClosestByLabel(await findThoughtByText('bear'), 'thought-container')!

  // apple has a bullet until it becomes the cursor
  expect(queryByLabelText(thoughtApple, 'bullet')).not.toBeNull()

  const user = userEvent.setup({ delay: null })
  await user.click(editableApple)

  expect(queryByLabelText(thoughtApple, 'bullet')).toBeNull()

  // =focus only applies to the cursor, so bear keeps its bullet
  expect(queryByLabelText(thoughtBear, 'bullet')).not.toBeNull()
})

it('apply =focus/Zoom/=style defined in a =let expression to the cursor', async () => {
  await dispatch([
    importText({
      text: `
        - =let
          - =foo
            - =focus
              - Zoom
                - =style
                  - color
                    - rgba(255, 192, 203, 1)
        - apple
          - =foo
        - bear
      `,
    }),
  ])

  const editableApple = (await findThoughtByText('apple'))!
  const thoughtApple = getClosestByLabel(editableApple, 'child')!
  const thoughtBear = getClosestByLabel(await findThoughtByText('bear'), 'child')!

  // apple is not styled until it becomes the cursor
  expect(thoughtApple).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const user = userEvent.setup({ delay: null })
  await user.click(editableApple)

  expect(thoughtApple).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // =focus only applies to the cursor, so bear is not styled
  expect(thoughtBear).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('hide the siblings of the cursor with =focus/Zoom defined in a =let expression', async () => {
  await dispatch([
    importText({
      text: `
        - =let
          - =foo
            - =focus
              - Zoom
        - apple
          - =foo
        - bear
      `,
    }),
  ])

  const editableApple = (await findThoughtByText('apple'))!

  // Subthought renders the wrapper that carries the autofocus opacity around the element that Thought labels 'child'.
  // bear is fully visible until apple becomes the cursor
  expect(getClosestByLabel(await findThoughtByText('bear'), 'child')!.parentElement).toHaveStyle({ opacity: '1' })

  const user = userEvent.setup({ delay: null })
  await user.click(editableApple)

  expect(getClosestByLabel(await findThoughtByText('bear'), 'child')!.parentElement).toHaveStyle({ opacity: '0' })
  expect(getClosestByLabel(editableApple, 'child')!.parentElement).toHaveStyle({ opacity: '1' })
})
