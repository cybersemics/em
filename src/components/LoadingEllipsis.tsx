import React from 'react'
import styled, { keyframes } from 'styled-components'
import tw from 'twin.macro'

/** Renders text with an animated '...'. */
const LoadingEllipsis = ({ text = 'Loading' }) => <EllipsisWrapper>{text}</EllipsisWrapper>

const EllipsisAnimation = keyframes`
  to {
    width: 1.25em;
  }
`

const EllipsisWrapper = styled.span`
  ${tw`
    italic
    text-gray-400
    text-opacity-80
    text-center
  `}

  &:after {
    ${tw`
      overflow-hidden
      absolute
      inline-block
      align-bottom
      w-0
      margin-left[0.1em]
    `}
    animation: ${EllipsisAnimation} steps(4, end) 1000ms infinite;
    content: '\\2026'; /* ascii code for the ellipsis character */
  }
`

export default LoadingEllipsis
