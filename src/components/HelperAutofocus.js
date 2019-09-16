import React from 'react'
import { connect } from 'react-redux'

// components
import { Helper } from './Helper.js'

// util
import {
  conjunction,
  spellNumber,
} from '../util.js'

export const HelperAutofocus = connect(({ helperData }) => ({ helperData }))(({ helperData }) =>
    <Helper id='autofocus' title={(helperData && helperData.map ? conjunction(helperData.slice(0, 3).map(value => `"${value}"`).concat(helperData.length > 3 ? (`${spellNumber(helperData.length - 3)} other item` + (helperData.length > 4 ? 's' : '')) : [])) : 'no items') + ' have been hidden by autofocus'} center>
    <p>Autofocus follows your attention, controlling the number of items shown at once.</p>
    <p>When you move the selection, nearby items return to view.</p>
  </Helper>
)

