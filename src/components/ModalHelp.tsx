import React, { useState } from 'react'
import { connect } from 'react-redux'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts'
import * as db from '../data-providers/dexie'
import { makeCompareByProp, sort } from '../util'
import { closeModal, toggleShortcutsDiagram, tutorial, tutorialStep as setTutorialStep } from '../action-creators'
import { getSetting } from '../selectors'
import { TUTORIAL2_STEP_START, TUTORIAL_STEP_START, TUTORIAL_STEP_SUCCESS } from '../constants'
import { Connected, GesturePath, Shortcut, State } from '../@types'

// components
import GestureDiagram from './GestureDiagram'
import Logs from './Logs'
import Modal from './Modal'
import { ActionButton } from './ActionButton'
import tw, { styled } from 'twin.macro'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { showQueue, enableLatestShorcutsDiagram } = state
  return {
    showQueue,
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
    enableLatestShorcutsDiagram,
  }
}

/** Renders all of a shortcut's details as a table row. */
const ShortcutRows = (shortcut: Shortcut, i: number) => (
  <tr key={i}>
    <th>
      <b>{shortcut.label}</b>
      <p>{shortcut.description}</p>
    </th>
    <td>
      {isTouch && shortcut.gesture ? (
        // GesturePath[]
        <GestureDiagram path={shortcut.gesture as GesturePath} size={48} />
      ) : shortcut.keyboard ? (
        formatKeyboardShortcut(shortcut.keyboard)
      ) : null}
    </td>
  </tr>
)

/** Renders a table of shortcuts. */
const ShortcutTable = () => {
  // filter out shortcuts that do not exist on the current platform
  const shortcuts = sort(globalShortcuts, makeCompareByProp('name')).filter(
    shortcut => !shortcut.hideFromInstructions && (isTouch ? shortcut.gesture : shortcut.keyboard),
  )

  return (
    <table className='shortcuts'>
      <tbody>{shortcuts.map(ShortcutRows)}</tbody>
    </table>
  )
}

const ModalActionsContainer = tw.div`
  flex justify-center items-center
  space-x-2.5
`

const ModalHelpContainer = styled.section`
  ${tw`mb-5`}
`

const ModalSubtitle = styled.h2<{ compact?: boolean }>`
  ${tw`
    text-2xl
    font-light
  `};

  ${props =>
    props.compact
      ? tw`
          space-y-3.5
        `
      : tw`space-y-6`}
`

const Code = tw.code`
    bg-gray-200 dark:bg-gray-700
`

const ModalProse = styled.div`
  p {
    ${tw`mb-2.5 text-sm`}
  }
`

const CreditLink = styled.a`
  ${tw`underline text-blue-300 text-opacity-70 italic`}
`

const MiscLink = styled.a`
  ${tw`underline text-blue-300`}
`

/** A modal that offers links to the tutorial, a list of shortcuts, and other helpful things. */
const ModalHelp = ({
  tutorialStep,
  showQueue,
  dispatch,
  enableLatestShorcutsDiagram,
}: Connected<ReturnType<typeof mapStateToProps>>) => {
  const [logs, setLogs] = useState<db.Log[] | null>(null)

  /** Toogle shortcuts diagram settings. */
  const toggleShortcutsDiagramSetting = () => dispatch(toggleShortcutsDiagram())

  /** Toggles the logs. Loads the logs if they have not been loaded yet. */
  const toggleLogs = async () => setLogs(logs ? null : await db.getLogs())

  /** Refreshes the page without using cache. */
  const refresh = () => {
    window.location = window.location // eslint-disable-line no-self-assign
  }

  return (
    <Modal
      id='help'
      title='Help'
      actions={({ close }) => <ActionButton onClick={() => close()} key='close' title='Close' />}
    >
      <ModalProse>
        <ModalHelpContainer>
          <ModalSubtitle>Tutorials</ModalSubtitle>
          <ModalActionsContainer>
            <ActionButton
              title='Part I: Intro'
              onClick={() => {
                dispatch([
                  tutorial({ value: true }),
                  // allow resume
                  // TODO: Allow resume for both tutorials
                  setTutorialStep({ value: tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : tutorialStep }),
                  closeModal(),
                ])
              }}
            ></ActionButton>
            <ActionButton
              title='Part II: Contexts'
              className='button'
              onClick={() => {
                dispatch([
                  tutorial({ value: true }),
                  // allow resume
                  setTutorialStep({ value: tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : tutorialStep }),
                  closeModal(),
                ])
              }}
            ></ActionButton>
          </ModalActionsContainer>
        </ModalHelpContainer>
        <div css={tw`mt-16`}></div>
        <ModalSubtitle compact>{isTouch ? 'Gesture' : 'Keyboard'} Shortcuts </ModalSubtitle>
        <ShortcutTable />
        <ModalSubtitle compact>Metaprogramming</ModalSubtitle>
        <Code>=bullets</Code>
        <p>
          Options: Bullets, None
          <br />
          Hide the bullets of a context. For a less bullety look.
        </p>

        <Code>=drop</Code>
        <p>
          Options: top, bottom
          <br />
          Controls where in a context an item is placed after drag-and-drop. Default: bottom.
        </p>

        <Code>=focus</Code>
        <p>
          Options: Normal, Zoom
          <br />
          When the cursor is on this thought, hide its parent and siblings for additional focus. Excellent for study
          time or when you have had too much coffee.
        </p>

        <Code>=hidden</Code>
        <p>Hide the thought.</p>

        <Code>=immovable</Code>
        <p>The thought cannot be moved. Not very useful.</p>

        <Code>=label</Code>
        <p>
          Display alternative text for a thought, but continue using the real text when linking contexts and sorting.
          The real text is hidden unless editing. Useful for nuisance words like "The", "A", and "Chrysanthemum".
        </p>

        <Code>=note</Code>
        <p>Display a note in smaller text underneath the thought. How pretty.</p>

        <Code>=options</Code>
        <p>A list of allowed subthoughts. We all have times when we need to be strict.</p>

        <Code>=pin</Code>
        <p>Keep a thought expanded, forever. Or at least until you unpin it.</p>

        <Code>=pinChildren</Code>
        <p>
          Options: true, false
          <br />
          Keep all of a thought's subthoughts expanded. A lot of pins.
        </p>

        <Code>=publish</Code>
        <p>Specify meta data for publishing the context as an article.</p>
        <ul>
          <li>
            <Code>Byline</Code>
            <p>A small byline of one or more lines to be displayed under the title.</p>
          </li>
          <li>
            <Code>Email</Code>
            <p>
              A gravatar email to display as a small avatar next to the Byline. Something professional, or perhaps
              something sexy?
            </p>
          </li>
          <li>
            <Code>Title</Code>
            <p>Override the title of the article when exported.</p>
          </li>
        </ul>

        <Code>=readonly</Code>
        <p>The thought cannot be edited, moved, or extended. Excellent for frustrating oneself.</p>

        <Code>=src</Code>
        <p>Import thoughts from a given URL. Accepts plaintext, markdown, and HTML. Very buggy, trust me.</p>

        <Code>=style</Code>
        <p>
          Set CSS styles on the thought. You might also consider =styleContainer, =children/=style,
          =grandchildren/=style.
        </p>

        <Code>=uneditable</Code>
        <p>The thought cannot be edited. How depressing.</p>

        <Code>=unextendable</Code>
        <p>New subthoughts may not be added to the thought.</p>

        <Code>=view</Code>
        <p>
          Options: Article, List, Table, Prose
          <br />
          Controls how the thought and its subthoughts are displayed. Use "Table" to create two columns, and "Prose" for
          longform writing. Default: List.
        </p>
        <ModalSubtitle>Development Settings</ModalSubtitle>

        <form>
          <label onChange={toggleShortcutsDiagramSetting}>
            <input type='checkbox' checked={enableLatestShorcutsDiagram}></input> Enable gesture diagrams (touch screen){' '}
          </label>
        </form>

        <IconCreditSection>
          <div>
            Context View icon by{' '}
            <CreditLink href='https://thenounproject.com/travisavery/collection/connection-power/?i=2184164'>
              Travis Avery
            </CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Export icon by{' '}
            <CreditLink href='https://www.flaticon.com/authors/those-icons' title='Those Icons'>
              Those Icons
            </CreditLink>{' '}
            from{' '}
            <CreditLink href='https://www.flaticon.com/' title='Flaticon'>
              www.flaticon.com
            </CreditLink>
          </div>
          <div>
            Export icon by <CreditLink href='https://thenounproject.com/tgtdesign18'>Mahesh Keshvala</CreditLink> from
            the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Feedback icon by <CreditLink href='https://thenounproject.com/deanmtam'>Dean Mocha</CreditLink> from the{' '}
            <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Hidden Thoughts icon by{' '}
            <CreditLink href='https://thenounproject.com/search/?q=show%20hidden&i=1791510'>Joyce Lau</CreditLink> from
            the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Indent icons by{' '}
            <CreditLink href='https://www.flaticon.com/authors/bqlqn' title='bqlqn'>
              bqlqn
            </CreditLink>{' '}
            from{' '}
            <CreditLink href='https://www.flaticon.com/' title='Flaticon'>
              flaticon.com
            </CreditLink>
          </div>
          <div>
            Note icon by{' '}
            <CreditLink href='https://thenounproject.com/iconsphere/collection/populars/?i=2321491'>
              iconsphere
            </CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Pin icon by{' '}
            <CreditLink href='https://thenounproject.com/search/?q=%22pin%20many%22&i=496735'>Hea Poh Lin</CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Prose View icon by <CreditLink href='https://thenounproject.com/coquet_adrien'>Adrien Coquet</CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Search icon by <CreditLink href='https://icons8.com/icon/7695/search'>Icons8</CreditLink>
          </div>
          <div>
            Subcategorize icons by{' '}
            <CreditLink href='https://thenounproject.com/term/circuit/1685927/'>Hare Krishna</CreditLink> from the{' '}
            <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Table icon by{' '}
            <CreditLink href='https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107'>
              icon 54
            </CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Undo and Redo Icons by{' '}
            <CreditLink href='https://www.flaticon.com/authors/pixel-perfect' title='Pixel perfect'>
              Pixel perfect
            </CreditLink>{' '}
            from{' '}
            <CreditLink href='https://www.flaticon.com/' title='Flaticon'>
              {' '}
              www.flaticon.com
            </CreditLink>
          </div>
          <div>
            Share icon by <CreditLink href='https://thenounproject.com/term/share/1058861/'>Тимур Минвалеев</CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Gift icon by{' '}
            <CreditLink href='https://thenounproject.com/search/?q=gift&i=2221484'> Sarote Impheng</CreditLink> from the{' '}
            <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Copy to clipboard icon by{' '}
            <CreditLink href='https://thenounproject.com/search/?q=copy+to+clipboard&i=1669410'>
              Hare Krishna
            </CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
          <div>
            Checkmark icon by{' '}
            <CreditLink href='https://thenounproject.com/search/?q=checkmark&i=870288'>arif fajar yulianto</CreditLink>{' '}
            from the <CreditLink href='https://thenounproject.com'>Noun Project</CreditLink>
          </div>
        </IconCreditSection>

        <br />

        <p>
          <MiscLink tabIndex={-1} onClick={refresh}>
            Refresh
          </MiscLink>
          <br />
          <MiscLink tabIndex={-1} onClick={toggleLogs}>
            Logs
          </MiscLink>
          {logs && <Logs logs={logs ?? []} />}
        </p>
      </ModalProse>
    </Modal>
  )
}

const IconCreditSection = styled.div`
  ${tw`mt-8 text-xs italic text-gray-400`}
`
export default connect(mapStateToProps)(ModalHelp)
