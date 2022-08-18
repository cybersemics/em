import _ from 'lodash'
import State from '../@types/State'
import setAttribute from '../reducers/setAttribute'
import themeColors from '../selectors/themeColors'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'

/** Sets the text color or background color of the cursor. */
const textColor = (
  state: State,
  { backgroundColor, color, shape }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text' },
) => {
  if (!state.cursor) return state
  const path = state.cursor
  const colors = themeColors(state)

  return reducerFlow([
    // set bullet to text color
    color && color !== 'default'
      ? setAttribute({ path, values: ['=bullet', '=style', 'color', backgroundColor || color] })
      : deleteAttribute({ path, values: ['=bullet', '=style', 'color'] }),

    // set text color
    // clear color if white
    backgroundColor || color !== 'default'
      ? setAttribute({ path, values: ['=style', 'color', color || 'rgba(0, 0, 0, 1)'] })
      : deleteAttribute({ path, values: ['=style', 'color'] }),

    // set background color
    // clear background color if default or unset
    backgroundColor && backgroundColor !== colors.bg
      ? setAttribute({
          path,
          values: ['=styleAnnotation', 'backgroundColor', backgroundColor === 'inverse' ? colors.fg : backgroundColor],
        })
      : deleteAttribute({ path, values: ['=styleAnnotation', 'backgroundColor'] }),
  ])(state)
}

export default _.curryRight(textColor)
