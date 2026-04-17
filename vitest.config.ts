import { defineConfig } from 'vitest/config'

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
          execArgv: ['--no-experimental-webstorage'],
        },
      },
    ],
  },
})
