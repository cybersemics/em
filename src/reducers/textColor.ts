import _ from 'lodash'
import State from '../@types/State'
import setAttribute from '../reducers/setAttribute'
import findDescendant from '../selectors/findDescendant'
import { getAllChildren } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Sets the text color or background color of the cursor. */
const textColor = (
  state: State,
  { backgroundColor, color, shape }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text' },
) => {
  if (!state.cursor) return state
  const stateNew = shape === 'bullet' ? setAttribute(state, { path: state.cursor!, key: '=bullet' }) : state
  const path =
    shape === 'bullet'
      ? appendToPath(state.cursor, findDescendant(stateNew, head(state.cursor!), '=bullet')!)
      : state.cursor

  return reducerFlow([
    // clear bullet
    shape === 'bullet' && color === 'white'
      ? (state: State) =>
          deleteThought(state, {
            pathParent: state.cursor!,
            thoughtId: head(path),
          })
      : null,

    // clear background color if black or unset
    !backgroundColor || backgroundColor === 'black'
      ? (state: State) => {
          const styleId = findDescendant(state, head(path!), '=style')
          const backgroundColorId = styleId ? findDescendant(state, styleId, 'backgroundColor') : null
          if (!backgroundColorId) return state
          return deleteThought(state, {
            pathParent: path!,
            thoughtId: backgroundColorId,
          })
        }
      : null,

    // clear color if white
    // if background color is being set, we still need to set color to black
    color === 'white'
      ? (state: State) => {
          const styleId = findDescendant(state, head(path!), '=style')
          const colorId = styleId ? findDescendant(state, styleId, 'color') : null
          if (!colorId) return state
          return deleteThought(state, {
            pathParent: path!,
            thoughtId: colorId,
          })
        }
      : null,

    // clear background color
    !backgroundColor || backgroundColor === 'black'
      ? (state: State) => {
          const styleId = findDescendant(state, head(path!), '=style')
          const backgroundColorId = styleId ? findDescendant(state, styleId, 'backgroundColor') : null
          if (!backgroundColorId) return state
          return deleteThought(state, {
            pathParent: path!,
            thoughtId: backgroundColorId,
          })
        }
      : null,

    // set =style/color
    color !== 'white' ? setAttribute({ path: path, key: '=style', value: 'color' }) : null,

    // set =style/backgroundColor
    backgroundColor && backgroundColor !== 'black'
      ? setAttribute({ path: path, key: '=style', value: 'backgroundColor' })
      : null,

    // delete =style if it has no children
    // must go after setting =style
    (state: State) => {
      const styleId = findDescendant(state, head(path!), '=style')
      if (!styleId || getAllChildren(state, styleId).length > 0) return null
      return deleteThought(state, {
        pathParent: path!,
        thoughtId: styleId,
      })
    },

    // set color/backgroundColor value
    (state: State) => {
      const styleId = findDescendant(state, head(path!), '=style')!
      const stylePath = appendToPath(path, styleId)
      return reducerFlow([
        // color
        color !== 'white'
          ? setAttribute({
              path: stylePath,
              key: 'color',
              value: color || 'black',
            })
          : null,
        // background color
        backgroundColor && backgroundColor !== 'black'
          ? setAttribute({
              path: stylePath,
              key: 'backgroundColor',
              value: backgroundColor,
            })
          : null,
      ])(state)
    },
  ])(stateNew)
}

export default _.curryRight(textColor)
