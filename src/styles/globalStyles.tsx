import React from 'react'
import { Global, css } from '@emotion/react'
import tw from 'twin.macro'

const globalStyles = css`
  * {
    box-sizing: border-box;
  }

  body {
    ${tw`text-base`}
  }
`

/**
 * Global styles.
 */
const GlobalStyle = () => {
  return <Global styles={globalStyles}></Global>
}

export default GlobalStyle
