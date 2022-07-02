import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import { isTouch } from '../../browser'
import { commonStyles } from '../../style/commonStyles'
import ellipsize from '../../util/ellipsize'
import headValue from '../../util/headValue'
import parentOf from '../../util/parentOf'
import { Text } from '../Text.native'

interface IComponentProps {
  cursor: Path
}

const { smallText, italic } = commonStyles
// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThoughtEnter = ({ cursor }: IComponentProps) => {
  const state = useStore<State>().getState()

  return (
    <Fragment>
      <Text style={smallText}>
        As you can see{isTouch ? ' (if you scroll down)' : ''}, the new thought
        {cursor && cursor.length > 1 && headValue(state, cursor).length > 0
          ? `${ellipsize(headValue(state, cursor))}`
          : null}{' '}
        is nested <Text style={[smallText, italic]}>within</Text>{' '}
        {cursor && cursor.length > 1 ? (
          <Text style={smallText}>{ellipsize(headValue(state, parentOf(cursor)))}</Text>
        ) : (
          'the other thought'
        )}
        . This is useful for using a thought as a category, for example, but the exact meaning is up to you.
      </Text>
      <Text style={smallText}>You can create thoughts within thoughts within thoughts. There is no limit.</Text>
      {!cursor || headValue(state, cursor).length > 0 ? (
        <Text style={smallText}>Click the Next button when you are ready to continue.</Text>
      ) : (
        <Text style={smallText}>Feel free to type some text for the new thought.</Text>
      )}
    </Fragment>
  )
}

export default TutorialStepSubThoughtEnter
