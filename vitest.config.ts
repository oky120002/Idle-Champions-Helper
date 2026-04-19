import { defineConfig } from 'vitest/config'

const nodeMajorVersion = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10)
const componentExecArgv = nodeMajorVersion >= 25 ? ['--no-experimental-webstorage'] : []

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.mjs'],
        },
      },
      {
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.tsx'],
          setupFiles: ['./tests/setup/vitest.setup.ts'],
          // Node 25's experimental webstorage collides with jsdom teardown reads of localStorage.
          // Keep component workers on jsdom's storage implementation only.
          execArgv: componentExecArgv,
        },
      },
    ],
  },
})
