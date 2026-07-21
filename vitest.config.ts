import { defineConfig } from 'vitest/config'

const nodeMajorVersion = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10)
const componentExecArgv = nodeMajorVersion >= 25 ? ['--no-experimental-webstorage'] : []

export default defineConfig({
  test: {
    // jsdom + fake-indexeddb 的同步流组件测试在并发文件执行下偶发竞态超时；
    // 串行执行保证全套件稳定通过（测试总量小，串行耗时仍可接受）。
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./tests/setup/vitest.setup.ts'],
          // Node 25's experimental webstorage collides with jsdom teardown reads of localStorage.
          // Keep component workers on jsdom's storage implementation only.
          execArgv: componentExecArgv,
          // jsdom + fake-indexeddb 同步流测试在并发负载下整体执行偶发超过默认 5s testTimeout；放宽到 30s。
          testTimeout: 30000,
        },
      },
    ],
  },
})
