import jest from '@code-pushup/eslint-config/jest.js'
import node from '@code-pushup/eslint-config/node.js'
import typescript from '@code-pushup/eslint-config/typescript.js'
import tseslint from 'typescript-eslint'

export default tseslint.config(...typescript, ...node, ...jest, {
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname
    }
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    }
  },
  ignores: ['**/node_modules/**']
})
