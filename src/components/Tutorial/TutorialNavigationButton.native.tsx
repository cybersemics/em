import React from 'react'
import { View } from 'react-native'
import { commonStyles } from '../../style/commonStyles'
import { ActionButton } from '../ActionButton'

interface IComponentProps {
  clickHandler: () => void
  value: string
  disabled?: boolean
  isLast?: boolean
}

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationButton = ({ isLast, clickHandler, value, disabled = false }: IComponentProps) => (
  <View style={[!isLast && commonStyles.flexOne, commonStyles.alignItemsCenter]}>
    <ActionButton
      onClick={clickHandler}
      title={value}
      isDisabled={disabled}
      style={disabled ? commonStyles.halfOpacity : {}}
    />
  </View>
)

export default TutorialNavigationButton
