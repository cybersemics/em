/* eslint-disable import/prefer-default-export */
import { rgbToHex } from '@mui/material'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'
import head from '../util/head'
import { bulletColorActionCreator as bulletColor } from './bulletColor'
import { editThoughtActionCreator as editThought } from './editThought'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
export const formatSelectionActionCreator =
  (
    command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'foreColor' | 'backColor',
    color: string = '',
    {
      label,
      selected,
    }: {
      /** Color swatch label. */
      label?: string
      /** True if the color swatch is selected. */
      selected?: boolean
    } = {},
  ): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const colors = themeColors(state)
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    const sel = window.getSelection()
    suppressFocusStore.update(true)
    // if there is no selection, format the entire thought by selecting the whole thought
    const thoughtContentEditable = document.querySelector(`[aria-label="editable-${thought.id}"]`)
    if (!thoughtContentEditable) return
    if (sel?.toString().length === 0 && thought.value.length !== 0) {
      const savedSelection = selection.save()
      // must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile
      sel?.selectAllChildren(thoughtContentEditable)
      document.execCommand(command, false, color)
      selection.restore(savedSelection)
    } else {
      document.execCommand(command, false, color)
      updateCommandState()
    }

    if (command === 'foreColor' || command === 'backColor') {
      /** Function to check if a style(background) should be removed based on the color and background-color. */
      const shouldRemoveStyle = (styleString: string) => {
        const styleLower = styleString.toLowerCase()
        const hasBackgroundColor = styleLower.includes('background-color')
        const colorMatch = styleLower.match(/color\s*:\s*([^;]+);?/)
        const elementColor = colorMatch ? colorMatch[1].trim() : null
        const isDifferentColor = elementColor && elementColor !== rgbToHex(colors.bg)
        if ((elementColor && isDifferentColor) || (label === 'default' && hasBackgroundColor)) return true
        return false
      }

      dispatch((dispatch, getState) => {
        const state = getState()
        if (!state.cursor) return
        const thought = getThoughtById(state, head(state.cursor))
        const simplePath = simplifyPath(state, state.cursor)
        const styleAttrPattern = /style\s*=\s*["'][^"']*["']/gi
        //Replace style attributes based on the conditions
        const newThoughtValue = thought.value.replace(styleAttrPattern, match => {
          if (shouldRemoveStyle(match)) return ''
          return match
        })
        dispatch(
          editThought({
            oldValue: thought.value,
            newValue: newThoughtValue,
            path: simplePath,
          }),
        )
      })

      dispatch(
        bulletColor({
          ...(selected
            ? {
                color: 'default',
              }
            : color
              ? { color: label }
              : {
                  backgroundColor: label,
                }),
        }),
      )
    }

    suppressFocusStore.update(false)
  }
