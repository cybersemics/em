import _ from 'lodash'
import State from '../@types/State'
import setAttribute from '../reducers/setAttribute'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'
import toggleAttribute from './toggleAttribute'

/** Sets the text color or background color of the cursor. */
const textColor = (
  state: State,
  { backgroundColor, color, shape }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text' },
) => {
  if (!state.cursor) return state
  const stateNew = shape === 'bullet' ? setAttribute(state, { path: state.cursor!, value: '=bullet' }) : state
  const path = state.cursor

  return shape === 'bullet'
    ? // bullet
      // do not modify text color or background color
      color !== 'white'
      ? toggleAttribute(state, { path: state.cursor, values: ['=bullet', '=style', 'color', color!] })
      : deleteAttribute(state, { path, values: ['=bullet', '=style', 'color'] })
    : // text color/background color
      reducerFlow([
        // set =style/color
        // clear color if white
        backgroundColor || color !== 'white'
          ? setAttribute({ path, values: ['=style', 'color', color || 'black'] })
          : deleteAttribute({ path, values: ['=style', 'color'] }),

        // set =style/backgroundColor
        // clear background color if black or unset
        backgroundColor && backgroundColor !== 'black'
          ? setAttribute({ path, values: ['=style', 'backgroundColor', backgroundColor] })
          : deleteAttribute({ path, values: ['=style', 'backgroundColor'] }),
      ])(stateNew)
}

export default _.curryRight(textColor)
