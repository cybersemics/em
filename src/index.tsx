// This import must come first so the console proxy installs before any other module body runs and captures all subsequent logs.
import './util/consoleProxy'
import { createRoot } from 'react-dom/client'
import { css } from '../styled-system/css'
import App from './components/App'
import ThoughtspaceInUse from './components/ThoughtspaceInUse'
import { thoughtspaceRuntime } from './data-providers/thoughtspace'
import testFlags from './e2e/testFlags'
import './index.css'
import { initialize, waitForInitialized } from './initialize'
import { register } from './serviceWorkerRegistration'

const container = document.getElementById('root')
const root = createRoot(container!)

/** Acquires thoughtspace access before initializing or rendering the interactive app. */
const bootstrap = async (): Promise<void> => {
  root.render(
    <main role='status' aria-label='thoughtspace-startup' className={css({ margin: 50, textAlign: 'center' })}>
      Opening your thoughtspace…
    </main>,
  )
  const access = await thoughtspaceRuntime.acquireAccess()

  if (access.status === 'blocked') {
    root.render(<ThoughtspaceInUse reason={access.reason} />)
    return
  }

  if (!testFlags.preventInitialize) {
    await initialize({ storage: testFlags.thoughtspaceStorage ?? 'persistent' })
  } else {
    // Delayed-startup tests release the same readiness gate by invoking their initialization hook.
    await waitForInitialized()
  }

  root.render(<App />)
}

void bootstrap().catch(error => {
  console.error('Thoughtspace initialization failed', error)
  root.render(
    <main role='alert' aria-label='thoughtspace-startup-error' className={css({ margin: 50, textAlign: 'center' })}>
      <h1>em could not open this thoughtspace</h1>
      <p>The editor is unavailable until initialization succeeds. Reload to try again.</p>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button type='button' onClick={() => window.location.reload()}>
        Reload
      </button>
    </main>,
  )
})
register()
