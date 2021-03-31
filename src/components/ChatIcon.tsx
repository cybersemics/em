import React, { FC } from 'react'
import { connect } from 'react-redux'
import { theme } from '../selectors'
import { Index } from '../types'
import { State } from '../util/initialState'

interface ChatIconProps {
  dark?: boolean,
  fill?: string,
  size: number,
  style?: Index<string>,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light',
})

// eslint-disable-next-line jsdoc/require-jsdoc
const AddIcon: FC<ChatIconProps> = ({ dark, fill, size = 20, style }) =>
  <svg
    className='icon'
    width={size}
    height={size}
    fill={fill || (dark ? 'white' : 'black')}
    style={style}
    viewBox='0 1 48 46'
    x='0px'
    y='0px'
  >
    <path d='M2.59521,45.93945a.999.999,0,0,0,1.02344-.04394l13.38526-8.78076H44.92969a.99974.99974,0,0,0,1-1V2.94043a.99974.99974,0,0,0-1-1H3.07031a1.00005,1.00005,0,0,0-1,1V45.05957A.99958.99958,0,0,0,2.59521,45.93945Zm1.4751-41.999H43.92969V35.11475H16.70508a.9987.9987,0,0,0-.54834.16406L4.07031,43.20752Z' />
    <path d='M34.15527,8.95215h4.70411v.47021a1,1,0,0,0,2,0V7.95215a.99974.99974,0,0,0-1-1H34.15527a1,1,0,0,0,0,2Z' />
    <path d='M40.55957,13.27979a.65035.65035,0,0,0-.14941-.12989c-.05078-.03027-.11036-.06006-.16993-.08984-.06054-.02-.12011-.04-.19043-.06006a1.2714,1.2714,0,0,0-.38964,0l-.18067.06006c-.05957.02978-.12011.05957-.17969.08984a1.95081,1.95081,0,0,0-.15039.12989,1.00482,1.00482,0,0,0-.21.31982.87445.87445,0,0,0-.08007.38037,1.00691,1.00691,0,0,0,1,1.00977,1.02427,1.02427,0,0,0,1-1.00977,1.04047,1.04047,0,0,0-.07911-.38037A.87985.87985,0,0,0,40.55957,13.27979Z' />
  </svg>

export default connect(mapStateToProps)(AddIcon)
