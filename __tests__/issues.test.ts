import { issuesMatch } from '../src/issues'

describe('issues comparison', () => {
  it('should match issues with exact same metadata', () => {
    expect(
      issuesMatch(
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'function-coverage', title: 'Function coverage' },
          message: 'Function formatDate is not called in any test case.',
          severity: 'error',
          source: { file: 'src/utils.ts', position: { startLine: 100 } }
        },
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'function-coverage', title: 'Function coverage' },
          message: 'Function formatDate is not called in any test case.',
          severity: 'error',
          source: { file: 'src/utils.ts', position: { startLine: 100 } }
        },
        {
          'src/utils.ts': {
            lineChanges: [
              { prev: { line: 200, count: 0 }, curr: { line: 200, count: 3 } }
            ]
          }
        }
      )
    ).toBe(true)
  })

  it('should not match issues from different audits', () => {
    expect(
      issuesMatch(
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'function-coverage', title: 'Function coverage' },
          message: 'Function formatDate is not called in any test case.',
          severity: 'error',
          source: { file: 'src/utils.ts', position: { startLine: 100 } }
        },
        {
          plugin: { slug: 'eslint', title: 'ESLint' },
          audit: {
            slug: 'typescript-eslint-explicit-function-return-type',
            title:
              'Require explicit return types on functions and class methods.'
          },
          message: 'Missing return type on function.',
          severity: 'error',
          source: { file: 'src/utils.ts', position: { startLine: 100 } }
        },
        {
          'src/utils.ts': {
            lineChanges: [
              { prev: { line: 200, count: 0 }, curr: { line: 200, count: 3 } }
            ]
          }
        }
      )
    ).toBe(false)
  })

  it('should match issues based on adjusted line', () => {
    expect(
      issuesMatch(
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'line-coverage', title: 'Line coverage' },
          message: 'Lines 100-103 are not covered in any test case.',
          severity: 'error',
          source: {
            file: 'src/utils.ts',
            position: { startLine: 100, endLine: 103 }
          }
        },
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'line-coverage', title: 'Line coverage' },
          message: 'Lines 102-105 are not covered in any test case.',
          severity: 'error',
          source: {
            file: 'src/utils.ts',
            position: { startLine: 102, endLine: 105 }
          }
        },
        {
          'src/utils.ts': {
            lineChanges: [
              { prev: { line: 42, count: 1 }, curr: { line: 42, count: 3 } }
            ]
          }
        }
      )
    ).toBe(true)
  })

  it('should match issues from renamed files', () => {
    expect(
      issuesMatch(
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'function-coverage', title: 'Function coverage' },
          message: 'Function formatDate is not called in any test case.',
          severity: 'error',
          source: { file: 'src/utils.ts', position: { startLine: 100 } }
        },
        {
          plugin: { slug: 'coverage', title: 'Code coverage' },
          audit: { slug: 'function-coverage', title: 'Function coverage' },
          message: 'Function formatDate is not called in any test case.',
          severity: 'error',
          source: { file: 'src/utils/format.ts', position: { startLine: 100 } }
        },
        {
          'src/utils/format.ts': {
            originalFile: 'src/utils.ts',
            lineChanges: []
          }
        }
      )
    ).toBe(true)
  })

  it('should match issues based on adjusted line range', () => {
    expect(
      issuesMatch(
        {
          plugin: { slug: 'eslint', title: 'ESLint' },
          audit: {
            slug: 'max-lines',
            title: 'Enforce a maximum number of lines per file'
          },
          message: 'File has too many lines (420). Maximum allowed is 300.',
          severity: 'warning',
          source: {
            file: 'src/app.component.ts',
            position: { startLine: 300, endLine: 420 }
          }
        },
        {
          plugin: { slug: 'eslint', title: 'ESLint' },
          audit: {
            slug: 'max-lines',
            title: 'Enforce a maximum number of lines per file'
          },
          message: 'File has too many lines (450). Maximum allowed is 300.',
          severity: 'warning',
          source: {
            file: 'src/app.component.ts',
            position: { startLine: 300, endLine: 450 }
          }
        },
        {
          'src/app.component.ts': {
            lineChanges: [
              { prev: { line: 12, count: 0 }, curr: { line: 12, count: 50 } },
              { prev: { line: 123, count: 25 }, curr: { line: 173, count: 5 } }
            ]
          }
        }
      )
    ).toBe(true)
  })
})
