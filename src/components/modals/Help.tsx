import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { Tab } from '../../@types/Tab'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { tutorialStepActionCreator as setTutorialStep } from '../../actions/tutorialStep'
import { TUTORIAL2_STEP_START, TUTORIAL_STEP_START, TUTORIAL_STEP_SUCCESS } from '../../constants'
import getSetting from '../../selectors/getSetting'
import haptics from '../../util/haptics'
import Tabs from '../Tabs'
import ActionButton from './../ActionButton'
import CommandTable from './../CommandTable'
import ModalComponent from './ModalComponent'

enum Section {
  About = 'About',
  CommandLibrary = 'CommandLibrary',
  Menu = 'Menu',
  Metaprogramming = 'Metaprogramming',
  Tutorials = 'Tutorials',
}

/** Tutorials section. */
const Tutorials = () => {
  const dispatch = useDispatch()
  const tutorialStep = useSelector(state => +(getSetting(state, 'Tutorial Step') || 1))

  return (
    <section className={css({ marginBottom: '50px', paddingTop: '1em' })} id='tutorials'>
      <div
        className={css({
          textAlign: 'center',
          '@media screen and (min-width: 480px)': {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
          alignItems: 'flex-start',
        })}
      >
        <div className={css({ marginTop: '1em', marginBottom: '1em', marginRight: '1em' })}>
          <ActionButton
            title='Part I: Intro'
            onClick={() =>
              dispatch([
                tutorial({ value: true }),
                // allow resume
                // TODO: Allow resume for both tutorials
                setTutorialStep({ value: tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : tutorialStep }),
                closeModal(),
              ])
            }
            role='button'
            onTouchEnd={haptics.light}
          ></ActionButton>
        </div>
        <div className={css({ marginTop: '1em', marginBottom: '1em' })}>
          <ActionButton
            title='Part II: Contexts'
            onClick={() =>
              dispatch([
                tutorial({ value: true }),
                // allow resume
                setTutorialStep({ value: tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : tutorialStep }),
                closeModal(),
              ])
            }
          />
        </div>
      </div>
    </section>
  )
}

/** A help section to view all gestures, commands, and toolbar buttons. */
const CommandCenter = () => <CommandTable />

/** List the valid values for a metaprogramming attribute. */
const Options = ({ options }: { options: string[] }) => (
  <div className={css({ color: 'dim', fontSize: 'sm', marginBottom: '0.5em' })}>
    <b>Options</b>: {options.join(', ')}
  </div>
)

/** A help section that lists all metaprogramming attributes. */
const Metaprogramming = () => {
  return (
    <div className={css({ paddingTop: '1em' })}>
      <p className={css({ color: 'dim', marginBottom: '2em' })}>
        <i>Metaprogramming attributes</i> are hidden thoughts with superpowers. Customize the appearance and behavior of
        thoughts, define style templates, and more.
      </p>

      <code>=bullets</code>
      <p>
        <Options options={['Bullets', 'None']} />
        Hide the bullets of a context. For a less bullety look.
      </p>

      <code>=children</code>
      <p>
        <Options options={['=bullet', '=pin', '=style']} />
        Applies a meta attribute to all children of a thought.
      </p>

      <code>=drop</code>
      <p>
        <Options options={['top', 'bottom']} />
        Controls where in a context an item is placed after drag-and-drop. Default: bottom.
      </p>

      {/* <code>=focus</code>
      <p>
        <Options options={['Normal', 'Zoom']} />
        When the cursor is on this thought, hide its parent and siblings for additional focus. Excellent for study time
        or when you have had too much coffee.
      </p> */}

      <code>=hidden</code>
      <p>Hide the thought.</p>

      <code>=immovable</code>
      <p>The thought cannot be moved. Not very useful.</p>

      <code>=label</code>
      <p>
        Display alternative text for a thought, but continue using the real text when linking contexts and sorting. The
        real text is hidden unless editing.
      </p>

      <code>=note</code>
      <p>Display a note in smaller text underneath the thought. How pretty.</p>

      <code>=options</code>
      <p>A list of allowed subthoughts. Constraint is the mother of creativity?</p>

      <code>=pin</code>
      <p>Keep a thought expanded, forever. Or at least until you unpin it.</p>

      {/* <code>=publish</code>
      <p>Specify meta data for publishing the context as an article.</p>
      <ul>
        <li>
          <code>Byline</code>
          <p>A small byline of one or more lines to be displayed under the title.</p>
        </li>
        <li>
          <code>Email</code>
          <p>
            A gravatar email to display as a small avatar next to the Byline. Something professional, or perhaps
            something sexy?
          </p>
        </li>
        <li>
          <code>Title</code>
          <p>Override the title of the article when exported.</p>
        </li>
      </ul> */}

      <code>=readonly</code>
      <p>The thought cannot be edited, moved, or extended. Excellent for frustrating oneself.</p>

      {/* <code>=src</code>
      <p>Import thoughts from a given URL. Accepts plaintext, markdown, and HTML. Very buggy, trust me.</p> */}

      <code>=style</code>
      <p>
        Set CSS styles on the thought. You can set a style on all children or grandchildren with =children/=style or
        =grandchildren/=style, respectively.
      </p>

      <code>=uneditable</code>
      <p>The thought cannot be edited. How depressing.</p>

      <code>=unextendable</code>
      <p>New subthoughts may not be added to the thought.</p>

      {/* <code>=view</code>
      <p>
        <Options options={['Article', 'List', 'Table', 'Prose']} />
        Controls how the thought and its subthoughts are displayed. Use "Table" to create two columns, and "Prose" for
        longform writing. Default: List.
      </p> */}
    </div>
  )
}

/** List the credits for em and copyrighted assets. */
const About = () => {
  return (
    <div>
      {' '}
      <div className={css({ fontSize: 'sm', marginTop: '2em', fontStyle: 'italic', opacity: 0.7 })}>
        <div>
          Context View icon by{' '}
          <a href='https://thenounproject.com/travisavery/collection/connection-power/?i=2184164'>Travis Avery</a> from
          the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Export icon by{' '}
          <a href='https://www.flaticon.com/authors/those-icons' title='Those Icons'>
            Those Icons
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            www.flaticon.com
          </a>
        </div>
        <div>
          Export icon by <a href='https://thenounproject.com/tgtdesign18'>Mahesh Keshvala</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Feedback icon by <a href='https://thenounproject.com/deanmtam'>Dean Mocha</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Hidden Thoughts icon by <a href='https://thenounproject.com/search/?q=show%20hidden&i=1791510'>Joyce Lau</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Indent icons by{' '}
          <a href='https://www.flaticon.com/authors/bqlqn' title='bqlqn'>
            bqlqn
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            flaticon.com
          </a>
        </div>
        <div>
          Note icon by <a href='https://thenounproject.com/iconsphere/collection/populars/?i=2321491'>iconsphere</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Pin icon by <a href='https://thenounproject.com/search/?q=%22pin%20many%22&i=496735'>Hea Poh Lin</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Prose View icon by <a href='https://thenounproject.com/coquet_adrien'>Adrien Coquet</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Search icon by <a href='https://icons8.com/icon/7695/search'>Icons8</a>
        </div>
        <div>
          Categorize icons by <a href='https://thenounproject.com/term/circuit/1685927/'>Hare Krishna</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Table icon by{' '}
          <a href='https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107'>icon 54</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Undo and Redo Icons by{' '}
          <a href='https://www.flaticon.com/authors/pixel-perfect' title='Pixel perfect'>
            Pixel perfect
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            {' '}
            www.flaticon.com
          </a>
        </div>
        <div>
          Share icon by <a href='https://thenounproject.com/term/share/1058861/'>Тимур Минвалеев</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Settings icon by <a href='https://thenounproject.com/icon/settings-5241749/'>Parisa Qolbi</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Gift icon by <a href='https://thenounproject.com/search/?q=gift&i=2221484'> Sarote Impheng</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Copy to clipboard icon by{' '}
          <a href='https://thenounproject.com/search/?q=copy+to+clipboard&i=1669410'>Hare Krishna</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Checkmark icon by <a href='https://thenounproject.com/search/?q=checkmark&i=870288'>arif fajar yulianto</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Delete icon by <a href='https://thenounproject.com/icon/trash-1371974/'>Clea Doltz</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Gesture icon by <a href='https://thenounproject.com/icon/gesture-2211316/'>Adrien Coquet</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Download icon by <a href='https://thenounproject.com/icon/download-1000840/'>DinosoftLab</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Command Center icon by <a href='https://thenounproject.com/icon/one-finger-touch-68664/'>iconsmind.com</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Teach icon by <a href='https://thenounproject.com/icon/teach-4200138/'>Alzam</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Metaprogramming icon by <a href='https://thenounproject.com/icon/inspect-element-4199164/'>Ary Prasetyo</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Strikethrough icon by <a href='https://thenounproject.com/icon/strikethrough-1107500/'>Ary Prasetyo</a> from
          the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Check icon by <a href='https://thenounproject.com/icon/check-3669824/'>Media Creative</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Email icon by <a href='https://thenounproject.com/icon/email-1560074/'>il Capitano</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
      </div>
    </div>
  )
}

/** A modal that offers links to the tutorial, a list of commands, and other helpful things. */
const ModalHelp = () => {
  const [section, setSection] = useState(Section.CommandLibrary)
  const fontSize = useSelector(state => state.fontSize)
  const showDot = useSelector(state => !state.storageCache?.tutorialComplete)
  const tabs: Tab<Section>[] = useMemo(
    () => [
      {
        value: Section.CommandLibrary,
        label: 'Command Library',
        content: <CommandCenter />,
      },
      {
        value: Section.Tutorials,
        label: 'Tutorials',
        showDot,
        content: <Tutorials />,
      },
      {
        value: Section.Metaprogramming,
        label: 'Meta',
        content: <Metaprogramming />,
      },
      {
        value: Section.About,
        label: 'About',
        content: <About />,
      },
    ],
    [showDot],
  )

  return (
    <ModalComponent
      id='help'
      title='Help'
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
      style={{ fontSize }}
    >
      <Tabs currentTab={section} onTabChange={setSection} tabs={tabs} />
    </ModalComponent>
  )
}

export default ModalHelp
