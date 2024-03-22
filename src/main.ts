import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'node:fs/promises'
import path from 'node:path'
import { simpleGit } from 'simple-git'
import { collect } from './collect'
import { compare } from './compare'
import { parseInputs } from './inputs'

export async function run(git = simpleGit()): Promise<void> {
  try {
    const inputs = parseInputs()

    const currReportPath = await collect(inputs)
    const currReport = await fs.readFile(currReportPath, 'utf8')
    core.debug(`Collected current report at ${currReportPath}`)

    if (github.context.payload.pull_request) {
      const baseBranch: string = github.context.payload.pull_request.base.ref
      core.debug(`PR detected, preparing to compare base branch ${baseBranch}`)

      await git.fetch('origin', baseBranch, ['--depth=1'])
      await git.checkout(['-f', baseBranch])
      core.debug(`Switched to base branch ${baseBranch}`)

      const prevReportPath = await collect(inputs)
      const prevReport = await fs.readFile(prevReportPath, 'utf8')
      core.debug(`Collected previous report at ${prevReportPath}`)

      await git.checkout(['-f', '-'])
      core.debug('Switched back to current branch')

      const reportsDir = path.join(inputs.directory, '.code-pushup')
      const currPath = path.join(reportsDir, 'curr-report.json')
      const prevPath = path.join(reportsDir, 'prev-report.json')
      await fs.writeFile(currPath, currReport)
      await fs.writeFile(prevPath, prevReport)
      core.debug(`Saved reports to ${currPath} and ${prevPath}`)

      const diffPath = await compare(
        { before: prevPath, after: currPath },
        inputs
      )
      core.debug(`Compared reports and generated diff at ${diffPath}`)

      // TODO: PR comment
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : `${error}`)
  }
}
