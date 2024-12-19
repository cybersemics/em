import { getByText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { newSubthoughtActionCreator as newSubthought } from '../../../actions/newSubthought'
import { newThoughtActionCreator as newThought } from '../../../actions/newThought'
import { tutorialNextActionCreator as tutorialNext } from '../../../actions/tutorialNext'
import { tutorialStepActionCreator as tutorialStep } from '../../../actions/tutorialStep'
import {
  TUTORIAL2_STEP_START,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
} from '../../../constants'
import { cleanupTestApp, createTestAppWithTutorial } from '../../../test-helpers/createTestApp'
import dispatch from '../../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../../test-helpers/setCursorFirstMatch'

beforeEach(createTestAppWithTutorial)
afterEach(cleanupTestApp)

describe('Tutorial 1', async () => {
  describe('step start', () => {
    it('shows the welcome text', () => {
      expect(screen.getByText('Welcome to your personal thoughtspace.')).toBeInTheDocument()
    })

    it('shows the "Next" button, that leads to the first step', async () => {
      const user = userEvent.setup({ delay: null })
      await user.click(screen.getByText('Next'))
      await act(vi.runOnlyPendingTimersAsync)
      expect(
        screen.getByText('First, let me show you how to create a new thought', { exact: false }),
      ).toBeInTheDocument()
    })
  })

  it('step first thought - how to create a thought ', async () => {
    expect(screen.getByText('Hit the Enter key to create a new thought.')).toBeInTheDocument()

    const user = userEvent.setup({ delay: null })
    await act(() => user.keyboard('{Enter}'))
    expect(screen.getByText('You did it!')).toBeInTheDocument()
    expect(screen.getByText('Now type something. Anything will do.')).toBeInTheDocument()

    await dispatch(newThought({ value: 'my first thought' }))
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText('Click the Next button when you are ready to continue.')).toBeInTheDocument()
  })

  describe('step second thought - create another thought', () => {
    it('prompts to type some text to the created thought, then congratulates on typing', async () => {
      await dispatch([
        newThought({ value: 'already created thought' }),
        tutorialStep({ value: TUTORIAL_STEP_SECONDTHOUGHT }),
      ])
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText('Try adding another thought. Do you remember how to do it?')).toBeInTheDocument()

      await dispatch(newThought({ value: 'another thought' }))
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText('Good work!')).toBeInTheDocument()
    })
  })

  it('step subthought - how to create a thought inside thought', async () => {
    await dispatch([
      tutorialStep({ value: TUTORIAL_STEP_SUBTHOUGHT }),
      newThought({
        value: 'parent',
      }),
      newThought({
        value: 'child',
        insertNewSubthought: true,
      }),
    ])
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText(`As you can see, the new thought "child" is nested`, { exact: false })).toBeInTheDocument()
    expect(getByText(screen.getByTestId('tutorial-step'), 'parent', { exact: false })).toBeInTheDocument()
  })

  describe('step autoexpand - show that thoughts expand and collapse on outside click', async () => {
    beforeAll(() => dispatch(tutorialStep({ value: TUTORIAL_STEP_AUTOEXPAND })))
    it('tells us about thoughts being hidden when clicked away', async () => {
      expect(
        screen.getByText('thoughts are automatically hidden when you click away', { exact: false }),
      ).toBeInTheDocument()
    })

    it('asks for a nested structure, then shows how child is hidden when clicked away', async () => {
      expect(
        screen.getByText('Oops! There are no thoughts in your thoughtspace.', { exact: false }),
      ).toBeInTheDocument()

      await dispatch(
        importText({
          text: `
        - uncle
        - parent`,
        }),
      )
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText("Add a subthought and I'll show you.", { exact: false })).toBeInTheDocument()

      await dispatch(newThought({ value: 'child', insertNewSubthought: true }))
      await act(vi.runOnlyPendingTimersAsync)
      expect(
        screen.getByText(`Try clicking on thought "uncle" to hide subthought "child".`, { exact: false }),
      ).toBeInTheDocument()

      await dispatch(setCursorFirstMatch(['uncle']))
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText('Notice that "child" is hidden now.')).toBeInTheDocument()
    })

    it('tells us to click away from the subthought to collapse the tree', async () => {
      await dispatch([
        importText({
          text: `
      - parent
        - child
      - uncle
      `,
        }),
        setCursorFirstMatch(['uncle']),
        tutorialStep({ value: TUTORIAL_STEP_AUTOEXPAND_EXPAND }),
      ])
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText('Click "parent" to reveal its subthought "child".', { exact: false })).toBeInTheDocument()

      await dispatch(setCursorFirstMatch(['parent']))
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText('Lovely. You have completed the tutorial', { exact: false })).toBeInTheDocument()
    })
  })

  describe('step success - congratulates on completing first tutorial', async () => {
    beforeAll(() => dispatch(tutorialStep({ value: TUTORIAL_STEP_SUCCESS })))
    it('congratulate on completing first tutorial', async () => {
      expect(screen.getByText('Lovely. You have completed the tutorial', { exact: false })).toBeInTheDocument()
    })

    it('asks to continue with tutorial or play on own', async () => {
      expect(screen.getByText('Play on my own')).toBeInTheDocument()
      expect(screen.getByText('Learn more')).toBeInTheDocument()
    })

    it('hides tutorial after clicking "Play on my own"', async () => {
      userEvent.click(screen.getByText('Play on my own'))
      await act(vi.runOnlyPendingTimersAsync)
      expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
    })
  })
})

describe('Tutorial 2', async () => {
  it('step start - tell about context menu', async () => {
    await dispatch(tutorialStep({ value: TUTORIAL2_STEP_START }))
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText('If the same thought appears in more than one place', { exact: false })).toBeInTheDocument()
  })

  it('step choose - gives 3 choices of what project to proceed with', async () => {
    await dispatch(tutorialNext({}))
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText('For this tutorial, choose what kind of content you want to create', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.getByText('To-Do List')).toBeInTheDocument()
    expect(screen.getByText('Journal Theme')).toBeInTheDocument()
    expect(screen.getByText('Book/Podcast Notes')).toBeInTheDocument()
  })

  it('step context 1 parent, prompt for creating a first todo', async () => {
    await dispatch(tutorialNext({}))
    await act(vi.runOnlyPendingTimersAsync)

    const user = userEvent.setup({ delay: null })
    expect(
      screen.getByText('Excellent choice. Now create a new thought with the text “Home”', { exact: false }),
    ).toBeInTheDocument()

    await dispatch(newThought({}))
    await act(vi.runOnlyPendingTimersAsync)

    user.type(document.querySelector('[contenteditable="true"]')!, 'Home')
    user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText(`Let's say that you want to make a list of things`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(`Add a thought with the text "To Do"`, { exact: false })).toBeInTheDocument()

    await dispatch([setCursorFirstMatch(['Home']), newSubthought()])
    await act(vi.runOnlyPendingTimersAsync)
    user.type(document.querySelectorAll('[contenteditable="true"]')[1]!, 'To Do')
    user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText(`Now add a thought to “To Do”`, { exact: false })).toBeInTheDocument()

    await dispatch([setCursorFirstMatch(['Home', 'To Do']), newSubthought()])
    await act(vi.runOnlyPendingTimersAsync)

    user.type(document.querySelectorAll('[contenteditable="true"]')[2]!, 'Hey')
    user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText(`Nice work!`, { exact: false })).toBeInTheDocument()
  })

  it('step context 2 - prompt for creating a second todo, shows a superscript', async () => {
    await dispatch([
      tutorialNext({}),
      importText({
        text: `
      - Home
        - To Do
          - Hey
    `,
      }),
      setCursorFirstMatch(['Home', 'To Do', 'Hey']),
    ])
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText(`Now we are going to create a different "To Do" list.`, { exact: false }),
    ).toBeInTheDocument()

    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByText('hint'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(getByText(screen.getByTestId('tutorial-step')!, 'Select "Home."', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByText('Home'))
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText(`Hit the Enter key to create a new thought`, { exact: false })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)

    const lastThought = Array.from(document.querySelectorAll('[contenteditable="true"]')).at(-1)
    await user.type(lastThought!, 'Work')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Now add a thought with the text "To Do"', { exact: false })).toBeInTheDocument()
    await dispatch(setCursorFirstMatch(['Work']))
    await act(vi.runOnlyPendingTimersAsync)

    await user.keyboard('{Ctrl}{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
    await user.type(Array.from(document.querySelectorAll('[contenteditable="true"]')).at(-1)!, 'To Do')
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText('Very good!')).toBeInTheDocument()
    expect(screen.getAllByRole('superscript')[0]).toHaveTextContent('2')
    expect(screen.getByText('This means that “To Do” appears in two places', { exact: false })).toBeInTheDocument()
  })

  it('step context view open - showcase multiple contexts', async () => {
    await dispatch([tutorialNext({})])
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText("Now I'm going to show you the keyboard shortcut to view multiple contexts."),
    ).toBeInTheDocument()
    expect(screen.getByText('First select "to do".', { exact: false })).toBeInTheDocument()
    await dispatch([
      tutorialNext({}),
      importText({
        text: `
      - Home
        - To Do
          - Hey
      - Work
        - To Do
          - New task
    `,
      }),
      setCursorFirstMatch(['Home', 'To Do']),
    ])
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText("Hit Alt + Shift + S to view the current thought's contexts.")).toBeInTheDocument()

    const user = userEvent.setup({ delay: null })
    await user.keyboard('{Alt>}{Shift>}S{/Shift}{/Alt}')
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText(
        `Well, look at that. We now see all of the contexts in which "To Do" appears, namely "Home" and "Work".`,
      ),
    ).toBeInTheDocument()
  })

  it('step context examples - show real world examples', async () => {
    await dispatch(tutorialNext({}))
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText('Here are some real-world examples of using contexts in', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.getByText('View all thoughts related to a particular person, place, or thing.')).toBeInTheDocument()
    expect(screen.getByText('Keep track of quotations from different sources.')).toBeInTheDocument()
    expect(
      screen.getByText('Create a link on the home screen to a deeply nested subthought for easy access.'),
    ).toBeInTheDocument()
  })

  it('congratulates on finishing tutorial, hides it after "Finish"', async () => {
    await dispatch(tutorialNext({}))
    await act(vi.runOnlyPendingTimersAsync)
    expect(
      screen.getByText('Congratulations! You have completed Part II of the tutorial.', { exact: false }),
    ).toBeInTheDocument()

    const user = userEvent.setup({ delay: null })
    user.click(screen.getByText('Finish'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
  })
})
