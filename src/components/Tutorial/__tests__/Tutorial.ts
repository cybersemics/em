import { getByText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { HOME_TOKEN } from '../../../constants'
import exportContext from '../../../selectors/exportContext'
import store from '../../../stores/app'
import createTestApp, { cleanupTestApp, cleanupTestEventHandlers } from '../../../test-helpers/createTestApp'

// as per https://testing-library.com/docs/user-event/options/#advancetimers
// we should avoid using { delay: null }, and use jest.advanceTimersByTime instead
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

/** Get last created thought in the document, used mostly after `user.keyboard('{Enter}')`. */
const lastThought = () => Array.from(document.querySelectorAll('[contenteditable="true"]')).at(-1)!

describe('Tutorial 1', async () => {
  beforeEach(() => createTestApp({ tutorial: true }))
  afterEach(cleanupTestEventHandlers)
  afterAll(cleanupTestApp)
  describe('step start', () => {
    it('shows the welcome text', () => {
      expect(screen.getByText('Welcome to your personal thoughtspace.')).toBeInTheDocument()
    })

    it('shows the "Next" button, that leads to the first step', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/First, let me show you how to create a new thought/)).toBeInTheDocument()
    })
  })

  it('step first thought - how to create a thought ', async () => {
    expect(screen.getByText('Hit the Enter key to create a new thought.')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(screen.getByText('You did it!')).toBeInTheDocument()

    expect(screen.getByText('Now type something. Anything will do.')).toBeInTheDocument()
    await user.type(lastThought(), 'my first thought')
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
  })

  it('step second thought - prompts to add another thought', async () => {
    expect(screen.getByText('Well done!')).toBeInTheDocument()
    expect(screen.getByText(/Try adding another thought/)).toBeInTheDocument()
    await user.type(lastThought(), 'my second thought')
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('Good work!')).toBeInTheDocument()
    expect(screen.getByText('Now type some text for the new thought.')).toBeInTheDocument()
    await user.type(lastThought(), 'third thought')
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)
  })

  it('step subthought - how to create a thought inside thought', async () => {
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(
      `- __ROOT__
  - my first thought
  - my second thought
  - third thought
  - `,
    )

    // Now I am going to show you how to add a thought within another thought.
    expect(screen.getByText(/Now I am going to show you how to add a thought/)).toBeInTheDocument()

    // since we have cursor on empty thought
    expect(screen.getByText(/Hit the Delete key to delete the current blank thought/)).toBeInTheDocument()
    expect(screen.getByText(/Then hold the Ctrl key and hit the Enter key/)).toBeInTheDocument()
    await user.keyboard('{Backspace}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await act(vi.runOnlyPendingTimersAsync)

    await user.type(lastThought(), 'child')
    await act(vi.runOnlyPendingTimersAsync)
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(
      `- __ROOT__
  - my first thought
  - my second thought
  - third thought
    - child`,
    )
    // as you can see, the new thought "child" is nested within "third thought"
    expect(screen.getByText(/As you can see, the new thought "child" is nested/)).toBeInTheDocument()
    expect(getByText(screen.getByTestId('tutorial-step'), /"third thought"/)).toBeInTheDocument()

    await user.click(screen.getByText('Next'))
  })

  describe('step autoexpand', async () => {
    it('thoughts are automatically hidden when you click away', async () => {
      expect(screen.getByText(/thoughts are automatically hidden when you click away/)).toBeInTheDocument()
    })

    it('click on "uncle" thought to hide child', async () => {
      await user.click(screen.getByText('my second thought'))
      expect(screen.getByText('Notice that "child" is hidden now.', { exact: false })).toBeInTheDocument()
    })

    it('click back on a "parent" thought to reveal child', async () => {
      expect(screen.getByText(/Click "third thought" to reveal its subthought "child"/)).toBeInTheDocument()
      await user.click(screen.getAllByText('third thought').at(-1)!)
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
  })
})

describe('Tutorial 2', async () => {
  beforeEach(() => createTestApp({ tutorial: true }))
  afterEach(cleanupTestEventHandlers)
  afterAll(cleanupTestApp)
  it('step start - tell about context menu', async () => {
    await user.click(screen.getByText('Learn more'))

    expect(screen.getByText(`If the same thought appears in more than one place`, { exact: false })).toBeInTheDocument()
    expect(
      screen.getByText(`shows a small number to the right of the thought, for example`, { exact: false }),
    ).toBeInTheDocument()
  })

  it('step choose - gives 3 choices of what project to proceed with', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/For this tutorial, choose what kind of content you want to create/)).toBeInTheDocument()
    expect(screen.getByText('To-Do List')).toBeInTheDocument()
    expect(screen.getByText('Journal Theme')).toBeInTheDocument()
    expect(screen.getByText('Book/Podcast Notes')).toBeInTheDocument()
  })

  it('step context 1 parent - we create "Home" thought with children', async () => {
    await user.click(screen.getAllByText('To-Do List').at(-1)!)
    expect(screen.getByText(/Excellent choice. Now create a new thought with the text “Home”/)).toBeInTheDocument()

    // we create a `Home` thought
    await user.keyboard('{Enter}')
    await user.type(lastThought(), 'Home')
    await act(vi.runOnlyPendingTimersAsync)

    // Home -> To Do
    expect(screen.getByText(/Let's say that you want to make a list of things/)).toBeInTheDocument()
    expect(screen.getByText(/Add a thought with the text "To Do"/)).toBeInTheDocument()
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(lastThought(), 'To Do')
    await act(vi.runOnlyPendingTimersAsync)

    // Home -> To Do -> or to not
    expect(screen.getByText(/Now add a thought to “To Do”/)).toBeInTheDocument()
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(lastThought(), 'or to not')
    await act(vi.runOnlyPendingTimersAsync)

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(
      `- __ROOT__
  - Home
    - To Do
      - or to not`,
    )
    expect(screen.getByText(/Nice work!/)).toBeInTheDocument()
  })

  it('step context 2 - we create "Work" thought with children', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Now we are going to create a different "To Do" list./)).toBeInTheDocument()

    // we created a new thought on 3rd level, so we shift-tab our way back to root
    await user.keyboard('{Enter}')
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    await user.type(lastThought(), 'Work')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('Now add a thought with the text "To Do"', { exact: false })).toBeInTheDocument()
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(lastThought(), 'To Do')

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(
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

  it('step context view open - we press Alt+Shift+S and see "To Do" in both "Home" and "Work"', async () => {
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(
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
    await user.keyboard('{Escape}') // focus out
    await user.click(screen.getAllByText('To Do').at(-1)!) // and click on To Do
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

  it('step context examples - we see real-world examples', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Here are some real-world examples of using contexts in/)).toBeInTheDocument()
    expect(screen.getByText('View all thoughts related to a particular person, place, or thing.')).toBeInTheDocument()
    expect(screen.getByText('Keep track of quotations from different sources.')).toBeInTheDocument()
  })

  it('step success - congratulations, hide tutorial after clicking "Finish"', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Congratulations! You have completed Part II of the tutorial./)).toBeInTheDocument()

    user.click(screen.getByText('Finish'))
    await act(vi.runOnlyPendingTimersAsync)

    expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
  })
})
