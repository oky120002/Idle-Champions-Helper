import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

// 提取每个 script 里的 `node <入口>` 引用，断言入口文件存在。
// 防止 TS/脚本迁移后 package.json 残留指向已删 .mjs 的断链入口。
const nodeTargets: { name: string; target: string }[] = [];
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
  const re = /\bnode\s+([^\s&|;]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd)) !== null) {
    const target = m[1];
    if (target) nodeTargets.push({ name, target });
  }
}

describe('package.json scripts 入口完整性', () => {
  if (nodeTargets.length === 0) {
    it('至少存在一个 node 入口可供校验', () => {
      expect.fail('未从 package.json scripts 解析出任何 node 入口');
    });
  }

  it.each(nodeTargets)('$name → $target 入口文件必须存在', ({ target }) => {
    const abs = resolve(repoRoot, target);
    expect(existsSync(abs), `package.json 脚本入口缺失: ${target}`).toBe(true);
  });
});
