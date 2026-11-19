/** Erro de entrada inválida: o usuário pode corrigir e tentar de novo. */
export class ValidationError extends Error {
  override name = 'ValidationError';
}

/** Recurso consultado não existe na fonte (ex.: CNPJ inexistente). */
export class NotFoundError extends Error {
  override name = 'NotFoundError';
}

/** Fonte externa indisponível ou com resposta inesperada (RN09). */
export class SourceUnavailableError extends Error {
  override name = 'SourceUnavailableError';
  constructor(
    readonly source: string,
    message: string,
  ) {
    super(`${source}: ${message}`);
  }
}
