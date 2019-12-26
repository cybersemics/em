import React from 'react'
import SwipeableDrawer from '@bit/mui-org.material-ui.swipeable-drawer'
import { useSelector, useDispatch } from 'react-redux'
import { isMobile } from '../browser'
import { makeCompareByProp } from '../util'

/** This component returns ellipsized path such as A • B • ... • E
 *
 * thoughtsLimit is the max number of thoughts to be shown in path without ellipsized
 * for A/B/C/D/E/F
 * if thoughtsLimit=3 => A • B • ... • F
 * if thoughtsLimit=5 => A • B • C • D • ... • F
 * if thoughtsLimit=6 => A • B • C • D • E • F
 *
 * charLimit is the max number of character of a thought value that can be shown , if maxed out will be replaced by ..
 *
 *
 * if charLimit=7 and thoughtsLimit=5
 * path: To-do/Read/Encryption/keys/private/hash
 * it will give To-do • Read • Encrypti..•keys • ... • hash
*/
const EllipsizedPath = ({ rankedThoughts, charLimit, thoughtsLimit }) => {
  const overflow = rankedThoughts.length > thoughtsLimit ? (rankedThoughts.length - thoughtsLimit + 1) : 0

  /** if charLimit is exceeded then replace the remaining characters by .. */
  const charLimitedArray = rankedThoughts.map((thought) => {
    return (thought.value.length > charLimit) ? (thought.value.substr(0, charLimit) + '..') : thought.value
  })

  return (
    <div className="ellipsized-path" style={{ fontWeight: '100', fontSize: '0.95em', color: '#dedede' }}>
      {charLimitedArray.map((value, i) => {
        return (<span key={i}>{i === 0 ? null : '•'} {(overflow && (i >= (thoughtsLimit - 2) && i < overflow)) ? '...' : value} </span>)
      })}
    </div>
  )
}

const ThoughtsTab = ({ thoughtsRanked }) => {
  const dispatch = useDispatch()
  return (
    <div className="thoughts-tab" onClick={() => {
      dispatch({ type: 'toggleSidebar', value: false })
      dispatch({ type: 'setCursor', thoughtsRanked })
    }}
    >
      {/* Here charLimit and thoughtsLimit is provided based on mobile and desktop */}
      <EllipsizedPath rankedThoughts={thoughtsRanked} charLimit={isMobile ? 7 : 10} thoughtsLimit={isMobile ? 5 : 7} />
    </div>
  )
}

const RecentEdited = () => {
  const recentlyEdited = useSelector(state => (state.recentlyEdited))
  recentlyEdited.sort(makeCompareByProp('lastUpdated')).reverse()

  return (
    <div className="recently-edited-sidebar">
      <div className="header">Recently Edited Thoughts</div>
      <div style={{ padding: '0 2em' }}>
        {
          recentlyEdited.map((recentlyEditedThoughtData, i) => {
            return (
              <ThoughtsTab thoughtsRanked={recentlyEditedThoughtData.path} key={i} />
            )
          })
        }
      </div>
    </div>
  )
}

const Sidebar = () => {

  const showSidebar = useSelector(state => (state.showSidebar))
  const dispatch = useDispatch()

  const onToggleSidebar = (value) => {
    dispatch({ type: 'toggleSidebar', value })
  }

  return (
    /**
     * Actually Sidebar is inside the AppComponent. But the way the Material UI renders the drawer is by creating
     * a modal just inside the <body/> regardless where we put the Sidebar component in the component tree.
     * So .mobile classname added to the main wrapper of app component wont work for drawer.
     * Therefore instead of using recommended partern of .mobile .drawer-container
     * we are providing different classname to drawer based on isMobile property.
    */
    <SwipeableDrawer classes={{ paper: isMobile ? 'drawer-container-mobile' : 'drawer-container-desktop' }} anchor="left" onOpen={() => {
      onToggleSidebar(true)
    }} onClose={() => {
      onToggleSidebar(false)
    }} open={showSidebar} >
      <RecentEdited />
    </SwipeableDrawer>
  )
}

export default Sidebar
