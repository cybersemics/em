import { css } from '../../styled-system/css'
import Log from '../@types/Log'

/** Render the local logs in a readonly textarea. */
const Logs = ({ logs }: { logs: Log[] }) => {
  // format and concatenate the logs
  const logsFormatted = logs.map(log => `${log.created} ${log.stack || log.message}`).join('\n\n')

  return (
    <textarea
      readOnly
      defaultValue={logs.length > 0 ? logsFormatted : 'No logs.'}
      className={css({
        marginTop: 20,
        backgroundColor: 'darkgray',
        border: 0,
        padding: 20,
        fontFamily: 'monospace',
        fontSize: 14,
      })}
    />
  )
}

export default Logs
