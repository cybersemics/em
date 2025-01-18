import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import createTestApp, { cleanupTestApp, cleanupTestEventHandlers } from '../../../test-helpers/createTestApp'

// as per https://testing-library.com/docs/user-event/options/#advancetimers
// we should avoid using { delay: null }, and use jest.advanceTimersByTime instead
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

/** Gets the last empty thought in the document. Mostly used after `user.keyboard('{Enter}')` to get the new thought. */
const lastEmptyThought = () =>
  Array.from(document.querySelectorAll('[data-editable="true"]'))
    .filter(it => !it.textContent)
    .at(-1)!

describe('Tutorial 1', async () => {
  beforeEach(() => createTestApp({ tutorial: true }))
  afterEach(cleanupTestEventHandlers)
  afterAll(cleanupTestApp)
  describe('step start', () => {
    it('we see the welcome text', () => {
      expect(screen.getByText('Welcome to your personal thoughtspace.')).toBeInTheDocument()
    })

    it('we can proceed to first step by clicking Next', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText('Hit the Enter key to create a new thought.')).toBeInTheDocument()
    })
  })

  describe('step first thought', () => {
    it('we learn how to create a thought', async () => {
      await user.keyboard('{Enter}')
      expect(screen.getByText('Now type something. Anything will do.')).toBeInTheDocument()
    })

    it('we create our first thought', async () => {
      await user.type(lastEmptyThought(), 'first')
      await user.keyboard('{Enter}')
      await act(vi.runOnlyPendingTimersAsync)

      expect(screen.getByText('Well done!')).toBeInTheDocument()
    })
  })

  it('we create a second thought', async () => {
    expect(screen.getByText(/Try adding another thought/)).toBeInTheDocument()
    await user.type(lastEmptyThought(), 'second')
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText('Now type some text for the new thought.')).toBeInTheDocument()
  })

  it('we create a third thought', async () => {
    await user.type(lastEmptyThought(), 'third')
    await user.keyboard('{Enter}')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText(/Hit the Delete key to delete the current blank thought/)).toBeInTheDocument()
  })

  it('we learn to create nested thoughts', async () => {
    /* thoughts:
  - first
  - second
  - third
  -
    */
    await user.keyboard('{Backspace}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await act(vi.runOnlyPendingTimersAsync)

    await user.type(lastEmptyThought(), 'child of third')
    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByText(/As you can see, the new thought "child of third" is nested/)).toBeInTheDocument()
  })

  describe('step autoexpand', async () => {
    it('we learn about automatic thought hiding', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/thoughts are automatically hidden when you click away/)).toBeInTheDocument()
    })

    it('we hide nested thoughts by clicking away', async () => {
      /* thoughts:
      - first
      - second
      - third
        - child of third
      */
      await user.click(screen.getByText('second'))
      expect(screen.getByText(/Notice that "child of third" is hidden now/)).toBeInTheDocument()
    })

    it('we reveal hidden thoughts by clicking parent', async () => {
      await user.click(screen.getAllByText('third').at(-1)!)
      expect(screen.getByText('child of third')).toBeInTheDocument()
    })
  })

  describe('step success', async () => {
    it('we complete the first tutorial', async () => {
      expect(screen.getByText(/Lovely\. You have completed the tutorial/)).toBeInTheDocument()
    })

    it('we can exit tutorial mode', async () => {
      await user.click(screen.getByText('Play on my own'))
      await act(vi.runOnlyPendingTimersAsync)
      expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
    })

    it('we can continue to advanced tutorial', async () => {
      expect(screen.getByText('Learn more')).toBeInTheDocument()
    })
  })
})

describe('Tutorial 2', async () => {
  beforeEach(() => createTestApp({ tutorial: true }))
  afterEach(cleanupTestEventHandlers)
  afterAll(cleanupTestApp)
  it('we learn about context indicators', async () => {
    await user.click(screen.getByText('Learn more'))

    expect(screen.getByText(/shows a small number to the right of the thought, for example/)).toBeInTheDocument()
  })

  it('we choose a project type, one of three options', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/For this tutorial, choose what kind of content you want to create/)).toBeInTheDocument()
    expect(screen.getByText('To-Do List')).toBeInTheDocument()
    expect(screen.getByText('Journal Theme')).toBeInTheDocument()
    expect(screen.getByText('Book/Podcast Notes')).toBeInTheDocument()
  })

  it('we start creating a to-do list', async () => {
    await user.click(screen.getAllByText('To-Do List').at(-1)!)
    expect(screen.getByText(/Excellent choice\. Now create a new thought with the text “Home”/)).toBeInTheDocument()
  })

  describe('step context 1 - create a "Home" to-do list', () => {
    it('we create a Home thought', async () => {
      await user.keyboard('{Enter}')
      await user.type(lastEmptyThought(), 'Home')
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText(/Add a thought with the text "To Do"/)).toBeInTheDocument()
    })

    it('we add a Home->To Do subthought', async () => {
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastEmptyThought(), 'To Do')
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText(/Now add a thought to “To Do”/)).toBeInTheDocument()
    })

    it('we add a Home->To Do->or to not subthought sub-subthought', async () => {
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastEmptyThought(), 'or to not')
      await act(vi.runOnlyPendingTimersAsync)

      /* thoughts:
      - Home
        - To Do
          - or to not
      */
      expect(screen.getByText(/Nice work!/)).toBeInTheDocument()
    })
  })

  describe('step context 2 - create a "Work" to-do list', () => {
    it('we prepare to create another list', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/Now we are going to create a different "To Do" list./)).toBeInTheDocument()
    })

    it('we create a Work thought', async () => {
      // we created a new thought on 3rd level, clicking "Home" gets us to root
      await user.click(screen.getByText('Home'))
      await user.keyboard('{Enter}')
      await user.type(lastEmptyThought(), 'Work')
      await act(vi.runOnlyPendingTimersAsync)

      /* thoughts:
      - Home
        - To Do
          - or to not
      - Work
      */
      expect(screen.getByText(/Now add a thought with the text "To Do"/)).toBeInTheDocument()
    })

    it('we add another Work->To Do thought', async () => {
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastEmptyThought(), 'To Do')
      expect(screen.getByText('Imagine a new work task. Add it to this “To Do” list.'))
    })

    it('we see context indicators', async () => {
      expect(screen.getAllByRole('superscript')[0]).toHaveTextContent('2')
      expect(screen.getByText(/This means that “To Do” appears in two places/)).toBeInTheDocument()
    })

    it('we add a Work->To Do->Text boss', async () => {
      await user.keyboard('{Control>}{Enter}{/Control}')
      await user.type(lastEmptyThought(), 'Text boss')
      await act(vi.runOnlyPendingTimersAsync)
      /* thoughts:
      - Home
        - To Do
          - or to not
      - Work
        - To Do
          - Text boss
      */
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  describe('step context view open', () => {
    it('we learn about multiple contexts', async () => {
      await user.click(screen.getByText('Next'))
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText(/First select "To Do"./)).toBeInTheDocument()
    })

    it('we select a thought with multiple contexts', async () => {
      await user.click(screen.getAllByText('To Do').at(-1)!)
      await act(vi.runOnlyPendingTimersAsync)
      expect(screen.getByText("Hit Alt + Shift + S to view the current thought's contexts.")).toBeInTheDocument()
    })

    it('we view contexts of a thought', async () => {
      await user.keyboard('{Alt>}{Shift>}S{/Shift}{/Alt}')
      await act(vi.runOnlyPendingTimersAsync)
      expect(
        screen.getByText(/We now see all of the contexts in which "To Do" appears, namely "Home" and "Work"./),
      ).toBeInTheDocument()
    })
  })

  it('we see real-world context examples', async () => {
    await user.click(screen.getByText('Next'))
    expect(screen.getByText(/Here are some real-world examples of using contexts in/)).toBeInTheDocument()
  })

  describe('step success', () => {
    it('we complete the advanced tutorial', async () => {
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/Congratulations! You have completed Part II of the tutorial./)).toBeInTheDocument()
    })

    it('we exit the tutorial', async () => {
      user.click(screen.getByText('Finish'))
      await act(vi.runOnlyPendingTimersAsync)
      expect(() => screen.getByTestId('tutorial-step')).toThrow('Unable to find an element')
    })
  })
})
