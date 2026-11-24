/** A point the route passes through, and when, in seconds from its start. */
export interface Waypoint {
  x: number
  y: number
  at: number
}

/** One axis of a Catmull-Rom curve between p1 and p2, with p0 and p3 their neighbours, u from 0 to 1. */
const catmullRom = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u)

/**
 * A smooth path through timed waypoints, for the genie to follow. Returns where the path is at time t, in seconds from
 * its start. The path passes through every waypoint at its time, curving smoothly between them (a Catmull-Rom spline),
 * and holds at the first waypoint before it and the last after it.
 *
 * It describes where the genie is told to be, not where it is: the genie chases it on its spring, so it rounds the
 * corners and arrives a little after each waypoint's time.
 */
const route =
  (waypoints: Waypoint[]) =>
  (t: number): { x: number; y: number } => {
    const first = waypoints[0]
    const last = waypoints[waypoints.length - 1]
    if (t <= first.at) return { x: first.x, y: first.y }
    if (t >= last.at) return { x: last.x, y: last.y }
    const i = waypoints.findIndex((point, index) => t < waypoints[index + 1].at && t >= point.at)
    const p0 = waypoints[Math.max(0, i - 1)]
    const p1 = waypoints[i]
    const p2 = waypoints[i + 1]
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)]
    const u = (t - p1.at) / (p2.at - p1.at)
    return { x: catmullRom(p0.x, p1.x, p2.x, p3.x, u), y: catmullRom(p0.y, p1.y, p2.y, p3.y, u) }
  }

export default route
