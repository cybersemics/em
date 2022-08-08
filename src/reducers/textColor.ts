import _ from 'lodash'
import State from '../@types/State'
import setAttribute from '../reducers/setAttribute'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'

/** Sets the text color or background color of the cursor. */
const textColor = (
  state: State,
  { backgroundColor, color, shape }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text' },
) => {
  if (!state.cursor) return state
  const path = state.cursor

  return reducerFlow([
    // set bullet to text color
    color && color !== 'white'
      ? setAttribute({ path, values: ['=bullet', '=style', 'color', backgroundColor || color] })
      : deleteAttribute({ path, values: ['=bullet', '=style', 'color'] }),

    // set text color
    // clear color if white
    backgroundColor || color !== 'white'
      ? setAttribute({ path, values: ['=style', 'color', color || 'black'] })
      : deleteAttribute({ path, values: ['=style', 'color'] }),

    // set background color
    // clear background color if black or unset
    backgroundColor && backgroundColor !== 'black'
      ? setAttribute({ path, values: ['=style', 'backgroundColor', backgroundColor] })
      : deleteAttribute({ path, values: ['=style', 'backgroundColor'] }),
  ])(state)
}

export default _.curryRight(textColor)
