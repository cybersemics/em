import React, { Fragment } from 'react'
import Dispatch from '../../@types/Dispatch'
import showModal from '../../action-creators/showModal'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText, bold } = commonStyles

interface IComponentProps {
  dispatch: Dispatch
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepSuccess = ({ dispatch }: IComponentProps) => (
  <Fragment>
    <Text style={smallText}>
      Congratulations! You have completed Part II of the tutorial. You now have the skills to create a vast web of
      thoughts in <Text style={[smallText, bold]}>em</Text>.
    </Text>
    <Text style={smallText}>
      That's right; you're on your own now. But you can always replay this tutorial or explore all of the available{' '}
      gestures by clicking the <Text onPress={() => dispatch(showModal({ id: 'help' }))}>Help</Text> link in the footer.
    </Text>
    <Text style={smallText}>Happy Sensemaking!</Text>
  </Fragment>
)

export default Tutorial2StepSuccess
