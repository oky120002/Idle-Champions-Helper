# ADR 0018：ESLint 与 JSX 可访问性插件的兼容边界

**状态**: Accepted
**决策日期**: 2026-08-14

## 背景

项目使用 `eslint-plugin-jsx-a11y@6.10.2`。该版本的 peer 依赖只声明支持 ESLint 3–9，而 ESLint 10 已经进入项目依赖，导致 `pnpm install --frozen-lockfile` 因 peer dependency 冲突失败。

## 决策

保留 `eslint-plugin-jsx-a11y@6.10.2`，将 `eslint` 和 `@eslint/js` 统一使用 `^9.39.5`。依赖更新必须通过不带 `--legacy-peer-deps` 的 `pnpm install --frozen-lockfile`。

## 后果

- JSX 可访问性规则继续可用，pnpm 默认 peer 校验恢复通过。
- ESLint 10 暂不升级；待 `eslint-plugin-jsx-a11y` 正式声明支持 ESLint 10 后，再整体评估升级。
- ESLint 主包与 `@eslint/js` 必须保持同一主版本。

## 替代方案

- 升级 `eslint-plugin-jsx-a11y`：当前正式版仍未声明 ESLint 10 支持，不可作为可靠修复。
- 使用 `--legacy-peer-deps`：只是绕过解析校验，保留不兼容依赖组合，不采用。
