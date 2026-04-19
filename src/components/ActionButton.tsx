import React from 'react'
import { css, cx } from '../../styled-system/css'
import { anchorButtonRecipe } from '../../styled-system/recipes'
import type { AnchorButtonRecipeVariantProps } from '../../styled-system/recipes/anchor-button-recipe'
import fastClick from '../util/fastClick'
import haptics from '../util/haptics'
import Loader from './Loader'

interface ActionButtonProps {
  title: string
  onClick?: (e: React.MouseEvent) => void
  /** Render button with fg and bg colors inverted. */
  isLoading?: boolean
  isDisabled?: boolean
}

/**
 * Action Button with default thin variant. Used in Modals.
 */
const ActionButton = ({
  title,
  inActive,
  inverse,
  small,
  thin = true,
  isLoading,
  isDisabled,
  onClick,
  ...restProps
}: ActionButtonProps & AnchorButtonRecipeVariantProps & React.HTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a
      className={cx(
        anchorButtonRecipe({
          inActive,
          small,
          actionButton: true,
          thin,
          isDisabled,
          inverse,
        }),
        css({ lineHeight: 2, marginInline: 5, whiteSpace: 'nowrap', fontWeight: 'normal' }),
      )}
      {...(onClick && !isDisabled ? fastClick(onClick, { tapDown: haptics.medium }) : null)}
      {...restProps}
    >
      {/* TODO: Animate on loader toggle. */}
      {isLoading && <Loader size={35} cssRaw={css.raw({ marginRight: '15px' })} />}
      {title}
    </a>
  )
}

export default ActionButton
