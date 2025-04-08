import { FC, PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { anchorButtonRecipe } from '../../../styled-system/recipes'
import { tutorialStepActionCreator as setTutorialStep } from '../../actions/tutorialStep'
import getSetting from '../../selectors/getSetting'

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint: FC<PropsWithChildren> = ({ children }) => {
  // fractional steps are hints
  const tutorialStep = useSelector(state => +(getSetting(state, 'Tutorial Step') || 0))
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
        onClick={() =>
          dispatch(
            setTutorialStep({
              value: !hint ? tutorialStep + 0.1 : Math.floor(tutorialStep),
            }),
          )
        }
        role='button'
      >
        hint
      </a>
      {hint && children}
    </>
  )
}

export default TutorialHint
