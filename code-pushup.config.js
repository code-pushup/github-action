import coveragePlugin from '@code-pushup/coverage-plugin'
import eslintPlugin from '@code-pushup/eslint-plugin'
import jsPackagesPlugin from '@code-pushup/js-packages-plugin'

/** @type {import('@code-pushup/models').CoreConfig} */
const config = {
  plugins: [
    await eslintPlugin({
      eslintrc: '.github/linters/.eslintrc.yml',
      patterns: ['src/**/*.js']
    }),
    await coveragePlugin({
      coverageToolCommand: { command: 'npm', args: ['test'] },
      reports: ['coverage/lcov.info']
    }),
    await jsPackagesPlugin({ packageManager: 'npm' })
  ],
  categories: [
    {
      slug: 'bug-prevention',
      title: 'Bug prevention',
      refs: [{ type: 'group', plugin: 'eslint', slug: 'problems', weight: 1 }]
    },
    {
      slug: 'code-style',
      title: 'Code style',
      refs: [
        { type: 'group', plugin: 'eslint', slug: 'suggestions', weight: 1 }
      ]
    },
    {
      slug: 'code-coverage',
      title: 'Code coverage',
      refs: [{ type: 'group', plugin: 'coverage', slug: 'coverage', weight: 1 }]
    },
    {
      slug: 'security',
      title: 'Security',
      refs: [
        { type: 'group', plugin: 'js-packages', slug: 'npm-audit', weight: 1 }
      ]
    },
    {
      slug: 'updates',
      title: 'Updates',
      refs: [
        {
          type: 'group',
          plugin: 'js-packages',
          slug: 'npm-outdated',
          weight: 1
        }
      ]
    }
  ]
}

export default config
