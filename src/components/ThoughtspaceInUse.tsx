import { css, cx } from '../../styled-system/css'
import { anchorButtonRecipe } from '../../styled-system/recipes'
import type { ThoughtspaceAccessBlockedReason } from '../data-providers/thoughtspace'
import fastClick from '../util/fastClick'

/** Bootstrap screen shown when the active thoughtspace cannot be opened safely in this tab. */
const ThoughtspaceInUse = ({ reason }: { reason: ThoughtspaceAccessBlockedReason }) => (
  <main
    aria-label='thoughtspace-in-use'
    className={css({
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: 30,
      textAlign: 'center',
    })}
  >
    <div className={css({ maxWidth: 520 })}>
      <h1>{reason === 'already-open' ? 'em is already open' : 'em cannot safely open this thoughtspace'}</h1>
      <p>
        {reason === 'already-open'
          ? 'To protect your local data, em currently supports one tab per thoughtspace. Close the other tab, then retry.'
          : 'This browser does not support the storage coordination required to protect your local data.'}
      </p>
      <button
        aria-label='retry-thoughtspace'
        className={cx(anchorButtonRecipe(), css({ display: 'inline-block', marginTop: 15, minWidth: 0 }))}
        type='button'
        {...fastClick(() => window.location.reload())}
      >
        Retry
      </button>
    </div>
  </main>
)

export default ThoughtspaceInUse
