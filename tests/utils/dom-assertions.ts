/**
 * 测试守卫：断言值非 null/undefined，否则让测试明确失败。
 *
 * 替代 `!` 非空断言（被 `@typescript-eslint/no-non-null-assertion` 禁止）。
 * 测试代码的语义必须和产品代码同等严谨——`!` 绕过类型检查，运行时若真为空会崩，
 * 而测试是 AI coding 下业务逻辑的唯一校验，不允许语义漏洞。
 */
export function unwrap<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message)
  return value
}

/** querySelector 找不到时让测试失败，返回非 null Element。 */
export function queryOrFail(container: ParentNode, selector: string): Element {
  return unwrap(container.querySelector(selector), `element not found: ${selector}`)
}
