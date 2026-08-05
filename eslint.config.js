import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { importX } from 'eslint-plugin-import-x'
import vitest from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

// sonarjs recommended 中对浏览器端 React 静态站不适用的规则（服务端 / 测试框架 / 噪音）。
// 详见 docs/specs/guidelines/testing.md §4 lint 策略。
const sonarjsOff = {
  // AWS 云安全（17 条）— 浏览器端静态站完全不适用
  'sonarjs/aws-apigateway-public-api': 'off',
  'sonarjs/aws-ec2-rds-dms-public': 'off',
  'sonarjs/aws-ec2-unencrypted-ebs-volume': 'off',
  'sonarjs/aws-efs-unencrypted': 'off',
  'sonarjs/aws-iam-all-privileges': 'off',
  'sonarjs/aws-iam-privilege-escalation': 'off',
  'sonarjs/aws-iam-public-access': 'off',
  'sonarjs/aws-opensearchservice-domain': 'off',
  'sonarjs/aws-rds-unencrypted-databases': 'off',
  'sonarjs/aws-restricted-ip-admin-access': 'off',
  'sonarjs/aws-s3-bucket-granted-access': 'off',
  'sonarjs/aws-s3-bucket-insecure-http': 'off',
  'sonarjs/aws-s3-bucket-public-access': 'off',
  'sonarjs/aws-s3-bucket-versioning': 'off',
  'sonarjs/aws-sagemaker-unencrypted-notebook': 'off',
  'sonarjs/aws-sns-unencrypted-topics': 'off',
  'sonarjs/aws-sqs-unencrypted-queue': 'off',
  // 服务端/网络安全（27 条）— GitHub Pages 静态站无服务端
  'sonarjs/cookie-no-httponly': 'off',
  'sonarjs/insecure-cookie': 'off',
  'sonarjs/content-length': 'off',
  'sonarjs/content-security-policy': 'off',
  'sonarjs/cors': 'off',
  'sonarjs/csrf': 'off',
  'sonarjs/frame-ancestors': 'off',
  'sonarjs/strict-transport-security': 'off',
  'sonarjs/x-powered-by': 'off',
  'sonarjs/no-mime-sniff': 'off',
  'sonarjs/no-mixed-content': 'off',
  'sonarjs/no-referrer-policy': 'off',
  'sonarjs/file-uploads': 'off',
  'sonarjs/file-permissions': 'off',
  'sonarjs/hidden-files': 'off',
  'sonarjs/no-session-cookies-on-static-assets': 'off',
  'sonarjs/weak-ssl': 'off',
  'sonarjs/unverified-certificate': 'off',
  'sonarjs/unverified-hostname': 'off',
  'sonarjs/encryption-secure-mode': 'off',
  'sonarjs/no-weak-keys': 'off',
  'sonarjs/no-weak-cipher': 'off',
  'sonarjs/hashing': 'off',
  'sonarjs/insecure-jwt-token': 'off',
  'sonarjs/sql-queries': 'off',
  'sonarjs/xml-parser-xxe': 'off',
  'sonarjs/no-angular-bypass-sanitization': 'off',
  // 注释追踪（4 条）— 会报爆现有 TODO（auto-todo 在用）
  'sonarjs/todo-tag': 'off',
  'sonarjs/fixme-tag': 'off',
  'sonarjs/no-commented-code': 'off',
  'sonarjs/no-sonar-comments': 'off',
  // 命名规范（3 条）— 项目有自己的命名约定
  'sonarjs/class-name': 'off',
  'sonarjs/function-name': 'off',
  'sonarjs/variable-name': 'off',
  // 测试框架（12 条）— 针对 mocha/jest/chai，vitest 不兼容；focused-test 交给 @vitest/eslint-plugin
  'sonarjs/assertions-in-tests': 'off',
  'sonarjs/no-empty-test-file': 'off',
  'sonarjs/no-exclusive-tests': 'off',
  'sonarjs/no-skipped-tests': 'off',
  'sonarjs/stable-tests': 'off',
  'sonarjs/disabled-timeout': 'off',
  'sonarjs/no-code-after-done': 'off',
  'sonarjs/test-check-exception': 'off',
  'sonarjs/no-incomplete-assertions': 'off',
  'sonarjs/no-same-argument-assert': 'off',
  'sonarjs/inverted-assertion-arguments': 'off',
  'sonarjs/chai-determinate-assertion': 'off',
  // 噪音/情境不适用（4 条）
  'sonarjs/pseudo-random': 'off', // 游戏模拟有合理 Math.random
  'sonarjs/deprecation': 'off', // 依赖废弃 API 海量噪音
  'sonarjs/disabled-auto-escaping': 'off', // React 默认转义
  'sonarjs/no-nested-functions': 'off', // React 内联 handler 冲突
  // 测试规则（vitest 项目用 @vitest/eslint-plugin，sonarjs 测试规则针对 jest/mocha，关闭——行业共识）
  'sonarjs/prefer-specific-assertions': 'off',
  'sonarjs/no-trivial-assertions': 'off',
  'sonarjs/parameterized-tests': 'off',
}

// strictTypeChecked 不含的规则手动开；含的规则按需覆盖选项（行业共识）。
const tseslintOn = {
  // === strictTypeChecked 不含，手动开（默认选项即共识）===
  // strict-boolean-expressions：''/0 等 falsy 易误会，纯 string/number 也要明确（显式 !== '' / !== 0）；
  // 对象/纯 boolean 无 falsy 误判，可直接 if（默认 allowNullableObject: true，纯 boolean 总允许）
  '@typescript-eslint/strict-boolean-expressions': ['error', {
    allowString: false, // '' 误会，要求显式 str !== ''
    allowNumber: false, // 0 误会，要求显式 num !== 0
  }],
  '@typescript-eslint/prefer-optional-chain': 'error',
  // === 选项共识（覆盖 strictTypeChecked 默认）===
  // prefer-nullish-coalescing：ignorePrimitives（原始类型 || 保留，对象改 ??）
  '@typescript-eslint/prefer-nullish-coalescing': ['error', {
    ignorePrimitives: { string: true, number: true, boolean: true, bigint: true },
  }],
  // no-confusing-void-expression：strictTypeChecked 自带但属形式主义（void 返回是期望行为），关闭
  '@typescript-eslint/no-confusing-void-expression': 'off',
  // no-unnecessary-condition：allowConstantLoopConditions（社区共识，允许 while(true) 等字面量惯用法）
  '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: 'only-allowed-literals' }],
  eqeqeq: ['error', 'smart'], // core：smart 允许 == null（nullish 检查，与 strict-boolean 一致）
}

// import-x 非 recommended 的精选（模块边界 + 导入卫生）。
const importXOn = {
  'import-x/no-cycle': 'error',
  'import-x/no-extraneous-dependencies': 'error',
  'import-x/no-self-import': 'error',
  'import-x/no-useless-path-segments': 'error',
  'import-x/no-absolute-path': 'error',
  'import-x/no-dynamic-require': 'error',
  'import-x/no-nodejs-modules': 'error',
  'import-x/order': 'error',
  // 不开 import-x/first：它会移动非 import 语句（如 vitest vi.mock），对 vitest 模式不友好
  'import-x/newline-after-import': 'error',
  'import-x/no-empty-named-blocks': 'error',
}

// 规模/复杂度类——scripts/tests/fixtures 天然复杂，强拆无意义（与 max-lines 决策一致，scripts-audit.md）。
const sizeOff = {
  'max-lines': 'off',
  complexity: 'off',
  'sonarjs/cognitive-complexity': 'off',
  'import-x/no-nodejs-modules': 'off', // 脚本可用 node 内置
}

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', '**/*.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      sonarjs.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // 圈复杂度（ESLint core，比 sonarjs/cyclomatic-complexity 标准）
      complexity: ['error', { max: 20 }],

      ...sonarjsOff,
      ...tseslintOn,
      ...importXOn,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports to keep module boundaries predictable for AI-first incremental loading.',
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.d.ts'],
    rules: {
      'max-lines': ['warn', { max: 240, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      'max-lines': ['warn', { max: 180, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // 批处理脚本、测试、夹具天然较长较复杂，规模/复杂度限制只会逼出无意义拆分；产品源码仍受上面 240/180 约束。
    files: [
      'scripts/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*TestHarness.{ts,tsx}',
      '**/*TestData.{ts,tsx}',
      '**/*TestUtils.{ts,tsx}',
      '**/*Fixture.{ts,tsx}',
      '**/*Fixtures.{ts,tsx}',
    ],
    rules: sizeOff,
  },
  {
    // vitest 测试质量规则（防 .only / 缺断言 / 重复标题等）。playwright e2e 不在此列。
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    ignores: ['tests/e2e/**'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-disabled-tests': 'off', // 允许 it.skip，但要求有理由，靠 review
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*TestHarness.{ts,tsx}',
      '**/*TestData.{ts,tsx}',
      '**/*TestUtils.{ts,tsx}',
      '**/*Fixture.{ts,tsx}',
      '**/*Fixtures.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
])
