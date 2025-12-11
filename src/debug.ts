import * as core from '@actions/core'

export function isDebugActive(): boolean {
  return (
    // checks just RUNNER_DEBUG env variable
    core.isDebug() ||
    // docs mention ACTIONS prefixed debug variables https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/enabling-debug-logging
    process.env['ACTIONS_RUNNER_DEBUG'] === 'true' ||
    process.env['ACTIONS_STEP_DEBUG'] === 'true'
  )
}
