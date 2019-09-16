import React from 'react'
import { connect } from 'react-redux'

// components
import { Helper } from './Helper.js'
import { HomeLink } from './HomeLink.js'

export const HelperContextView = connect(({ helperData }) => ({ helperData }))(({ helperData }) =>
  <Helper id='contextView' title={`This view shows a new way of looking at "${helperData}"`} center>
    <p>Instead of all items within the "{helperData}" context, here you see all contexts that "{helperData}" is in.</p>
    <p><i>Tap the <HomeLink inline /> icon in the upper left corner to return to the home context.</i></p>
  </Helper>
)

