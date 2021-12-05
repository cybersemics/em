import { keyframes } from '@emotion/react'
import tw, { css, styled, theme } from 'twin.macro'
import { ThoughtComponentWrapper } from '../Thought/styles'

const ToBlackKeyframe = keyframes`
to {
  color: ${theme`colors.black`};
}
`

const ToWhiteKeyframe = keyframes`k
to {
  color: ${theme`colors.black`}
}
`

export const BulletWrapper = styled.span<{
  gray?: boolean
  grayPulse?: boolean
  showContexts?: boolean
  invalid?: boolean
}>`
  ${props => props.gray && tw`text-gray-500`}
  ${props => props.invalid && tw`text-red-400`}

${props =>
    props.grayPulse &&
    css`
      color: ${theme`colors.gray.500`};
      animation: ${ToBlackKeyframe} 400ms infinite alternate ease-in-out;

      . & {
        animation: ${ToWhiteKeyframe} 400ms infinite alternate ease-in-out;
      }
    `}

.children > ${ThoughtComponentWrapper} > .thought-container > & {
    transition: transform 0.1s ease-in-out, text-indent 0.4s ease-in-out, left 0.4s ease-in-out, top 0.4s ease-in-out,
      opacity 0.4s ease-in-out;
    /* necessary for transition start */
    left: 0;
    display: inline-block;
    margin-left: -15px;
    line-height: 1;
  }

  .mobile &[data-showContext='true'] {
    margin-right: -1.5px;
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > &,
  .mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > * > &,
  .mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > &,
  .mobile ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > * > & {
    transform-origin: 55% 60%;
  }

  ${ThoughtComponentWrapper} > * > & {
    transition: transform 0.1s ease-in-out;
  }

  /* In context view, make room for breadcrumbs. */
  ${ThoughtComponentWrapper}[data-showContexts='true'] > * > & {
    position: relative;
    top: 1.6em;
  }

  ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > &,
${ThoughtComponentWrapper}.editing:not(.leaf) > * > &,
${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > &,
${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > * > & {
    display: inline-block;
    /*margin-right: -7px; !* compensate for inline-block *!*/
    transform: rotate(90deg);
    transform-origin: 0.3em 0.5em;
  }

  .prose > .children > ${ThoughtComponentWrapper} > * > & {
    position: relative;
    left: 27px;
    top: -2px;
    opacity: 0.5;
  }

  .prose > .children > ${ThoughtComponentWrapper}.leaf > * > & {
    opacity: 0;
  }

  .table-view > .children > ${ThoughtComponentWrapper} > * > & {
    display: none;
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android ${ThoughtComponentWrapper} > * > & {
      transition: transform 0.1s ease-in-out;
      margin-left: -3px;
    }

    .android .expanded:not(.leaf) > * > &,
    .android .editing:not(.leaf) > * > &,
    .android .cursor-parent:not(.leaf) > * > &,
    .android .cursor-grandparent:not(.leaf) > * > & {
      display: inline-block;
      margin-right: -1px; /* compensate for inline-block */
      transform: rotate(90deg);
      transform-origin: -11px 9px;
    }
  }

  /* Tablet Properties */
  @media (min-width: 560px) and (max-width: 1024px) {
    .android ${ThoughtComponentWrapper} > * > & {
      transition: transform 0.1s ease-in-out;
      margin-left: -3px;
    }

    .android .expanded:not(.leaf) > * > &,
    .android .editing:not(.leaf) > * > &,
    .android .cursor-parent:not(.leaf) > * > &,
    .android .cursor-grandparent:not(.leaf) > * > & {
      display: inline-block;
      margin-right: -1px; /* compensate for inline-block */
      transform: rotate(90deg);
      transform-origin: -11px 9px;
    }
  }
`

export const GlyphWrapper = styled.span`
  /* Glyph */

  .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
    content: '+';
    left: -0.15em;
    top: -0.05em;
    margin-right: -0.3em;
  }

  .distance-from-cursor-2 > ${ThoughtComponentWrapper}:not(.editing):not(.cursor-parent) > * > ${BulletWrapper} &,
  .distance-from-cursor-3 > ${ThoughtComponentWrapper}:not(.cursor-parent) > * > ${BulletWrapper} & {
    opacity: 0;
    pointer-events: none; /* prevent hidden bullets from being "selected", causing the focus to be lost and a subsequent tab to select a hidden thought */
  }

  ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
    position: relative;
    /*margin-right: 10px;    this causes the li to break at the beginning with longer text */
    opacity: 0.8;
    line-height: 1;
    transition: opacity 0.75s ease-in-out;
    margin-right: -5px; /* increase click area */
    padding-right: 5px;
  }

  .mobile .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
    left: 0.05em;
    top: -0.1em;
    margin-right: -0.1em;
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper} &,
  .mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper} &,
  .mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > ${BulletWrapper} &,
  .mobile ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > * > ${BulletWrapper} & {
    left: 0.06em;
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
.mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
.mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
.mobile
  ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf)
  > *
  > ${BulletWrapper}[data-showContexts='true']
  & {
    left: -0.02em;
  }

  ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper}[data-showContexts='true'] & {
    font-size: 90%;
    top: -0.05em;
  }

  .mobile ${ThoughtComponentWrapper} > * > ${BulletWrapper}[data-showContexts='true'] & {
    font-size: 80%;
    left: -0.08em;
    top: 0.05em;
  }

  .mobile ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper}[data-showContexts='true'] & {
    top: 0;
    left: -0.3em;
    margin-right: calc(
      -0.48em - 5px
    ); /* offset from ${ThoughtComponentWrapper} > * > ${BulletWrapper} & margin-right */
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper} & {
      left: 1.7px;
      top: -7px;
      font-size: 26px;
    }

    .android ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      position: relative;
      margin-left: -16.8px;
      opacity: 0.8;
      transition: opacity 0.75s ease-in-out;
      margin-right: -5px; /* increase click area */
      padding-right: 10.1px;
      left: 3px;
      font-size: 16px;
      top: -1px;
    }

    /* Contexted Styles */
    .android ${ThoughtComponentWrapper} > * > ${BulletWrapper}[data-showContexts='true'] & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper}[data-showContexts='true'] & {
      position: relative;
      font-size: 160%;
      left: 1px;
      top: -8.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
  .android ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
  .android
    ${ThoughtComponentWrapper}.cursor-parent:not(.leaf)
    > *
    > ${BulletWrapper}[data-showContexts='true']
    &,
  .android
    ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf)
    > *
    > ${BulletWrapper}[data-showContexts='true']
    & {
      left: 2px;
      font-size: 20px;
      top: -2.5px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > * > ${BulletWrapper} & {
      left: 2px;
      top: -1.6px;
      font-size: 19px;
    }

    .android .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }

  /* Tablet Properties */
  @media (min-width: 560px) and (max-width: 1024px) {
    .android ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper} & {
      left: 1.7px;
      top: -1px;
      font-size: 19px;
    }

    .android ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      position: relative;
      margin-left: -16.8px;
      opacity: 0.8;
      transition: opacity 0.75s ease-in-out;
      margin-right: -5px; /* increase click area */
      padding-right: 10.1px;
      left: 4px;
      font-size: 28px;
      top: -9px;
    }

    /* Contexted Styles */
    .android ${ThoughtComponentWrapper} > * > ${BulletWrapper}[data-showContexts='true'] & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.leaf > * > ${BulletWrapper}[data-showContexts='true'] & {
      position: relative;
      font-size: 171%;
      left: 2px;
      top: -7.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
  .android ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper}[data-showContexts='true'] &,
  .android
    ${ThoughtComponentWrapper}.cursor-parent:not(.leaf)
    > *
    > ${BulletWrapper}[data-showContexts='true']
    &,
  .android
    ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf)
    > *
    > ${BulletWrapper}[data-showContexts='true']
    & {
      left: 3px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > * > ${BulletWrapper} &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > * > ${BulletWrapper} & {
      left: 2px;
      top: -9.5px;
    }

    .android .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new ${ThoughtComponentWrapper} > * > ${BulletWrapper} & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }
`
