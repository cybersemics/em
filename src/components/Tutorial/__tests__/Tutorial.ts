import { getByText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../../actions/newThought'
import {
  HOME_TOKEN,
  TUTORIAL2_STEP_CHOOSE,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
} from '../../../constants'
import exportContext from '../../../selectors/exportContext'
import store from '../../../stores/app'
import createTestApp, { cleanupTestApp, createTestAppWithTutorial } from '../../../test-helpers/createTestApp'
import dispatch from '../../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../../test-helpers/setCursorFirstMatch'

// as per https://testing-library.com/docs/user-event/options/#advancetimers
// we should avoid using { delay: null }, and use jest.advanceTimersByTime instead
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

describe.skip('Tutorial test keyboard events', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)
  it('2 enters', async () => {
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
  })

  it('another 2 enters', async () => {
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
  })

  it('final 2 enters', async () => {
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    console.log(exported)
  })

  afterAll(() => {
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    console.log(exported)
  })
})

describe('Tutorial 1', async () => {
  beforeEach(createTestAppWithTutorial)
  afterAll(cleanupTestApp)
  describe('step start', () => {
    it('shows the welcome text', () => {
      expect(screen.getByText('Welcome to your personal thoughtspace.')).toBeInTheDocument()
    })

    it('shows the "Next" button, that leads to the first step', async () => {
      await user.click(screen.getByText('Next'))
      expect(
        screen.getByText('First, let me show you how to create a new thought', { exact: false }),
      ).toBeInTheDocument()
    })
  })

  it('step first thought - how to create a thought ', async () => {
    expect(screen.getByText('Hit the Enter key to create a new thought.')).toBeInTheDocument()

    await act(() => user.keyboard('{Enter}'))
    expect(screen.getByText('You did it!')).toBeInTheDocument()
    expect(screen.getByText('Now type something. Anything will do.')).toBeInTheDocument()

    await dispatch(newThought({ value: 'my first thought' }))
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText('Click the Next button when you are ready to continue.')).toBeInTheDocument()
    expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_FIRSTTHOUGHT_ENTER)
  })

  it('step second thought - prompts to add another thought', async () => {
    await dispatch(newThought({ value: 'a thought' }))
    await act(vi.runOnlyPendingTimersAsync)
    expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_SECONDTHOUGHT)

    expect(screen.getByText('Try adding another thought. Do you remember how to do it?')).toBeInTheDocument()
    await dispatch(newThought({ value: 'a new thought' }))
    await act(vi.runOnlyPendingTimersAsync)
    expect(screen.getByText('Good work!')).toBeInTheDocument()
  })

  it('step subthought - how to create a thought inside thought', async () => {
    await user.click(screen.getByText('Next'))
    expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_SUBTHOUGHT)
    await dispatch([
      newThought({ value: 'uncle' }),
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

  describe('step autoexpand - shows that thoughts expand and collapse on outside click', async () => {
    it('tells us about thoughts being hidden when clicked away', async () => {
      await user.click(screen.getByText('Next'))

      expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_AUTOEXPAND)
      expect(
        screen.getByText('thoughts are automatically hidden when you click away', { exact: false }),
      ).toBeInTheDocument()
    })

    it('tells us to click on uncle to hide the child', async () => {
      await dispatch([
        importText({
          text: `
      - parent
        - child
      - uncle
      `,
        }),
      ])
      await act(() => user.click(screen.getByText('uncle')))
      expect(screen.getByText('Notice that "child" is hidden now.', { exact: false })).toBeInTheDocument()
    })

    it('tells us to click on the parent to reveal the child', async () => {
      await act(() => user.click(Array.from(screen.getAllByText('parent')).at(-1)!))
      expect(screen.getByText('Lovely. You have completed the tutorial', { exact: false })).toBeInTheDocument()
    })
  })

  describe('step success - congratulates on completing first tutorial', async () => {
    it('congratulate on completing first tutorial', async () => {
      expect(screen.getByText('Lovely. You have completed the tutorial', { exact: false })).toBeInTheDocument()
    })

    it('asks to continue with tutorial or play on own', async () => {
      expect(screen.getByText('Play on my own')).toBeInTheDocument()
      expect(screen.getByText('Learn more')).toBeInTheDocument()
    })

    it.skip('hides tutorial after clicking "Play on my own"', async () => {
      await user.click(screen.getByText('Play on my own'))
      expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
    })
  })
})

describe('Tutorial 2', async () => {
  describe('step start - tell about context menu', async () => {
    it('tell about context menu', async () => {
      await cleanupTestApp()
      await createTestAppWithTutorial()
      expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_SUCCESS)

      await user.click(screen.getByText('Learn more'))

      expect(
        screen.getByText(`If the same thought appears in more than one place`, { exact: false }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(`shows a small number to the right of the thought, for example`, { exact: false }),
      ).toBeInTheDocument()
    })
  })

  describe('step choose', async () => {
    beforeEach(createTestAppWithTutorial)
    it('gives 3 choices of what project to proceed with', async () => {
      await user.click(screen.getByText('Next'))
      expect(
        screen.getByText('For this tutorial, choose what kind of content you want to create', { exact: false }),
      ).toBeInTheDocument()
      expect(screen.getByText('To-Do List')).toBeInTheDocument()
      expect(screen.getByText('Journal Theme')).toBeInTheDocument()
      expect(screen.getByText('Book/Podcast Notes')).toBeInTheDocument()
    })
  })

  describe('step context 1 parent, prompt for creating a first todo', async () => {
    beforeEach(createTestAppWithTutorial)

    it('step context 1 parent, prompt for creating a first todo', async () => {
      console.log(store.getState().storageCache?.tutorialStep)
      expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL2_STEP_CHOOSE)
      await user.click(screen.getAllByText('To-Do List').at(-1)!)
      await act(vi.runOnlyPendingTimersAsync)

      expect(
        screen.getByText('Excellent choice. Now create a new thought with the text “Home”', { exact: false }),
      ).toBeInTheDocument()
      await act(vi.runOnlyPendingTimersAsync)

      await user.keyboard('{Enter}')
      await user.type(document.querySelector('[contenteditable="true"]') as HTMLElement, 'Home', {
        skipAutoClose: true,
      })
      // await user.keyboard('{Enter}')
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText(/Let's say that you want to make a list of things/)).toBeInTheDocument()
      expect(screen.getByText(/Add a thought with the text "To Do"/)).toBeInTheDocument()

      await act(vi.runOnlyPendingTimersAsync)
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(document.querySelectorAll('[contenteditable="true"]')[1], 'To Do')
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText(/Now add a thought to “To Do”/)).toBeInTheDocument()

      await user.keyboard('{Control>}{Enter}{/Control}')
      await act(vi.runOnlyPendingTimersAsync)
      await user.type(lastThought(), 'or to not')
      await act(vi.runOnlyPendingTimersAsync)

      expect(showAllThoughts()).toBe(
        `- __ROOT__
  - Home
    - To Do
      - or to not`,
      )
      expect(screen.getByText(/Nice work!/)).toBeInTheDocument()
    })
  })

  describe('step context 2', async () => {
    beforeEach(createTestAppWithTutorial)

    it('prompt for creating a second todo, shows a superscript', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/Now we are going to create a different "To Do" list./)).toBeInTheDocument()

      await user.keyboard('{Enter}')
      await user.keyboard('{Shift>}{Tab}{/Shift}') // we are at
      await user.keyboard('{Shift>}{Tab}{/Shift}')

      await act(vi.runOnlyPendingTimersAsync)

      await user.type(lastThought(), 'Work')
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText('Now add a thought with the text "To Do"', { exact: false })).toBeInTheDocument()

      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastThought(), 'To Do')

      expect(showAllThoughts()).toBe(
        `- __ROOT__
  - Home
    - To Do
      - or to not
  - Work
    - To Do`,
      )
      expect(screen.getByText('Very good!')).toBeInTheDocument()

      expect(screen.getAllByRole('superscript')[0]).toHaveTextContent('2')
      expect(screen.getByText('This means that “To Do” appears in two places', { exact: false })).toBeInTheDocument()

      expect(screen.getByText('Imagine a new work task. Add it to this “To Do” list.'))
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastThought(), 'new work task')
    })
  })

  describe('multiple contexts', () => {
    beforeEach(createTestAppWithTutorial)
    it('step context view open - showcase multiple contexts', async () => {
      expect(showAllThoughts()).toBe(
        `- __ROOT__
  - Home
    - To Do
      - or to not
  - Work
    - To Do
      - new work task`,
      )
      await user.click(screen.getByText('Next'))
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText(/First select "To Do"./)).toBeInTheDocument()

      console.log(screen.getAllByText('To Do').at(-1)!)
      await user.keyboard('{Escape}') // focus out
      await user.click(screen.getAllByText('To Do').at(-1)!) // and click on To Do

      await act(vi.runOnlyPendingTimersAsync)

      // await user.click(screen.getAllByText('To Do').at(-1)!) // focus on
      await act(vi.runOnlyPendingTimersAsync)

      // await dispatch(setCursorFirstMatch(['Work', 'To Do']))
      showAllThoughts()

      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText("Hit Alt + Shift + S to view the current thought's contexts.")).toBeInTheDocument()

      await user.keyboard('{Alt>}{Shift>}S{/Shift}{/Alt}')
      await act(vi.runOnlyPendingTimersAsync)

      expect(
        screen.getByText(
          `Well, look at that. We now see all of the contexts in which "To Do" appears, namely "Home" and "Work".`,
        ),
      ).toBeInTheDocument()
    })
  })

  describe('step context examples - show real world examples', async () => {
    beforeEach(createTestAppWithTutorial)

    it('show real world examples', async () => {
      await user.click(screen.getByText('Next'))
      expect(
        screen.getByText('Here are some real-world examples of using contexts in', { exact: false }),
      ).toBeInTheDocument()
      expect(screen.getByText('View all thoughts related to a particular person, place, or thing.')).toBeInTheDocument()
      expect(screen.getByText('Keep track of quotations from different sources.')).toBeInTheDocument()
      expect(
        screen.getByText('Create a link on the home screen to a deeply nested subthought for easy access.'),
      ).toBeInTheDocument()
    })
  })

  describe('step success', async () => {
    beforeEach(createTestAppWithTutorial)

    it('congratulates on finishing tutorial, hides it after "Finish"', async () => {
      await user.click(screen.getByText('Next'))
      expect(
        screen.getByText('Congratulations! You have completed Part II of the tutorial.', { exact: false }),
      ).toBeInTheDocument()

      user.click(screen.getByText('Finish'))
      await act(vi.runOnlyPendingTimersAsync)

      expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
    })
  })
})

function showAllThoughts(
  logPostfix: string = '', // to differentiate between different tests
) {
  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  console.log(`${exported} ${logPostfix}`)

  return exported
}

function lastThought() {
  return Array.from(document.querySelectorAll('[contenteditable="true"]')).at(-1)!
}
