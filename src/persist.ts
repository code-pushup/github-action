import path from 'node:path'

const PERSIST_OUTPUT_DIR = '.code-pushup'
const PERSIST_FILENAME = 'report'
const PERSIST_FORMAT = ['json', 'md'] as const

type PersistFormat = (typeof PERSIST_FORMAT)[number]

export type PersistedCliFiles = {
  [T in PersistFormat as `${T}FilePath`]: string
} & {
  artifactData: {
    rootDir: string
    files: string[]
  }
}

export function persistCliOptions(): string[] {
  return [
    `--persist.outputDir=${PERSIST_OUTPUT_DIR}`,
    `--persist.filename=${PERSIST_FILENAME}`,
    ...PERSIST_FORMAT.map(format => `--persist.format=${format}`)
  ]
}

export function persistedCliFiles({
  directory,
  isDiff
}: {
  directory: string
  isDiff?: boolean
}): PersistedCliFiles {
  const rootDir = path.join(directory, PERSIST_OUTPUT_DIR)
  const filename = isDiff ? `${PERSIST_FILENAME}-diff` : PERSIST_FILENAME
  const filePaths = PERSIST_FORMAT.reduce(
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
  files: string[]
): PersistedCliFiles {
  const filePaths = PERSIST_FORMAT.reduce(
    (acc, format) => {
      const matchedFile = files.find(
        file => file === `${PERSIST_FILENAME}.${format}`
      )
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
