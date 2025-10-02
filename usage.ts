import ansis from 'ansis'
import { Logger } from './logger.js'

async function sleep(delay: number) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

const logger = new Logger()
logger.setVerbose(process.argv.includes('--verbose'))

try {
  logger.info(ansis.bold.blue('Code PushUp CLI v0.80.1'))
  logger.newline()

  await logger.task('Importing code-pushup.config.ts', async () => {
    await sleep(500)

    return 'Loaded configuration from code-pushup.config.ts'
  })
  logger.debug('2 plugins:')
  logger.debug('• ESLint')
  logger.debug('• Lighthouse')

  await logger.group(
    `Running plugin "ESLint" ${ansis.gray('[1/2]')}`,
    async () => {
      const bin = 'npx eslint . --format=json'
      await logger.command(bin, async () => {
        logger.debug('ESLint v9.2.0')
        await sleep(3000)
        // const error = 'Configuration file not found.';
        const error = null
        if (error) {
          logger.error(error)
          throw new Error(`Command ${ansis.bold(bin)} exited with code 1`)
        }
        logger.debug('All files pass linting.')
      })

      logger.info('Found 0 lint problems')

      logger.warn('Metadata not found for rule @angular-eslint/template/eqeqeq')

      return 'Completed "ESLint" plugin execution'
    }
  )

  await logger.group(
    `Running plugin "Lighthouse" ${ansis.gray('[2/2]')}`,
    async () => {
      await logger.task(
        `Executing ${ansis.bold('runLighthouse')} function`,
        async () => {
          await sleep(8000)
          return `Executed ${ansis.bold('runLighthouse')} function`
        }
      )

      logger.debug('Lighthouse category scores:')
      logger.debug('• Accessibility: 100')
      logger.debug('• SEO: 84')

      return 'Completed "Lighthouse" plugin execution'
    }
  )

  logger.info(ansis.bold('Collected report'))
  logger.newline()

  await logger.task(ansis.bold('Uploading report to portal'), async () => {
    logger.debug(
      'Sent GraphQL mutation to https://api.code-pushup.example.com/graphql (organization: "example", project: "website")'
    )
    await sleep(2000)
    // throw new Error('GraphQL error');
    return ansis.bold('Uploaded report to portal')
  })
} catch (error) {
  logger.newline()
  console.error(error)
  logger.newline()
  logger.error(ansis.bold(`Code PushUp CLI failed (see error above)`))
  process.exit(1)
}
