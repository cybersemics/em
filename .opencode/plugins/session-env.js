// OpenCode sets OPENCODE=1 in its shell but not the session ID, which .hooks/commit-msg.mjs needs
// to find the session's model in OpenCode's database. OpenCode loads every exported function in
// this folder as a plugin, so this follows its documented named-export form.

/** Exports the session ID to every shell command the agent runs. */
// OpenCode discovers plugins through their named exports.
// eslint-disable-next-line import/prefer-default-export
export const SessionEnv = async () => ({
  'shell.env': async (input, output) => {
    output.env.OPENCODE_SESSION_ID = input.sessionID
  },
})
