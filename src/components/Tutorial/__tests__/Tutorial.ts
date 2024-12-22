import { fireEvent, getByText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../../actions/newThought'
import {
  HOME_TOKEN,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
} from '../../../constants'
import exportContext from '../../../selectors/exportContext'
import store from '../../../stores/app'
import {
  cleanupTestApp,
  default as createTestApp,
  createTestAppWithTutorial,
} from '../../../test-helpers/createTestApp'
import dispatch from '../../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../../test-helpers/setCursorFirstMatch'

// as per https://testing-library.com/docs/user-event/options/#advancetimers
// we should avoid using { delay: null }, and use jest.advanceTimersByTime instead
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

describe.only('A curious case of me not being able to grasp keyboard', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('creates a thought with two empty thoughts below it', async () => {
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[0], 'Socrates')
    expect(screen.getByText('Socrates')).toBeInTheDocument()
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // eslint-disable-next-line no-console
    console.debug('gotta be one thought', exported)

    expect(exported).toBe(`- ${HOME_TOKEN}
    - Socrates`)
  })
  it('creates a thought with six empty thoughts below it, if you press enter', async () => {
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[0], 'Socrates')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Socrates')).toBeInTheDocument()
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // eslint-disable-next-line no-console
    console.debug('after pressing enter', exported)
    expect(exported).toBe(`- ${HOME_TOKEN}
    - Socrates`)
  })

  it('creating two thoughts produces something strange', async () => {
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[0], 'Socrates')
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[1], 'Plato')
    await user.keyboard('{Enter}')

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // eslint-disable-next-line no-console
    console.debug('two thoughts', exported)
  })

  it('nested thoughts are broken', async () => {
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[0], 'Socrates')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    // await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[1], 'Plato')
    await user.keyboard('{Enter}')

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // eslint-disable-next-line no-console
    console.debug('subthoughts', exported)
  })

  it('nested thoughts are broken', async () => {
    await user.keyboard('{Enter}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[0], 'Socrates')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    // await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[1], 'Plato')
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    await user.type(document.querySelectorAll('[contenteditable="true"]')[2], 'Aristole')
    await user.keyboard('{Enter}')

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // eslint-disable-next-line no-console
    console.debug('subthoughts', exported)
  })
})

beforeEach(createTestAppWithTutorial)
afterAll(cleanupTestApp)
describe('Tutorial 1', async () => {
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

  afterAll(cleanupTestApp)
})

describe('Tutorial 2', async () => {
  it('step start - tell about context menu', async () => {
    expect(store.getState().storageCache?.tutorialStep).toBe(TUTORIAL_STEP_SUCCESS)

    await user.click(screen.getByText('Learn more'))

    expect(screen.getByText(`If the same thought appears in more than one place`, { exact: false })).toBeInTheDocument()
    expect(
      screen.getByText(`shows a small number to the right of the thought, for example`, { exact: false }),
    ).toBeInTheDocument()
  })

  it('step choose - gives 3 choices of what project to proceed with', async () => {
    await user.click(screen.getByText('Next'))
    expect(
      screen.getByText('For this tutorial, choose what kind of content you want to create', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.getByText('To-Do List')).toBeInTheDocument()
    expect(screen.getByText('Journal Theme')).toBeInTheDocument()
    expect(screen.getByText('Book/Podcast Notes')).toBeInTheDocument()
    // await cleanupTestApp()
  })

  it('step context 1 parent, prompt for creating a first todo', async () => {
    // await createTestAppWithTutorial()
    await user.click(screen.getByText('To-Do List'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(
      screen.getByText('Excellent choice. Now create a new thought with the text “Home”', { exact: false }),
    ).toBeInTheDocument()
    await act(vi.runOnlyPendingTimersAsync)

    await user.keyboard('{Enter}')
    await user.type(document.querySelector('[contenteditable="true"]')!, 'Home')
    // await user.keyboard('[Enter]')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText(`Let's say that you want to make a list of things`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(`Add a thought with the text "To Do"`, { exact: false })).toBeInTheDocument()

    await dispatch([setCursorFirstMatch(['Home'])])
    await act(vi.runOnlyPendingTimersAsync)
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await user.type(document.querySelectorAll('[contenteditable="true"]')[1], 'To Do')

    await user.keyboard('{Enter}')
    expect(screen.getByText(`Now add a thought to “To Do”`, { exact: false })).toBeInTheDocument()
    screen.getByText('To Do').focus()
    fireEvent.keyUp(screen.getByText('To Do'), {
      key: 'Enter',
      ctrlKey: true,
      keyCode: 13,
    })
    // await act(vi.runOnlyPendingTimersAsync)
    await user.type(document.querySelectorAll('[contenteditable="true"]')[2], 'Hey')
    await user.keyboard('{Enter}')

    expect(screen.getByText(`Nice work!`, { exact: false })).toBeInTheDocument()
  })

  it('step context 2 - prompt for creating a second todo, shows a superscript', async () => {
    await user.click(screen.getByText('Next'))
    await dispatch([
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

    await user.keyboard('{Control}{Enter}')
    await user.type(Array.from(document.querySelectorAll('[contenteditable="true"]')).at(-1)!, 'To Do')
    expect(screen.getByText('Very good!')).toBeInTheDocument()
    expect(screen.getAllByRole('superscript')[0]).toHaveTextContent('2')
    expect(screen.getByText('This means that “To Do” appears in two places', { exact: false })).toBeInTheDocument()

    await user.keyboard('{Control}{Enter}')
  })

  it('step context view open - showcase multiple contexts', async () => {
    await user.click(screen.getByText('Next'))
    await dispatch([setCursorFirstMatch(['To Do'])])
    await act(vi.runOnlyPendingTimersAsync)

    // await dispatch(setCursorFirstMatch(['Work', 'To Do']))
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

  it('step context examples - show real world examples', async () => {
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
