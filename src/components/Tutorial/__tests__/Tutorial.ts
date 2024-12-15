import { getByText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { newSubthoughtActionCreator as newSubthought } from '../../../actions/newSubthought'
import { newThoughtActionCreator as newThought } from '../../../actions/newThought'
import { tutorialNextActionCreator as tutorialNext } from '../../../actions/tutorialNext'
import { tutorialStepActionCreator as tutorialStep } from '../../../actions/tutorialStep'
import { TUTORIAL2_STEP_START, TUTORIAL_STEP_SECONDTHOUGHT } from '../../../constants'
import { cleanupTestApp, createTestAppWithTutorial } from '../../../test-helpers/createTestApp'
import dispatch from '../../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../../test-helpers/setCursorFirstMatch'

async function hintShows(hint: string) {
  const user = userEvent.setup({ delay: null })
  await user.click(screen.getByText('hint'))
  await act(vi.runOnlyPendingTimersAsync)
  expect(getByText(screen.getByTestId('tutorial-step')!, hint, { exact: false })).toBeInTheDocument()
}

describe('Tutorial 1', async () => {
  beforeEach(createTestAppWithTutorial)
  afterEach(cleanupTestApp)

  it('step start - welcome text', async () => {
    const welcomeText = screen.getByText('Welcome to your personal thoughtspace.')
    await act(vi.runOnlyPendingTimersAsync)

    expect(welcomeText).toBeInTheDocument()
  })

  it('step first thought - how to create a thought ', async () => {
    await dispatch(tutorialNext({})) // we manually dispatch, because we can't do the gesture here
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('Hit the Enter key to create a new thought.')).toBeInTheDocument()
    const user = userEvent.setup({ delay: null })
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('You did it!')).toBeInTheDocument()
    user.click(screen.getByText('Next'))
  })

  describe('step second thought - create another thought', () => {
    it('reminds us how to create a thought', async () => {
      await dispatch(tutorialStep({ value: TUTORIAL_STEP_SECONDTHOUGHT }))
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText('Try adding another thought. Do you remember how to do it?')).toBeInTheDocument()
    })

    it('prompts to type some text to the created thought, then congratulates on typing', async () => {
      await dispatch(newThought({}))
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText('Now type some text for the new thought.')).toBeInTheDocument()

      const user = userEvent.setup({ delay: null })
      await user.type(document.querySelector('[contenteditable="true"]')!, 'a rather banale thing')
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText(/a rather banale thing/)).toBeInTheDocument()
      expect(screen.getByText(/Wonderful\./)).toBeInTheDocument()
    })
  })

  describe('step subthought - how to create a thought inside thought', async () => {
    beforeAll(async () => {
      await dispatch(tutorialNext({}))
      await act(vi.runOnlyPendingTimersAsync)
    })

    it('display a tutorial on subthoughts, and an rdr gesture hint', async () => {
      expect(screen.getByText(/within/)).toBeInTheDocument()
    })

    it('congratulate on creating a child for the <parent>', async () => {
      const PARENT_NAME = 'papa'
      await dispatch([
        newThought({
          value: PARENT_NAME,
        }),
      ])

      await dispatch(newSubthought())
      await act(vi.runOnlyPendingTimersAsync)

      const tutorialContainer = screen.getByTestId('tutorial-step')
      expect(getByText(tutorialContainer, PARENT_NAME, { exact: false })).toBeInTheDocument()
    })
  })

  describe('step autoexpand - show that thoughts expand and collapse on outside click', async () => {
    beforeAll(async () => {
      await dispatch([tutorialNext({})])
      await act(vi.runOnlyPendingTimersAsync)
    })

    it('display a tutorial on autoexpand', async () => {
      expect(screen.getByText(/thoughts are automatically hidden when you/, { exact: false })).toBeInTheDocument()
    })

    it('prompts for adding a subthought', async () => {
      await dispatch([
        newThought({
          value: 'uncle',
        }),
      ])

      expect(screen.getByText('Add a subthought', { exact: false })).toBeInTheDocument()
    })

    it('tells us to click away from the subthought to collapse the tree', async () => {
      await dispatch([
        newThought({
          value: 'uncle',
        }),
        newThought({
          value: 'father',
        }),
        newThought({
          value: 'child',
          insertNewSubthought: true,
        }),
      ])
      await act(vi.runOnlyPendingTimersAsync)

      const tutorialContainer = screen.getByTestId('tutorial-step')

      expect(
        screen.getByText(`Try clicking on thought "uncle"`, { exact: false, collapseWhitespace: true }),
      ).toBeInTheDocument()
      expect(screen.getByText('to hide subthought "child"', { exact: false })).toBeInTheDocument()
      const user = userEvent.setup({ delay: null })
      await user.click(screen.getByText('uncle'))
      await act(vi.runOnlyPendingTimersAsync)

      expect(getByText(tutorialContainer, `Notice that "child" is hidden now.`)).toBeInTheDocument()
      expect(
        getByText(tutorialContainer, `Click "father" to reveal its subthought "child".`, { exact: false }),
      ).toBeInTheDocument()
    })
  })

  describe('step success - ', async () => {
    beforeAll(async () => {
      await dispatch(tutorialNext({}))
      await act(vi.runOnlyPendingTimersAsync)
    })
    it('congratulate on completing first tutorial', async () => {
      expect(screen.getByText('Lovely. You have completed the tutorial', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('Play on my own')).toBeInTheDocument()
      expect(screen.getByText('Learn more')).toBeInTheDocument()

      const user = userEvent.setup({ delay: null })
      user.click(screen.getByText('Learn more'))
      // await act(vi.runOnlyPendingTimersAsync)
    })
  })
})

describe('Tutorial 2', async () => {
  beforeEach(createTestAppWithTutorial)
  afterEach(cleanupTestApp)

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

    // expect(screen.getByText('Project 2')).toBeInTheDocument()
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
    await hintShows('Select "Home."')
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

    // ** test adding a grandchild of Work, which I'm struggling with
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


