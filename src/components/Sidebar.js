import React from "react"
import SwipeableDrawer from "@bit/mui-org.material-ui.swipeable-drawer"
import { useSelector, useDispatch } from "react-redux"
import { isMobile } from "../browser"

const sidebarBackgroundColor = "#292a2b"

const pathToLink = (path) => {
  return path.reduce((link, data, i) => {
    return link + data.value + "/"
  }, "")
}

const sortByLastUpdated = (recentlyEditedArray) => {
  return recentlyEditedArray.sort((data1, data2) => {
    const time1 = parseInt(new Date(data1.lastUpdated).getTime())
    const time2 = parseInt(new Date(data2.lastUpdated).getTime())
    return time2 - time1
  })
}

const RecentEdited = () => {
  const recentlyEdited = useSelector(state => (state.recentlyEdited))
  const dispatch = useDispatch()

  const sortedRecentlyEdited = sortByLastUpdated(recentlyEdited)

  return (
    <div style={{ background: sidebarBackgroundColor, boxSizing: "border-box", width: "100%", height: "100%", color: "white" }}>
      <div style={{ width: "100%", fontSize: "1.3em", fontWeight: "300", display: "flex", justifyContent: "center", margin: "1.2em 0" }}>Recently Edited Thoughts</div>
      <div style={{ padding: "0 2em" }}>
        {
          sortedRecentlyEdited.map((data) => {
            const link = pathToLink(data.path)

            return (
              <div style={{ margin: "0.4em 0", borderRadius: "4px", background: "#7d7d7d", padding: "0.4em 0.5em", cursor: "pointer" }} onClick={() => {
                dispatch({ type: "toggleSidebar" })
                dispatch({ type: 'setCursor', thoughtsRanked: data.path })
              }} key={link}>{link}</div>
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

  const onToggleSidebar = (flag) => {
    dispatch({ type: "toggleSidebar" })
  }

  return (
    <SwipeableDrawer classes={{ paper: isMobile ? "drawerContainer-mobile" : "drawerContainer-desktop" }} anchor="left" onOpen={() => { onToggleSidebar(true) }} onClose={() => { onToggleSidebar(false) }} open={showSidebar} >
      <RecentEdited />
    </SwipeableDrawer>
  )
}

export default Sidebar