import { DiffNameStatus, simpleGit } from 'simple-git'

export async function listChangedFiles(
  refs: {
    base: string
    head: string
  },
  git = simpleGit()
): Promise<string[]> {
  const statuses: DiffNameStatus[] = [
    DiffNameStatus.ADDED,
    DiffNameStatus.MODIFIED
  ]
  const { files } = await git.diffSummary([
    `--diff-filter=${statuses.join('')}`,
    refs.base,
    refs.head
  ])
  return files.filter(({ binary }) => !binary).map(({ file }) => file)
}
