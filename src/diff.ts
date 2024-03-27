import { DiffNameStatus, simpleGit } from 'simple-git'

export async function listChangedFiles(
  refs: {
    base: { ref: string; sha: string }
    head: { ref: string; sha: string }
  },
  git = simpleGit()
): Promise<string[]> {
  const statuses: DiffNameStatus[] = [
    DiffNameStatus.ADDED,
    DiffNameStatus.MODIFIED
  ]
  const { files } = await git.diffSummary([
    `--diff-filter=${statuses.join('')}`,
    refs.base.sha,
    refs.head.sha
  ])
  return files.filter(({ binary }) => !binary).map(({ file }) => file)
}
