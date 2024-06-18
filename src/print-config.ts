import { exec } from '@actions/exec'
import type { ActionInputs } from './inputs'

export async function printConfig({
  bin,
  config,
  directory,
  silent
}: ActionInputs): Promise<void> {
  await exec(bin, [...(config ? [`--config=${config}`] : []), 'print-config'], {
    cwd: directory,
    silent
  })
}
