/**
 * This is a helper script to tag and push a new release. GitHub Actions use
 * release tags to allow users to select a specific version of the action to use.
 *
 * See: https://github.com/actions/typescript-action#publishing-a-new-release
 *
 * This script will do the following:
 *
 * 1. Get the latest release tag
 * 2. Prompt the user for a new release tag
 * 3. Tag the new release
 * 4. Push the new tag to the remote
 *
 * Usage: node script/release.js
 */

import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { simpleGit } from 'simple-git'

// Terminal colors
const OFF = '\x1B[0m'
const RED = '\x1B[0;31m'
const GREEN = '\x1B[0;32m'
const BLUE = '\x1B[0;34m'

const git = simpleGit()

try {
  // Get the latest release tag
  let latestTag = (await git.tags()).latest

  if (!latestTag) {
    // There are no existing release tags
    console.log(
      'No tags found (yet) - Continue to create and push your first tag'
    )
    latestTag = '[unknown]'
  }

  // Display the latest release tag
  console.log(`The latest release tag is: ${BLUE}${latestTag}${OFF}`)

  // Prompt the user for the new release tag
  const rl = readline.createInterface({ input, output })
  const newTag = (
    await rl.question('Enter a new release tag (vX.X.X format): ')
  ).trim()
  rl.close()

  // Validate if the new release tag is in the format vX.X.X
  const tagRegex = /^v\d+\.\d+\.\d+$/
  if (tagRegex.test(newTag)) {
    console.log(`Tag: ${BLUE}${newTag}${OFF} is valid`)
  } else {
    console.error(
      `Tag: ${BLUE}${newTag}${OFF} is ${RED}not valid${OFF} (must be in vX.X.X format)`
    )
    process.exit(1)
  }

  // Tag the new release
  await git.addAnnotatedTag(newTag, `${newTag} Release`)
  console.log(`${GREEN}Tagged: ${newTag}${OFF}`)

  // Tag major version (extract the "vX" from "vX.X.X")
  const newMajorTag = newTag.split('.')[0]
  await git.tag(['-fa', newMajorTag, '-m', `Update ${newMajorTag} tag`])
  console.log(`${GREEN}Tagged: ${newMajorTag}${OFF}`)

  // Push the new tag to the remote
  await git.push(['--tags', '--force'])
  console.log(`${GREEN}Release tag pushed to remote${OFF}`)
  console.log(`${GREEN}Done!${OFF}`)
} catch (error) {
  console.error(`${RED}Error:${OFF} ${error}`)
  process.exit(1)
}
