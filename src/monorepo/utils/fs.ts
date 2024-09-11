import { readFile, stat } from 'node:fs/promises'
import YAML from 'yaml'

export async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path)
    return stats.isFile()
  } catch {
    return false
  }
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  const text = await readFile(path, 'utf8')
  return JSON.parse(text) as T
}

export async function readYamlFile<T = unknown>(path: string): Promise<T> {
  const text = await readFile(path, 'utf8')
  return YAML.parse(text) as T
}
