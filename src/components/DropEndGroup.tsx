import React from 'react'
import { Path } from '../types'
import { GenericObject } from '../utilTypes'
import DropEnd from './DropEnd'

interface DropEndObject {
    key: string,
    thoughtsRanked: Path,
    showContexts: boolean,
    xOffset: number,
}

interface DropEndGroupProps {
    expanded: boolean,
    showContexts: boolean,
    thoughtsRanked: Path,
    dropEndObject: GenericObject, // TO-DO: create a proper type for this
}

interface DropProps {
    thoughtsRanked: Path,
    showContexts?: boolean,
}

// this is approximate width of part of node at the left side of the bullet in rem.
const LEFT_ADJUST_WIDTH = 0.6

// height of drop end in rem.
const DROP_END_HEIGHT = 0.25

// x offset to the right for the child drop in rem.
const CHILD_DROP_XOFFSET = 4

// child drop end height in rem.
const CHILD_DROP_END_HEIGHT = 1.4

/** Drop end for child context and for next sibling for the last child in the context. */
const DropEndGroup = ({ expanded, showContexts, thoughtsRanked, dropEndObject }: DropEndGroupProps) => {

  return (
    <div style={{ position: 'relative' }}>
      {
        dropEndObject && dropEndObject.map(({ key, thoughtsRanked, showContexts, xOffset }: DropEndObject) => {
          return (
            <div key={key} style={{ height: `${DROP_END_HEIGHT}rem` }}>
              <DropEnd
                thoughtsRanked={thoughtsRanked}
                showContexts={showContexts}
                dropStyle={{
                  transform: `translateX(${xOffset + LEFT_ADJUST_WIDTH}rem)`,
                  height: `${DROP_END_HEIGHT}rem`,
                }}
                indicatorStyle={{}}
              />
            </div>
          )
        })
      }
      {/*
          Drop as child.
          - a
            - <--- Drop --->
        */}
      { !expanded &&
              <DropEnd
                dropStyle={{
                  transform: `translateX(${CHILD_DROP_XOFFSET}rem) translateY(${-0.6}rem)`,
                  height: `${CHILD_DROP_END_HEIGHT}rem`,
                  width: `calc(100% - ${CHILD_DROP_XOFFSET}rem)`,
                  top: 0,
                }}
                indicatorStyle={{
                  transform: `translateX(-2rem) translateY(0.5rem)`
                }}
                showContexts={showContexts}
                thoughtsRanked={thoughtsRanked}
              />
      }
    </div>
  )
}

export default DropEndGroup
