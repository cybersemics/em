import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import { getLexeme, hasChildren, isContextViewActive, isPending } from '../../selectors'
import { head } from '../../util'
import { Context, State } from '../../@types'
import { keyframes } from '@emotion/react'
import { ThoughtComponentWrapper } from '../Thought/styles'
import tw, { css, styled, theme } from 'twin.macro'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: React.MouseEvent) => void
  showContexts?: boolean
  context: Context
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const lexeme = getLexeme(state, head(props.context))
  return {
    // if being edited and meta validation error has occured
    invalid: !!props.isEditing && invalidState,
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
    missing: !lexeme,
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  showContexts,
  glyph,
  invalid,
  isLeaf,
  missing,
  onClick,
  pending,
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <BulletWrapper gray={missing} grayPulse={pending} showContexts={showContexts} invalid={invalid}>
    <GlyphWrapper className='glyph' onClick={onClick}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </GlyphWrapper>
  </BulletWrapper>
)

const ToBlackKeyframe = keyframes`
  to {
    color: ${theme`colors.black`};
  }
`

const ToWhiteKeyframe = keyframes`
  to {
    color: ${theme`colors.black`}
  }
`

const BulletWrapper = styled.span<{ gray?: boolean; grayPulse?: boolean; showContexts?: boolean; invalid?: boolean }>`
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

  .mobile & {
    ${props => props.showContexts && `margin-right: -1.5px;`}
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > &,
  .mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > &,
  .mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > &,
  .mobile ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > & {
    transform-origin: 55% 60%;
  }

  ${ThoughtComponentWrapper} > .thought-container > & {
    transition: transform 0.1s ease-in-out;
  }

  /* In context view, make room for breadcrumbs. */
  ${ThoughtComponentWrapper}.show-contexts > .thought-container & {
    position: relative;
    top: 1.6em;
  }

  ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > &,
  ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > &,
  ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > &,
  ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > & {
    display: inline-block;
    /*margin-right: -7px; !* compensate for inline-block *!*/
    transform: rotate(90deg);
    transform-origin: 0.3em 0.5em;
  }

  .prose > .children > ${ThoughtComponentWrapper} > .thought-container > & {
    position: relative;
    left: 27px;
    top: -2px;
    opacity: 0.5;
  }

  .prose > .children > ${ThoughtComponentWrapper}.leaf > .thought-container > & {
    opacity: 0;
  }

  .table-view > .children > ${ThoughtComponentWrapper} > .thought-container > & {
    display: none;
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android ${ThoughtComponentWrapper} > .thought-container > & {
      transition: transform 0.1s ease-in-out;
      margin-left: -3px;
    }

    .android .expanded:not(.leaf) > .thought-container > &,
    .android .editing:not(.leaf) > .thought-container > &,
    .android .cursor-parent:not(.leaf) > .thought-container > &,
    .android .cursor-grandparent:not(.leaf) > .thought-container > & {
      display: inline-block;
      margin-right: -1px; /* compensate for inline-block */
      transform: rotate(90deg);
      transform-origin: -11px 9px;
    }
  }

  /* Tablet Properties */
  @media (min-width: 560px) and (max-width: 1024px) {
    .android ${ThoughtComponentWrapper} > .thought-container > & {
      transition: transform 0.1s ease-in-out;
      margin-left: -3px;
    }

    .android .expanded:not(.leaf) > .thought-container > &,
    .android .editing:not(.leaf) > .thought-container > &,
    .android .cursor-parent:not(.leaf) > .thought-container > &,
    .android .cursor-grandparent:not(.leaf) > .thought-container > & {
      display: inline-block;
      margin-right: -1px; /* compensate for inline-block */
      transform: rotate(90deg);
      transform-origin: -11px 9px;
    }
  }
`

const GlyphWrapper = styled.span`
  /* Glyph */

  .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
    content: '+';
    left: -0.15em;
    top: -0.05em;
    margin-right: -0.3em;
  }

  .distance-from-cursor-2
    > ${ThoughtComponentWrapper}:not(.editing):not(.cursor-parent)
    > .thought-container
    > .bullet
    &,
  .distance-from-cursor-3 > ${ThoughtComponentWrapper}:not(.cursor-parent) > .thought-container > .bullet & {
    opacity: 0;
    pointer-events: none; /* prevent hidden bullets from being "selected", causing the focus to be lost and a subsequent tab to select a hidden thought */
  }

  ${ThoughtComponentWrapper} > .thought-container > .bullet & {
    position: relative;
    /*margin-right: 10px;    this causes the li to break at the beginning with longer text */
    opacity: 0.8;
    line-height: 1;
    transition: opacity 0.75s ease-in-out;
    margin-right: -5px; /* increase click area */
    padding-right: 5px;
  }

  .mobile .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
    left: 0.05em;
    top: -0.1em;
    margin-right: -0.1em;
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet &,
  .mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet &,
  .mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet &,
  .mobile ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
    left: 0.06em;
  }

  .mobile ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
    left: -0.02em;
  }

  ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet.show-contexts & {
    font-size: 90%;
    top: -0.05em;
  }

  .mobile ${ThoughtComponentWrapper} > .thought-container > .bullet.show-contexts & {
    font-size: 80%;
    left: -0.08em;
    top: 0.05em;
  }

  .mobile ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet.show-contexts & {
    top: 0;
    left: -0.3em;
    margin-right: calc(
      -0.48em - 5px
    ); /* offset from ${ThoughtComponentWrapper} > .thought-container > .bullet & margin-right */
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet & {
      left: 1.7px;
      top: -7px;
      font-size: 26px;
    }

    .android ${ThoughtComponentWrapper} > .thought-container > .bullet & {
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
    .android ${ThoughtComponentWrapper} > .thought-container > .bullet.show-contexts & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet.show-contexts & {
      position: relative;
      font-size: 160%;
      left: 1px;
      top: -8.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
      left: 2px;
      font-size: 20px;
      top: -2.5px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
      left: 2px;
      top: -1.6px;
      font-size: 19px;
    }

    .android .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }

  /* Tablet Properties */
  @media (min-width: 560px) and (max-width: 1024px) {
    .android ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet & {
      left: 1.7px;
      top: -1px;
      font-size: 19px;
    }

    .android ${ThoughtComponentWrapper} > .thought-container > .bullet & {
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
    .android ${ThoughtComponentWrapper} > .thought-container > .bullet.show-contexts & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.leaf > .thought-container > .bullet.show-contexts & {
      position: relative;
      font-size: 171%;
      left: 2px;
      top: -7.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
      left: 3px;
      top: -5.1px;
    }

    .android ${ThoughtComponentWrapper}.expanded:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.editing:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.cursor-parent:not(.leaf) > .thought-container > .bullet &,
    .android ${ThoughtComponentWrapper}.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
      left: 2px;
      top: -9.5px;
    }

    .android .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new ${ThoughtComponentWrapper} > .thought-container > .bullet & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }
`

export default connect(mapStateToProps)(Bullet)
