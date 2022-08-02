import { View } from 'moti'
import React from 'react'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import { fadeIn } from '../style/animations'
import { commonStyles } from '../style/commonStyles'
import isRoot from '../util/isRoot'
import useEllipsizedThoughts from './ContextBreadcrumbs.useEllipsizedThoughts'
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
  // renders an invisible ContextBreadcrumbs
  // useful for ThoughtAnnotation spacing
  hidden?: boolean
}

const { from, animate } = fadeIn
const { flexWrap, directionRow, flexGrow, alignItemsCenter } = commonStyles

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({
  hidden,
  homeContext,
  simplePath,
  thoughtsLimit,
  charLimit,
  classNamesObject,
}: ContextBreadcrumbProps) => {
  const [disabled, setDisabled] = React.useState(false)
  const ellipsizedThoughts = useEllipsizedThoughts(simplePath, { charLimit, disabled, thoughtsLimit })

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
          {ellipsizedThoughts.map(({ isOverflow, id, label }, i) => {
            const ancestor = simplePath.slice(0, i + 1) as SimplePath

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
                    <Link simplePath={ancestor} label={label} />
                    <Superscript simplePath={ancestor} />
                  </Text>
                ) : (
                  <Text>
                    <Text> • </Text>
                    <Text onPress={() => setDisabled(true)}> ... </Text>
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
