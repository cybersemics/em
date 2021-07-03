import React from 'react'
// import { isDocumentEditable } from '../util'
// import subCategorizeOne from '../action-creators/subCategorizeOne'
import { Icon as IconType, Shortcut } from '../types'
import Svg, { Path } from 'react-native-svg'
import { Alert } from 'react-native'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <Svg width={size} height={size} fill={fill} viewBox='0 0 24 24'>
    <Path d='M12.6,15.782V8.218a2.939,2.939,0,1,0-1.2,0v7.564a2.939,2.939,0,1,0,1.2,0ZM10.26,5.34A1.74,1.74,0,1,1,12,7.081,1.743,1.743,0,0,1,10.26,5.34ZM12,20.4a1.741,1.741,0,1,1,1.74-1.74A1.743,1.743,0,0,1,12,20.4Z' />
  </Svg>
)

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that shortcuts are evaluated in the correct order
const subCategorizeOneShortcut: Shortcut = {
  id: 'subcategorizeOne',
  label: 'Subcategorize One',
  description: 'Insert the current thought into a new context.',
  gesture: 'lu',
  keyboard: { key: 'o', meta: true, alt: true },
  svg: Icon,
  exec: () => Alert.alert('subCategorizeOneShortcut'),
  /*  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(subCategorizeOne()) */
}

// a shortcut for Raine until we have custom user shortcuts
export const subCategorizeOneShortcutAlias: Shortcut = {
  id: 'subcategorizeOneAlias',
  label: 'Subcategorize One',
  hideFromInstructions: true,
  keyboard: { key: ']', meta: true },
  svg: Icon,
  exec: () => Alert.alert('subCategorizeOneShortcutAlias'),
  /* canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(subCategorizeOne()) */
}

export default subCategorizeOneShortcut
