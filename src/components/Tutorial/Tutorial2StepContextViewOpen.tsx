import { useSelector } from 'react-redux'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getContexts from '../../selectors/getContexts'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewOpen = ({
  tutorialChoice,
  contextViews,
}: {
  contextViews: any
  tutorialChoice: keyof typeof TUTORIAL_CONTEXT
}) => {
  const caseSensitiveValue = useSelector(state =>
    getContexts(state, TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase(),
  )
  const cursorLost = useSelector(state => {
    const cursorThoughts = state.cursor ? childIdsToThoughts(state, state.cursor) : null
    return (
      !cursorThoughts ||
      !cursorThoughts.some(
        child =>
          child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ||
          child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase() ||
          child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
      )
    )
  })
  const contextViewClosed = useSelector(state => {
    const cursorThoughts = state.cursor ? childIdsToThoughts(state, state.cursor) : null
    return !contextViews[
      contextToThoughtId(state, [
        (cursorThoughts &&
        cursorThoughts[0].value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
          ? TUTORIAL_CONTEXT1_PARENT
          : TUTORIAL_CONTEXT2_PARENT)[tutorialChoice],
        TUTORIAL_CONTEXT[tutorialChoice],
      ])!
    ]
  })

  return cursorLost ? (
    <p>
      Oops, "{caseSensitiveValue}" is hidden because the selection changed. Select "
      {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" or "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}" to show it again.
    </p>
  ) : contextViewClosed ? (
    <p>Oops, somehow the context view was closed. Click the Prev button to go back.</p>
  ) : (
    <>
      <p>
        Well, look at that. We now see all of the contexts in which "{caseSensitiveValue}" appears, namely "
        {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" and "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".{' '}
      </p>
      <p>
        You can select a context from this list to view its subthoughts without having to navigate to its original
        location.
      </p>
      <p>
        There are no manual links in <b>em</b>. By typing the same thought in multiple contexts, they will automatically
        be linked.
      </p>
    </>
  )
}

export default Tutorial2StepContextViewOpen
