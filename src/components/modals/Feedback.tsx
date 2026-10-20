import { Capacitor } from '@capacitor/core'
import { isTauri } from '@tauri-apps/api/core'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import pkg from '../../../package.json'
import FeedbackPayload from '../../../packages/feedback/shared/FeedbackPayload'
import feedbackConfig from '../../../packages/feedback/shared/feedbackConfig'
import { css } from '../../../styled-system/css'
import { anchorButtonRecipe } from '../../../styled-system/recipes'
import { alertActionCreator as alert } from '../../actions/alert'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import replicateTree from '../../data-providers/data-helpers/replicateTree'
import { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import documentSort from '../../selectors/documentSort'
import exportContext from '../../selectors/exportContext'
import hasMulticursor from '../../selectors/hasMulticursor'
import simplifyPath from '../../selectors/simplifyPath'
import storageModel from '../../stores/storageModel'
import viewportStore from '../../stores/viewportStore'
import debugLog from '../../util/debugLog'
import head from '../../util/head'
import CircleButton from '../dialog/CircleButton'
import Dialog from '../dialog/Dialog'
import DialogContent from '../dialog/DialogContent'

/** A feedback form with explicit previews for optional private data. */
const Feedback = () => {
  const dispatch = useDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const busyRef = useRef(false)
  const attemptRef = useRef<{ id: string; token: string; key: string } | null>(null)
  const hasSelection = useSelector(state => !!state.cursor || hasMulticursor(state))
  const [name, setName] = useState(() => {
    try {
      return storageModel.get('feedbackName')
    } catch {
      return ''
    }
  })
  const [email, setEmail] = useState(() => {
    try {
      return storageModel.get('feedbackEmail')
    } catch {
      return ''
    }
  })
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [includeThoughts, setIncludeThoughts] = useState(false)
  const [thoughts, setThoughts] = useState<string | null>(null)
  const [log, setLog] = useState<string | null>(null)
  const [includeResolution, setIncludeResolution] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /** Discards the draft while retaining the separately persisted identity fields. */
  const close = useCallback(() => {
    if (!busyRef.current) dispatch(closeModal())
  }, [dispatch])

  useEffect(() => {
    messageRef.current?.focus()
    /** Keeps Escape and Tab within the dialog instead of triggering editor commands. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
      }
      if (event.key !== 'Tab') return
      const controls = formRef.current?.querySelectorAll<HTMLElement>(
        'input:not(:disabled),textarea:not(:disabled),button:not(:disabled),summary',
      )
      if (!controls?.length) {
        event.preventDefault()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [close])

  useEffect(() => {
    if (!includeThoughts) {
      setThoughts(null)
      return
    }
    let cancelled = false
    setThoughts(null)
    const started = dispatch(async (_dispatch, getState) => {
      const state = getState()
      const paths = documentSort(
        state,
        (hasMulticursor(state) ? Object.values(state.multicursors) : state.cursor ? [state.cursor] : []).map(path =>
          simplifyPath(state, path),
        ),
      ).filter(
        (path, index, paths) =>
          !paths
            .slice(0, index)
            .some(parent => parent.length <= path.length && parent.every((id, i) => id === path[i])),
      )
      await thoughtspaceRuntime.waitForIdle()
      if (cancelled) return null
      return { state, paths, replications: paths.map(path => replicateTree(head(path), { remote: false })) }
    })
    void started
      .then(async result => {
        if (!result) return
        const indices = await Promise.all(result.replications.map(replication => replication.promise))
        if (cancelled) return
        const state = {
          ...result.state,
          thoughts: {
            ...result.state.thoughts,
            thoughtIndex: Object.assign({}, result.state.thoughts.thoughtIndex, ...indices),
          },
        }
        const outline = result.paths.map(path => exportContext(state, head(path), 'text/plain')).join('\n')
        if (outline.length > feedbackConfig.maxTextAttachmentLength)
          throw new Error('Selected thoughts are too large to attach. Please select a smaller subtree.')
        setThoughts(outline)
      })
      .catch(error => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Could not export selected thoughts')
          setIncludeThoughts(false)
        }
      })
    return () => {
      cancelled = true
      void started.then(result => result?.replications.forEach(replication => replication.cancel())).catch(() => {})
    }
  }, [dispatch, includeThoughts])

  // An unchanged retry reuses its submission id and immutable upload paths.
  useEffect(() => {
    attemptRef.current = null
  }, [name, email, message, files, thoughts, log, includeResolution])

  /** Saves optional identity locally without making storage availability a submission requirement. */
  const changeIdentity = (key: 'feedbackName' | 'feedbackEmail', value: string) => {
    if (key === 'feedbackName') setName(value)
    else setEmail(value)
    try {
      if (value) storageModel.set(key, value)
      else storageModel.remove(key)
    } catch {
      /* Storage restrictions must not prevent feedback. */
    }
  }

  /** Validates the combined selection before accepting new files. */
  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming]
    const invalid = next.find(
      file => typeof feedbackConfig.fileTypes[file.name.split('.').pop()!.toLowerCase()] !== 'string',
    )
    const message = invalid
      ? 'Choose an image, text/log, JSON, or PDF file.'
      : next.length > feedbackConfig.maxFiles
        ? 'Attach up to 5 files.'
        : next.some(file => !file.size || file.size > feedbackConfig.maxFileSize)
          ? 'Each file must be non-empty and at most 10 MB.'
          : next.reduce((sum, file) => sum + file.size, 0) > feedbackConfig.maxTotalSize
            ? 'Attachments must be at most 25 MB combined.'
            : null
    setError(message)
    if (!message) setFiles(next)
  }

  /** Captures a reviewable log without enabling logging, adding a state dump, or including the page URL header. */
  const toggleLog = () => {
    if (log !== null) {
      setLog(null)
      return
    }
    const text = debugLog.format().replace(/^--- url:.*\n?/m, '')
    if (text.length > feedbackConfig.maxTextAttachmentLength) {
      setError('The debug log is too large to attach. Download it from Settings and attach a shorter excerpt.')
      return
    }
    setLog(text)
  }

  /** Sends the draft and verified private uploads, preserving them on failure. */
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busyRef.current || (includeThoughts && thoughts === null)) return
    const url = import.meta.env.VITE_FEEDBACK_URL?.replace(/\/$/, '')
    if (!url) {
      setError('Feedback is not configured in this build.')
      return
    }
    if (!message.trim()) {
      setError('Please enter a message.')
      return
    }
    busyRef.current = true
    setIsSubmitting(true)
    setError(null)
    const { innerWidth, innerHeight } = viewportStore.getState()
    const payload: FeedbackPayload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      ...(includeThoughts && thoughts !== null ? { thoughts } : {}),
      ...(log !== null ? { debugLog: log } : {}),
      metadata: {
        version: pkg.version,
        commit: __COMMIT_HASH__,
        userAgent: navigator.userAgent,
        platform: isTauri() ? 'tauri' : Capacitor.getPlatform(),
        ...(includeResolution
          ? { resolution: { width: innerWidth, height: innerHeight, pixelRatio: window.devicePixelRatio } }
          : {}),
      },
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        contentType: feedbackConfig.fileTypes[file.name.split('.').pop()!.toLowerCase()],
      })),
    }
    const key = JSON.stringify(payload)
    const attempt =
      attemptRef.current?.key === key
        ? attemptRef.current
        : { id: crypto.randomUUID(), token: crypto.randomUUID(), key }
    attemptRef.current = attempt
    /** Sends JSON and preserves useful validation and rate-limit errors. */
    const request = async (path: string, body: unknown) => {
      const response = await fetch(`${url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        if (response.status === 410) attemptRef.current = null
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? 'Could not send feedback. Please try again.')
      }
      return response.json()
    }
    try {
      const reservation = (await request('', { id: attempt.id, token: attempt.token, payload })) as {
        submitted: boolean
        files: { pathname: string; uploaded: boolean }[]
      }
      if (!reservation.submitted) {
        if (files.length) {
          const { upload } = await import('@vercel/blob/client')
          for (const [index, file] of files.entries()) {
            if (reservation.files[index].uploaded) continue
            await upload(reservation.files[index].pathname, file, {
              access: 'private',
              handleUploadUrl: `${url}/upload`,
              contentType: payload.files[index].contentType,
              clientPayload: JSON.stringify({ id: attempt.id, token: attempt.token, index }),
            })
          }
        }
        await request(`/${attempt.id}/complete`, { token: attempt.token })
      }
      dispatch([alert('Feedback sent. Thank you!'), closeModal()])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not send feedback. Please try again.')
    } finally {
      busyRef.current = false
      setIsSubmitting(false)
    }
  }

  const inputClass = css({
    width: '100%',
    minWidth: 0,
    height: 'auto',
    margin: 0,
    boxSizing: 'border-box',
    background: 'bgOverlay30',
    color: 'fg',
    border: '1px solid {colors.dim}',
    borderRadius: '8px',
    padding: '0.6em',
    fontFamily: 'inherit',
    fontSize: '1rem',
  })
  const previewClass = css({
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    maxHeight: '12em',
    overflowY: 'auto',
    fontSize: '0.8rem',
    padding: '0.5em',
    border: '1px solid {colors.dim}',
    borderRadius: '8px',
  })

  return (
    <Dialog nodeRef={nodeRef} onClose={close}>
      <form
        ref={formRef}
        onSubmit={submit}
        role='dialog'
        aria-modal='true'
        aria-labelledby='feedback-title'
        aria-busy={isSubmitting}
        className={css({ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '80dvh' })}
      >
        <div
          className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' })}
        >
          <h2
            id='feedback-title'
            className={css({ margin: 0, fontSize: '1.25rem', fontWeight: 400, borderBottom: 'none' })}
          >
            Send Feedback
          </h2>
          <CircleButton ariaLabel='Close feedback' onClick={close} disabled={isSubmitting}>
            ✕
          </CircleButton>
        </div>
        <DialogContent scrollRef={scrollRef}>
          <p className={css({ fontSize: '1rem', color: 'dim', marginTop: 0 })}>Send us your bugs, hopes, and dreams.</p>
          <fieldset
            disabled={isSubmitting}
            className={css({
              border: 'none',
              padding: 0,
              margin: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              fontSize: '1rem',
            })}
          >
            <label>
              Name (optional)
              <input
                className={inputClass}
                autoComplete='name'
                maxLength={200}
                value={name}
                onChange={event => changeIdentity('feedbackName', event.target.value)}
              />
            </label>
            <label>
              Email (optional)
              <input
                className={inputClass}
                type='email'
                autoComplete='email'
                maxLength={254}
                value={email}
                onChange={event => changeIdentity('feedbackEmail', event.target.value)}
              />
            </label>
            <p className={css({ margin: 0, color: 'dim', fontSize: '0.85rem' })}>
              Name and email are remembered on this device. Clear either field to forget it.
            </p>
            <label>
              Message
              <textarea
                ref={messageRef}
                className={inputClass}
                required
                rows={4}
                maxLength={feedbackConfig.maxMessageLength}
                value={message}
                onChange={event => setMessage(event.target.value)}
              />
            </label>
            <label>
              Attachments (optional)
              <input
                type='file'
                multiple
                aria-label='Add attachments'
                accept={Object.keys(feedbackConfig.fileTypes)
                  .map(extension => `.${extension}`)
                  .join(',')}
                className={css({ display: 'block', width: '100%', marginTop: '0.5em' })}
                onChange={event => {
                  addFiles(Array.from(event.target.files ?? []))
                  event.target.value = ''
                }}
              />
            </label>
            <p className={css({ margin: 0, color: 'dim', fontSize: '0.85rem' })}>
              Images, text/logs, JSON, or PDF. Up to 5 files, 10 MB each, 25 MB total.
            </p>
            {files.length > 0 && (
              <ul className={css({ margin: 0, paddingLeft: '1em' })}>
                {files.map((file, index) => (
                  <li key={index}>
                    {file.name}{' '}
                    <button
                      type='button'
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label>
              <input
                type='checkbox'
                checked={includeThoughts}
                disabled={!hasSelection || isSubmitting}
                onChange={event => setIncludeThoughts(event.target.checked)}
              />{' '}
              Attach my current selection
            </label>
            {includeThoughts && (
              <div>
                <p>
                  Includes selected thoughts and all descendants, including notes, hidden attributes, and archived
                  thoughts.
                </p>
                {thoughts === null ? (
                  <p role='status'>Preparing selected thoughts…</p>
                ) : (
                  <pre aria-label='Selected thoughts preview' className={previewClass}>
                    {thoughts}
                  </pre>
                )}
              </div>
            )}
            <label>
              <input
                type='checkbox'
                checked={includeResolution}
                onChange={event => setIncludeResolution(event.target.checked)}
              />{' '}
              Include display resolution
            </label>
            <label>
              <input type='checkbox' checked={log !== null} onChange={toggleLog} /> Attach debug log
            </label>
            {log !== null && (
              <div>
                <p>
                  The log may contain thought text and device details. Review it before sending. The full thoughtspace
                  dump and page URL header are omitted.
                </p>
                <pre aria-label='Debug log preview' className={previewClass}>
                  {log}
                </pre>
              </div>
            )}
            <p className={css({ margin: 0, color: 'dim', fontSize: '0.85rem' })}>
              Feedback is shared privately with the em team and includes the app version, build, browser, and platform.
            </p>
          </fieldset>
          {error && <p role='alert'>{error}</p>}
          <div className={css({ display: 'flex', gap: '0.5em', justifyContent: 'center', paddingBlock: '1rem' })}>
            <button
              type='button'
              className={anchorButtonRecipe({ actionButton: true, thin: true })}
              disabled={isSubmitting}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={anchorButtonRecipe({ actionButton: true, thin: true })}
              disabled={isSubmitting || (includeThoughts && thoughts === null)}
            >
              {isSubmitting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </DialogContent>
      </form>
    </Dialog>
  )
}

export default Feedback
