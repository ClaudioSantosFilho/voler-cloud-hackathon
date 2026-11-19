import { describe, expect, it } from 'vitest';
import { ConsultarEmpresaUseCase } from '../../../src/application/use-cases/consultar-empresa.js';
import {
  NotFoundError,
  SourceUnavailableError,
  ValidationError,
} from '../../../src/domain/errors.js';
import { buildEmpresa } from '../../helpers/builders.js';
import { FakeCache, FakeCnpjGateway } from '../../helpers/fakes.js';

describe('ConsultarEmpresa (RF01)', () => {
  const empresa = buildEmpresa();

  it('retorna empresa e a fonte do dado', async () => {
    const useCase = new ConsultarEmpresaUseCase(new FakeCnpjGateway([empresa]), new FakeCache());
    await expect(useCase.execute({ cnpj: '08.761.140/0001-94' })).resolves.toEqual({
      empresa,
      fonte: 'FakeCNPJ',
    });
  });

  it('usa cache na segunda chamada', async () => {
    const gateway = new FakeCnpjGateway([empresa]);
    const useCase = new ConsultarEmpresaUseCase(gateway, new FakeCache());
    await useCase.execute({ cnpj: empresa.cnpj });
    await useCase.execute({ cnpj: empresa.cnpj });
    expect(gateway.calls).toBe(1);
  });

  it('CNPJ inválido não chega ao gateway', async () => {
    const gateway = new FakeCnpjGateway([empresa]);
    await expect(
      new ConsultarEmpresaUseCase(gateway, new FakeCache()).execute({ cnpj: '123' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(gateway.calls).toBe(0);
  });

  it('CNPJ inexistente propaga NotFoundError', async () => {
    const useCase = new ConsultarEmpresaUseCase(new FakeCnpjGateway([]), new FakeCache());
    await expect(useCase.execute({ cnpj: empresa.cnpj })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('API fora do ar propaga a fonte que falhou e não cacheia', async () => {
    const gateway = new FakeCnpjGateway([empresa]);
    gateway.failWith = new SourceUnavailableError('BrasilAPI', 'HTTP 503');
    const cache = new FakeCache();
    await expect(
      new ConsultarEmpresaUseCase(gateway, cache).execute({ cnpj: empresa.cnpj }),
    ).rejects.toThrow('BrasilAPI');
    expect(cache.store.size).toBe(0);
  });
});
