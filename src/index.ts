import { run } from './main'

// FIXME: this is fix for GitHub action runner running node below 20 (node 18) even if using: 'node20' is specified
// TODO: remove after updating to node 22 runner and making sure it runs correct environment
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function <T>(
    this: T[],
    compareFn?: (a: T, b: T) => number
  ): T[] {
    return [...this].sort(compareFn)
  }
}

await run()
