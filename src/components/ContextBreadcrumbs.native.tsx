import { View } from 'moti'
import React from 'react'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import { store } from '../store'
import { fadeIn } from '../style/animations'
import { commonStyles } from '../style/commonStyles'
import ancestors from '../util/ancestors'
import isRoot from '../util/isRoot'
import strip from '../util/strip'
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'
import { Text } from './Text.native'

export interface ContextBreadcrumbProps {
  homeContext?: boolean
  simplePath: SimplePath
  thoughtsLimit?: number
  charLimit?: number
  classNamesObject?: Index<boolean>
}

type OverflowChild = {
  id: ThoughtId
  value: string
  label?: string
  isOverflow?: boolean
}

type OverflowPath = OverflowChild[]

const { from, animate } = fadeIn
const { flexWrap, directionRow, flexGrow, alignItemsCenter } = commonStyles

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({
  homeContext,
  simplePath,
  thoughtsLimit,
  charLimit,
  classNamesObject,
}: ContextBreadcrumbProps) => {
  // if thoughtsLimit or charLimit is not passed , the default value of ellipsize will be false and component will have default behaviour
  const [ellipsize, setEllipsize] = React.useState(thoughtsLimit !== undefined && charLimit !== undefined)

  const state = store.getState()
  // calculate if the overflow occurs during ellipsized view
  // 0 if thoughtsLimit is not defined
  const overflow = simplePath.length > thoughtsLimit! ? simplePath.length - thoughtsLimit! + 1 : 0

  // if charLimit is exceeded then replace the remaining characters by ellipsis
  const charLimitedArray: OverflowPath = simplePath.map(id => {
    const thought = getThoughtById(state, id)
    return {
      value: thought.value,
      id,
      // add ellipsized label
      ...(ellipsize
        ? {
            label: strip(
              // subtract 2 so that additional '...' is still within the char limit
              thought.value.length > charLimit! - 2 ? thought.value.substr(0, charLimit! - 2) + '...' : thought.value,
            ),
          }
        : {}),
    }
  })

  // after character limit is applied we need to remove the overflow thoughts if any and add isOverflow flag to render ellipsis at that position
  const overflowArray: OverflowPath =
    ellipsize && overflow
      ? charLimitedArray
          .slice(0, charLimitedArray.length - 1 - overflow)
          .concat({ isOverflow: true } as OverflowChild, charLimitedArray.slice(charLimitedArray.length - 1))
      : charLimitedArray

  return (
    <View style={flexGrow}>
      {isRoot(simplePath) ? (
        /*
      If the path is the root context, check homeContext which is true if the context is directly in the root (in which case the HomeLink is already displayed as the thought)

      For example:

        - a
        - b
          - a
        - c
          - d
            - a

      Activating the context view on "a" will show three contexts: ROOT, b, and c/d.

      - The ROOT context will render the HomeLink as a thought. No breadcrumbs are displayed.
      - The "b" context will render "b" as a thought and the HomeLink as the breadcrumbs.
      - The "c/d" context will render "d" as a thought and "c" as the breadcrumbs.
    */
        !homeContext ? (
          <HomeLink color='gray' size={20} />
        ) : null
      ) : (
        <View style={[directionRow, flexWrap]}>
          {overflowArray.map(({ isOverflow, id, label }, i) => {
            const subthoughts = ancestors(simplePath, id) as SimplePath

            return (
              <View
                key={i}
                from={from}
                animate={animate}
                transition={{
                  type: 'timing',
                  duration: 350,
                }}
                exit={{
                  opacity: 0.5,
                }}
                style={[directionRow, alignItemsCenter]}
              >
                {!isOverflow ? (
                  <Text>
                    {i > 0 ? <Text> • </Text> : null}
                    {subthoughts && <Link simplePath={subthoughts} label={label} />}
                    {subthoughts && <Superscript simplePath={subthoughts} />}
                  </Text>
                ) : (
                  <Text>
                    <Text> • </Text>
                    <Text onPress={() => setEllipsize(false)}> ... </Text>
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export default ContextBreadcrumbs
