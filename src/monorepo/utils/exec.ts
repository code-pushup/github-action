import { getExecOutput, type ExecOptions } from '@actions/exec'

export async function executeProcess(
  commandLine: string,
  args?: string[],
  options?: ExecOptions
): Promise<string> {
  const { exitCode, stdout, stderr } = await getExecOutput(
    commandLine,
    args,
    options
  )
  if (exitCode !== 0) {
    console.info(stdout)
    console.error(stderr)
    throw new Error(
      `Command '${serializeCommand(commandLine, args)}' failed with exit code ${exitCode}`
    )
  }
  if (stderr) {
    console.warn(stderr)
  }
  return stdout
}

function serializeCommand(commandLine: string, args?: string[]): string {
  return [commandLine, ...(args ?? [])].join(' ')
}
