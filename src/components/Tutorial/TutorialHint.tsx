import { FC, PropsWithChildren } from 'react'
import { useDispatch } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { anchorButtonRecipe } from '../../../styled-system/recipes'
import { tutorialStepActionCreator as setTutorialStep } from '../../actions/tutorialStep'
import useEditorSelector from '../../hooks/useEditorSelector'
import getSetting from '../../selectors/getSetting'
import fastClick from '../../util/fastClick'

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint: FC<PropsWithChildren> = ({ children }) => {
  // fractional steps are hints
  const tutorialStep = useEditorSelector(state => +(getSetting(state, 'Tutorial Step') || 0))
  const dispatch = useDispatch()
  const hint = tutorialStep !== Math.floor(tutorialStep)

  return (
    <>
      <a
        className={cx(
          anchorButtonRecipe({
            variableWidth: true,
            lessPadding: true,
            dim: hint,
            smallGapX: true,
          }),
          css({ fontSize: 'sm' }),
        )}
        {...fastClick(() =>
          dispatch(
            setTutorialStep({
              value: !hint ? tutorialStep + 0.1 : Math.floor(tutorialStep),
            }),
          ),
        )}
      >
        hint
      </a>
      {hint && children}
    </>
  )
}

export default TutorialHint
