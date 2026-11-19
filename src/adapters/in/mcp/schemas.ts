import { z } from 'zod';

/** RF10/RN08: todas as tools são somente leitura. */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export const cnaeOutput = z.object({ codigo: z.string(), descricao: z.string() });
