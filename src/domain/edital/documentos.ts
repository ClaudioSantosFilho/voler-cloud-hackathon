/**
 * Documentos de habilitação usualmente exigidos de MEI/ME (Lei 14.133/2021, arts. 62 a 70).
 * Lista orientativa: o edital é quem define o que é obrigatório.
 */
export const DOCUMENTOS_HABILITACAO_MEI: readonly string[] = [
  'Certificado da Condição de MEI (CCMEI) ou contrato social',
  'Comprovante de inscrição no CNPJ',
  'Certidão conjunta de débitos federais e dívida ativa da União (Receita/PGFN)',
  'Certificado de regularidade do FGTS (CRF)',
  'Certidão negativa de débitos trabalhistas (CNDT)',
  'Certidões de regularidade estadual e municipal',
  'Declaração de que não emprega menor (art. 68, VI)',
  'Atestado de capacidade técnica, se o edital pedir',
];

export interface ChecklistMei {
  prazo: string;
  diasUteisRestantes: number;
  valorEstimado?: number;
  documentos: readonly string[];
  proximoPasso: string;
}

export function proximoPasso(diasUteisRestantes: number, aberto: boolean): string {
  if (!aberto) return 'O prazo de propostas encerrou. Acompanhe novos editais do mesmo órgão.';
  if (diasUteisRestantes <= 2) {
    return 'Prazo muito curto: leia o edital hoje e confira se as certidões estão válidas antes de cadastrar a proposta.';
  }
  return 'Baixe o edital no link oficial, confira o termo de referência e emita as certidões que estiverem vencidas.';
}
