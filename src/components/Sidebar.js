import React from "react"
import SwipeableDrawer from "@bit/mui-org.material-ui.swipeable-drawer"

const sidebarBackgroundColor = "#292a2b"

const RecentEdited = () => {
  return (
    <div style={{ background: sidebarBackgroundColor, boxSizing: "border-box", width: "100%", height: "100%", color: "white" }}>
      <div style={{ width: "100%", fontSize: "1.3em", fontWeight: "300", display: "flex", justifyContent: "center", margin: "1.2em 0" }}>Recently Edited Thoughts</div>
      <div style={{ padding: "0 2em" }}>
        Work in Progress
      </div>
    </div>
  )
}

const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const onToggleSidebar = (flag) => {
    setSidebarOpen(flag)
  }

  return (
    <SwipeableDrawer classes={{ paper: "drawerContainer" }} anchor="left" onOpen={() => { onToggleSidebar(true) }} onClose={() => { onToggleSidebar(false) }} open={sidebarOpen} >
      <RecentEdited />
    </SwipeableDrawer>
  )
}

export default Sidebar