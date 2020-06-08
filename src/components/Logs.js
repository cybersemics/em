import React from 'react'

/** Render the local logs in a readonly textarea. */
const Logs = ({ logs }) => {

  // format and concatenate the logs
  const logsFormatted = logs
    .map(log => `${log.created} ${log.stack || log.message}`)
    .join('\n\n')

  return <textarea readOnly defaultValue={logs.length > 0 ? logsFormatted : 'No logs.'} style={{
    marginTop: 20,
    backgroundColor: '#111',
    border: 0,
    padding: 20,
    fontFamily: 'monospace',
    fontSize: 14
  }} />
}

export default Logs
