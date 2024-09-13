import { exec } from '@actions/exec'
import type { CommandContext } from '../context'

export async function printConfig({
  bin,
  config,
  directory,
  silent
}: CommandContext): Promise<void> {
  await exec(bin, [...(config ? [`--config=${config}`] : []), 'print-config'], {
    cwd: directory,
    silent
  })
}
