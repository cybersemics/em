import trackThoughtYTrajectory, { type ThoughtTarget } from './trackThoughtYTrajectory'

export type { ThoughtTarget } from './trackThoughtYTrajectory'

type MeasureThoughtYStabilityOptions = {
  target: ThoughtTarget
  frames?: number
}

export type ThoughtYStabilitySample = {
  frame: number
  top: number
}

export type ThoughtYStabilityResult = {
  dataPath: string | null
  initialTop: number
  finalTop: number
  maxAbsDelta: number
  samples: ThoughtYStabilitySample[]
}

/** Waits for target thought, then records tree-node top across microtasks and animation frames. */
const measureThoughtYStability = async ({
  target,
  frames = 8,
}: MeasureThoughtYStabilityOptions): Promise<ThoughtYStabilityResult> => {
  const trajectory = await trackThoughtYTrajectory({
    target,
    maxFrames: frames,
  })

  return {
    dataPath: trajectory.dataPath,
    initialTop: trajectory.initialTop,
    finalTop: trajectory.finalTop,
    maxAbsDelta: trajectory.maxAbsDelta,
    samples: trajectory.samples.map((s, i) => ({ frame: i, top: s.top })),
  }
}

export default measureThoughtYStability
