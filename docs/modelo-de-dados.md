# Modelo de dados

Não há banco de dados. As entidades abaixo são tipos do domínio (`src/domain`), montados pelos adaptadores a partir das respostas do PNCP, da BrasilAPI e do IBGE, e guardados só no cache em memória.

```mermaid
classDiagram
  class Empresa {
    cnpj: string (14 dígitos)
    razaoSocial: string
    situacaoCadastral: string
    cnaePrincipal: Cnae
    cnaesSecundarios: Cnae[]
  }
  class Cnae {
    codigo: string (7 dígitos)
    descricao: string
  }
  class Edital {
    idPncp: string
    orgao: string
    municipioIbge: string
    municipioNome: string
    uf: string
    modalidade: Modalidade
    objeto: string
    valorEstimado?: number
    dataAbertura: ISO 8601
    dataEncerramentoPropostas: ISO 8601
    linkOficial: string
  }
  class EditalComPrazo {
    diasUteisRestantes: number
  }
  class Modalidade {
    codigo: number
    nome: string
  }
  class Match {
    edital: EditalComPrazo
    score: number (0 a 1)
    motivo: string[]
  }
  class Municipio {
    codigoIbge: string
    nome: string
    uf: string
  }
  class Feriado {
    data: YYYY-MM-DD
    nome: string
  }

  Empresa "1" --> "1" Cnae : principal
  Empresa "1" --> "0..*" Cnae : secundários
  Edital "1" --> "1" Modalidade
  Edital <|-- EditalComPrazo
  Match "1" --> "1" EditalComPrazo
  Edital ..> Municipio : municipioIbge
```

## Notas

- `idPncp` é o número de controle do PNCP: `{cnpjOrgao}-1-{sequencial}/{ano}`. O `linkOficial` é derivado dele: `https://pncp.gov.br/app/editais/{cnpjOrgao}/{ano}/{sequencial}`.
- Datas do PNCP chegam sem fuso e são normalizadas para `-03:00` no adaptador (`normalizePncpDate`).
- `Empresa` não tem sócios: o quadro societário é descartado na fronteira (LGPD).
- `Match.motivo` lista cada termo encontrado com a origem, por exemplo `marmit (CNAE principal 5620104)`.
- Score: soma dos pesos dos termos únicos encontrados (principal 1, secundário 0,5) dividida por 2, limitada a 1.
