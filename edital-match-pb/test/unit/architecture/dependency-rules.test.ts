import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(import.meta.dirname, '../../../src');

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listTs(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function layerOf(file: string): string {
  const rel = relative(SRC, file).split(sep);
  return rel[0] ?? '';
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  return [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
}

/** Camadas que cada camada pode importar (além dela mesma). */
const ALLOWED: Record<string, string[]> = {
  domain: [],
  application: ['domain'],
  adapters: ['application', 'domain'],
  config: [],
  'main.ts': ['domain', 'application', 'adapters', 'config'],
};

/** Pacotes externos permitidos por camada (domínio é puro). */
const EXTERNAL_ALLOWED: Record<string, (pkg: string) => boolean> = {
  domain: () => false,
  application: () => false,
  adapters: () => true,
  config: (p) => p === 'zod',
  'main.ts': () => true,
};

describe('regras de dependência (Clean + Hexagonal)', () => {
  const files = listTs(SRC);

  it.each(files.map((f) => [relative(SRC, f), f]))('%s respeita as camadas', (_, file) => {
    const layer = layerOf(file);
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) {
        const target = layerOf(resolve(dirname(file), spec));
        const ok = target === layer || (ALLOWED[layer] ?? []).includes(target);
        expect(ok, `${layer} não pode importar ${target} (${spec})`).toBe(true);
      } else {
        const ok = spec.startsWith('node:')
          ? layer !== 'domain'
          : (EXTERNAL_ALLOWED[layer] ?? (() => false))(spec);
        expect(ok, `${layer} não pode importar o pacote ${spec}`).toBe(true);
      }
    }
  });
});
