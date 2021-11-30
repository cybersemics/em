import React, { MouseEvent } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { getLexeme, hasChildren, isContextViewActive, isPending } from '../selectors'
import { head } from '../util'
import { Context, State } from '../@types'
import styled from 'styled-components'

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
  <BulletWrapper
    className={classNames({
      bullet: true,
      // Since Parents and Lexemes are loaded from the db separately, it is common for Lexemes to be temporarily missing.
      // Therefore render in a simple gray rather than an error color.
      // There is not an easy way to distinguish between a Lexeme that is missing and one that is loading, though eventually if all pulls have completed successfully and the Lexeme is still missing we could infer it was an error.
      gray: missing,
      graypulse: pending,
      'show-contexts': showContexts,
      'invalid-option': invalid,
    })}
  >
    <GlyphWrapper className='glyph' onClick={onClick}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </GlyphWrapper>
  </BulletWrapper>
)

const BulletWrapper = styled.span`
  .children > .child > .thought-container > & {
    transition: transform 0.1s ease-in-out, text-indent 0.4s ease-in-out, left 0.4s ease-in-out, top 0.4s ease-in-out,
      opacity 0.4s ease-in-out;
    /* necessary for transition start */
    left: 0;
    display: inline-block;
    margin-left: -15px;
    line-height: 1;
  }

  .mobile .child.expanded:not(.leaf) > .thought-container > &,
  .mobile .child.editing:not(.leaf) > .thought-container > &,
  .mobile .child.cursor-parent:not(.leaf) > .thought-container > &,
  .mobile .child.cursor-grandparent:not(.leaf) > .thought-container > & {
    transform-origin: 55% 60%;
  }

  .child > .thought-container > & {
    transition: transform 0.1s ease-in-out;
  }

  /* In context view, make room for breadcrumbs. */
  .child.show-contexts > .thought-container & {
    position: relative;
    top: 1.6em;
  }

  .child.expanded:not(.leaf) > .thought-container > &,
  .child.editing:not(.leaf) > .thought-container > &,
  .child.cursor-parent:not(.leaf) > .thought-container > &,
  .child.cursor-grandparent:not(.leaf) > .thought-container > & {
    display: inline-block;
    /*margin-right: -7px; !* compensate for inline-block *!*/
    transform: rotate(90deg);
    transform-origin: 0.3em 0.5em;
  }

  .prose > .children > .child > .thought-container > & {
    position: relative;
    left: 27px;
    top: -2px;
    opacity: 0.5;
  }

  .prose > .children > .child.leaf > .thought-container > & {
    opacity: 0;
  }

  .table-view > .children > .child > .thought-container > & {
    display: none;
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android .child > .thought-container > & {
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
    .android .child > .thought-container > & {
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

  .children-new .child > .thought-container > .bullet & {
    content: '+';
    left: -0.15em;
    top: -0.05em;
    margin-right: -0.3em;
  }

  .distance-from-cursor-2 > .child:not(.editing):not(.cursor-parent) > .thought-container > .bullet &,
  .distance-from-cursor-3 > .child:not(.cursor-parent) > .thought-container > .bullet & {
    opacity: 0;
    pointer-events: none; /* prevent hidden bullets from being "selected", causing the focus to be lost and a subsequent tab to select a hidden thought */
  }

  .child > .thought-container > .bullet & {
    position: relative;
    /*margin-right: 10px;    this causes the li to break at the beginning with longer text */
    opacity: 0.8;
    line-height: 1;
    transition: opacity 0.75s ease-in-out;
    margin-right: -5px; /* increase click area */
    padding-right: 5px;
  }

  .mobile .children-new .child > .thought-container > .bullet & {
    left: 0.05em;
    top: -0.1em;
    margin-right: -0.1em;
  }

  .mobile .child.expanded:not(.leaf) > .thought-container > .bullet &,
  .mobile .child.editing:not(.leaf) > .thought-container > .bullet &,
  .mobile .child.cursor-parent:not(.leaf) > .thought-container > .bullet &,
  .mobile .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
    left: 0.06em;
  }

  .mobile .child.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile .child.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile .child.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
  .mobile .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
    left: -0.02em;
  }

  .child.leaf > .thought-container > .bullet.show-contexts & {
    font-size: 90%;
    top: -0.05em;
  }

  .mobile .child > .thought-container > .bullet.show-contexts & {
    font-size: 80%;
    left: -0.08em;
    top: 0.05em;
  }

  .mobile .child.leaf > .thought-container > .bullet.show-contexts & {
    top: 0;
    left: -0.3em;
    margin-right: calc(-0.48em - 5px); /* offset from .child > .thought-container > .bullet & margin-right */
  }

  /*### Phone Portrait ### */

  @media (max-width: 500px) {
    .android .child.leaf > .thought-container > .bullet & {
      left: 1.7px;
      top: -7px;
      font-size: 26px;
    }

    .android .child > .thought-container > .bullet & {
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
    .android .child > .thought-container > .bullet.show-contexts & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android .child.leaf > .thought-container > .bullet.show-contexts & {
      position: relative;
      font-size: 160%;
      left: 1px;
      top: -8.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android .child.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
      left: 2px;
      font-size: 20px;
      top: -2.5px;
    }

    .android .child.expanded:not(.leaf) > .thought-container > .bullet &,
    .android .child.editing:not(.leaf) > .thought-container > .bullet &,
    .android .child.cursor-parent:not(.leaf) > .thought-container > .bullet &,
    .android .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
      left: 2px;
      top: -1.6px;
      font-size: 19px;
    }

    .android .children-new .child > .thought-container > .bullet & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new .child > .thought-container > .bullet & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }

  /* Tablet Properties */
  @media (min-width: 560px) and (max-width: 1024px) {
    .android .child.leaf > .thought-container > .bullet & {
      left: 1.7px;
      top: -1px;
      font-size: 19px;
    }

    .android .child > .thought-container > .bullet & {
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
    .android .child > .thought-container > .bullet.show-contexts & {
      font-size: 149%;
      left: 2px;
      top: -5.1px;
    }

    .android .child.leaf > .thought-container > .bullet.show-contexts & {
      position: relative;
      font-size: 171%;
      left: 2px;
      top: -7.1px;
      margin-right: -5px;
      padding-right: 10px;
    }

    .android .child.expanded:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.editing:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.cursor-parent:not(.leaf) > .thought-container > .bullet.show-contexts &,
    .android .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet.show-contexts & {
      left: 3px;
      top: -5.1px;
    }

    .android .child.expanded:not(.leaf) > .thought-container > .bullet &,
    .android .child.editing:not(.leaf) > .thought-container > .bullet &,
    .android .child.cursor-parent:not(.leaf) > .thought-container > .bullet &,
    .android .child.cursor-grandparent:not(.leaf) > .thought-container > .bullet & {
      left: 2px;
      top: -9.5px;
    }

    .android .children-new .child > .thought-container > .bullet & {
      content: '+';
      left: -0.15em;
      top: -0.05em;
      margin-right: -0.3em;
    }

    .android .children-new .child > .thought-container > .bullet & {
      left: 0.05em;
      top: -0.1em;
      margin-right: -0.1em;
    }
  }
`

export default connect(mapStateToProps)(Bullet)
