import path from 'node:path'

const PERSIST_OUTPUT_DIR = '.code-pushup'
const PERSIST_FILENAME = 'report'
const PERSIST_FORMAT = ['json', 'md'] as const

type PersistFormat = (typeof PERSIST_FORMAT)[number]

export type PersistedCliFiles<T extends PersistFormat = PersistFormat> = {
  [F in T as `${F}FilePath`]: string
} & {
  artifactData: {
    rootDir: string
    files: string[]
  }
}

export function persistCliOptions({
  directory,
  project
}: {
  directory: string
  project?: string
}): string[] {
  return [
    `--persist.outputDir=${path.join(directory, PERSIST_OUTPUT_DIR)}`,
    `--persist.filename=${createFilename(project)}`,
    ...PERSIST_FORMAT.map(format => `--persist.format=${format}`)
  ]
}

export function persistedCliFiles<
  TFormat extends PersistFormat = PersistFormat
>({
  directory,
  isDiff,
  project,
  formats
}: {
  directory: string
  isDiff?: boolean
  project?: string
  formats?: TFormat[]
}): PersistedCliFiles<TFormat> {
  const rootDir = path.join(directory, PERSIST_OUTPUT_DIR)
  const filename = isDiff
    ? `${createFilename(project)}-diff`
    : createFilename(project)
  const filePaths = (formats ?? PERSIST_FORMAT).reduce(
    (acc, format) => ({
      ...acc,
      [`${format}FilePath`]: path.join(rootDir, `${filename}.${format}`)
    }),
    {} as Omit<PersistedCliFiles, 'artifactData'>
  )
  const files = Object.values(filePaths)

  return {
    ...filePaths,
    artifactData: {
      rootDir,
      files
    }
  }
}

export function findPersistedFiles(
  rootDir: string,
  files: string[],
  project?: string
): PersistedCliFiles {
  const filename = createFilename(project)
  const filePaths = PERSIST_FORMAT.reduce(
    (acc, format) => {
      const matchedFile = files.find(file => file === `${filename}.${format}`)
      if (!matchedFile) {
        return acc
      }
      return { ...acc, [`${format}FilePath`]: path.join(rootDir, matchedFile) }
    },
    {} as Omit<PersistedCliFiles, 'artifactData'>
  )
  return {
    ...filePaths,
    artifactData: {
      rootDir,
      files: Object.values(filePaths)
    }
  }
}

export function projectToFilename(project: string): string {
  return project.replace(/[/\\\s]+/g, '-').replace(/@/g, '')
}

function createFilename(project: string | undefined): string {
  if (!project) {
    return PERSIST_FILENAME
  }
  const prefix = projectToFilename(project)
  return `${prefix}-${PERSIST_FILENAME}`
}
