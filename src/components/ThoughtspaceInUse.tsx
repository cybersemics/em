import { css, cx } from '../../styled-system/css'
import { anchorButtonRecipe } from '../../styled-system/recipes'
import type { TreecrdtSessionLockStatus } from '../data-providers/treecrdt/sessionLock'
import fastClick from '../util/fastClick'

/** Bootstrap screen shown when persistent TreeCRDT storage cannot be opened safely in this tab. */
const ThoughtspaceInUse = ({ status }: { status: Exclude<TreecrdtSessionLockStatus, 'acquired'> }) => (
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
      <h1>{status === 'unavailable' ? 'em is already open' : 'em cannot safely open this thoughtspace'}</h1>
      <p>
        {status === 'unavailable'
          ? 'To protect your local data, em currently supports one tab per thoughtspace. Close the other tab, then retry.'
          : 'This browser does not support the tab lock required to protect your local data.'}
      </p>
      <a
        aria-label='retry-thoughtspace'
        className={cx(anchorButtonRecipe(), css({ display: 'inline-block', marginTop: 15, minWidth: 0 }))}
        {...fastClick(() => window.location.reload())}
      >
        Retry
      </a>
    </div>
  </main>
)

export default ThoughtspaceInUse
