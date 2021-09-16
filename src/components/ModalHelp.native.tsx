import React from 'react'
import { connect } from 'react-redux'
// import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts'
// import * as db from '../data-providers/dexie'
// import { makeCompareByProp, sort } from '../util'
import { closeModal, /* toggleShortcutsDiagram */ tutorial, tutorialStep as setTutorialStep } from '../action-creators'
import { getSetting } from '../selectors'
import { META_PROGRAMMING_HELP, TUTORIAL2_STEP_START, TUTORIAL_STEP_START, TUTORIAL_STEP_SUCCESS } from '../constants'
import { Connected /*  GesturePath, Shortcut */, State } from '../@types'

import * as WebBrowser from 'expo-web-browser'

// components
// import GestureDiagram from './GestureDiagram'
// import Logs from './Logs'
import Modal from './Modal'
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native'
import { ActionButton } from './ActionButton'
import { Text } from './Text.native'

interface IMetaprogramming {
  code: string
  description: string
  hasChildren?: boolean
  children?: { code: string; description: string }[]
}

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
// const ShortcutRows = (shortcut: Shortcut, i: number) => (
//   <tr key={i}>
//     <th>
//       <b>{shortcut.label}</b>
//       <p>{shortcut.description}</p>
//     </th>
//     <td>
//       {isTouch && shortcut.gesture ? (
//         // GesturePath[]
//         <GestureDiagram path={shortcut.gesture as GesturePath} size={48} />
//       ) : shortcut.keyboard ? (
//         formatKeyboardShortcut(shortcut.keyboard)
//       ) : null}
//     </td>
//   </tr>
// )

/** Renders a table of shortcuts. */
// const ShortcutTable = () => {
//   // filter out shortcuts that do not exist on the current platform
//   const shortcuts = sort(globalShortcuts, makeCompareByProp('name')).filter(
//     shortcut => !shortcut.hideFromInstructions && (isTouch ? shortcut.gesture : shortcut.keyboard),
//   )

//   return (
//     <table className='shortcuts'>
//       <tbody>{shortcuts.map(ShortcutRows)}</tbody>
//     </table>
//   )
// }

/** A modal that offers links to the tutorial, a list of shortcuts, and other helpful things. */
const ModalHelp = ({
  tutorialStep,
  showQueue,
  dispatch,
  enableLatestShorcutsDiagram,
}: Connected<ReturnType<typeof mapStateToProps>>) => {
  // const [logs, setLogs] = useState<db.Log[] | null>(null)

  /** Toogle shortcuts diagram settings. */
  // const toggleShortcutsDiagramSetting = () => dispatch(toggleShortcutsDiagram())

  /** Toggles the logs. Loads the logs if they have not been loaded yet. */
  // const toggleLogs = async () => setLogs(logs ? null : await db.getLogs())

  /** Refreshes the page without using cache. */
  /*   const refresh = () => {
    window.location = window.location // eslint-disable-line no-self-assign
  } */

  /** Refreshes the page without using cache. */
  const openLink = async (link: string) => {
    await WebBrowser.openBrowserAsync(link)
  }

  /** Render Metaprogramming children. */
  const renderMetaprogrammingChildren = (children: IMetaprogramming[]) => {
    return children.map(child => {
      const { code, description } = child
      return (
        <View key={code} style={styles.metaChildren}>
          <Text style={styles.code}>{`${code}`}</Text>
          <Text style={styles.codeDescription}>{description}</Text>
        </View>
      )
    })
  }

  return (
    <Modal
      id='help'
      title='Help'
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
    >
      <View>
        <View style={styles.dividerContainer}>
          <Text style={styles.dividerText}>Tutorials</Text>
        </View>

        <View>
          <TouchableOpacity
            style={styles.tutorialButton}
            onPress={() => {
              dispatch([
                tutorial({ value: true }),
                // allow resume
                // TODO: Allow resume for both tutorials
                setTutorialStep({ value: tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : tutorialStep }),
                closeModal(),
              ])
            }}
          >
            <Text style={styles.tutorialButtonText}>Part I: Intro</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tutorialButton}
            onPress={() => {
              dispatch([
                tutorial({ value: true }),
                setTutorialStep({ value: tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : tutorialStep }),
                closeModal(),
              ])
            }}
          >
            <Text style={styles.tutorialButtonText}>Part II: Contexts</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dividerContainer}>
        <Text style={styles.dividerText}>Shortcuts</Text>
      </View>
      {/*  <h2 className='modal-subtitle'>{isTouch ? 'Gesture' : 'Keyboard'} Shortcuts</h2>

      <ShortcutTable />
 */}

      <View style={styles.dividerContainer}>
        <Text style={styles.dividerText}>Metaprogramming</Text>
      </View>

      {META_PROGRAMMING_HELP.map(item => {
        const { code, description, hasChildren, children } = item

        return (
          <View key={code} style={styles.metaWrapper}>
            <Text style={styles.code}>{`=${code}`}</Text>
            <Text style={styles.codeDescription}>{description}</Text>
            {hasChildren ? renderMetaprogrammingChildren(children as IMetaprogramming[]) : null}
          </View>
        )
      })}

      <View style={styles.dividerContainer}>
        <Text style={styles.dividerText}>Development Settings</Text>
      </View>

      <View style={styles.iconProvidersWrapper}>
        <Text style={styles.devSettingsText}>
          Context View icon by
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/travisavery/collection/connection-power/?i=2184164')}
          >
            <Text style={styles.linkText}> Travis Avery</Text>
          </TouchableOpacity>
          from the
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Export icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://www.flaticon.com/authors/those-icons')}
          >
            <Text style={styles.linkText}> Those Icons </Text>
          </TouchableOpacity>
          from{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://www.flaticon.com/')}>
            <Text style={styles.linkText}> flaticon.com</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Export icon by{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com/tgtdesign18')}>
            <Text style={styles.linkText}> Mahesh Keshvala </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Feedback icon by{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com/deanmtam')}>
            <Text style={styles.linkText}> Dean Mocha </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Hidden Thoughts icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/search/?q=show%20hidden&i=1791510')}
          >
            <Text style={styles.linkText}> Joyce Lau</Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Indent icons by{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://www.flaticon.com/authors/bqlqn')}>
            <Text style={styles.linkText}> bqlqn </Text>
          </TouchableOpacity>
          from{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://www.flaticon.com/')}>
            <Text style={styles.linkText}> flaticon.com</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Note icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/iconsphere/collection/populars/?i=2321491')}
          >
            <Text style={styles.linkText}> iconsphere </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Pin icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/search/?q=%22pin%20many%22&i=496735')}
          >
            <Text style={styles.linkText}> Hea Poh Lin </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Prose View icon by{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com/coquet_adrien')}>
            <Text style={styles.linkText}> Adrien Coquet </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Search icon by{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://icons8.com/icon/7695/search')}>
            <Text style={styles.linkText}> Icons8 </Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Subcategorize icons icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/term/circuit/1685927/')}
          >
            <Text style={styles.linkText}> Hare Krishna </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Table icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107')}
          >
            <Text style={styles.linkText}> icon 54 </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Undo and Redo Icons by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://www.flaticon.com/authors/pixel-perfect')}
          >
            <Text style={styles.linkText}> Pixel perfect </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://www.flaticon.com/')}>
            <Text style={styles.linkText}> flaticon.com</Text>
          </TouchableOpacity>
        </Text>

        <Text style={styles.devSettingsText}>
          Share icon by{' '}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => openLink('https://thenounproject.com/term/share/1058861/')}
          >
            <Text style={styles.linkText}> Тимур Минвалеев </Text>
          </TouchableOpacity>
          from the{' '}
          <TouchableOpacity style={styles.linkBtn} onPress={() => openLink('https://thenounproject.com')}>
            <Text style={styles.linkText}> Noun Project</Text>
          </TouchableOpacity>
        </Text>
      </View>

      {/*  <p>
        <a tabIndex={-1} onClick={refresh}>
          Refresh
        </a>
        <br />
        <a tabIndex={-1} onClick={toggleLogs}>
          Logs
        </a>
        {logs && <Logs logs={logs ?? []} />}
      </p> */}
    </Modal>
  )
}

const styles = StyleSheet.create({
  tutorialButton: {
    backgroundColor: 'white',
    padding: 10,
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 10,
  },
  dividerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'white',
    paddingBottom: 10,
    marginVertical: 20,
  },
  dividerText: {
    color: 'white',
    fontSize: 6,
  },
  code: {
    color: '#e3e3e3',
    fontSize: 6,
    backgroundColor: '#333333',
    ...Platform.select({
      ios: {
        fontFamily: 'Courier',
      },
      android: {
        fontFamily: 'monospace',
      },
    }),
  },
  metaWrapper: { marginVertical: 10 },
  metaChildren: { marginVertical: 10, paddingLeft: 15 },
  codeDescription: { color: '#e3e3e3' },
  linkText: { fontStyle: 'italic', color: 'lightblue', fontSize: 1, textDecorationLine: 'underline' },
  devSettingsText: { color: 'white', fontStyle: 'italic', fontSize: 2 },
  linkBtn: { marginTop: -2 },
  iconProvidersWrapper: { opacity: 0.7 },
  tutorialButtonText: { fontSize: 6, color: '#000' },
})

export default connect(mapStateToProps)(ModalHelp)
