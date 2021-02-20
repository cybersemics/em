import React, { FC } from 'react'
import { connect } from 'react-redux'
import { theme } from '../selectors'
import { Index } from '../types'
import { State } from '../util/initialState'

interface SearchIconProps {
  dark?: boolean,
  fill?: string,
  size: number,
  style?: Index<string>,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light'
})

// eslint-disable-next-line jsdoc/require-jsdoc
const AddIcon: FC<SearchIconProps> = ({ dark, fill, size = 20, style }) =>
  <svg version='1.1' x='0px' y='0px' viewBox='1 2 97 96' className='icon' width={size} height={size} fill={fill || (dark ? 'white' : 'black')} style={style}><polygon points='51.4,27.3 48.6,27.3 48.6,48.6 27.3,48.6 27.3,51.4 48.6,51.4 48.6,72.7 51.4,72.7 51.4,51.4 72.7,51.4      72.7,48.6 51.4,48.6    '/><path d='M50,2.5C23.8,2.5,2.5,23.8,2.5,50S23.8,97.5,50,97.5S97.5,76.2,97.5,50S76.2,2.5,50,2.5z M50,94.7     c-24.7,0-44.7-20-44.7-44.7S25.3,5.3,50,5.3c24.7,0,44.7,20,44.7,44.7S74.7,94.7,50,94.7z'/></svg>

export default connect(mapStateToProps)(AddIcon)
