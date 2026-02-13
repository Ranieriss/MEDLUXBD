const EQUIPAMENTO_STATUS = new Set(['ATIVO', 'INATIVO', 'ARQUIVADO', 'MANUTENCAO']);
const EQUIPAMENTO_TIPOS = new Set(['LUXIMETRO', 'TERMOMETRO', 'DECIBELIMETRO', 'OUTRO']);
const OBRA_STATUS = new Set(['ATIVA', 'INATIVA', 'ARQUIVADA', 'CONCLUIDA']);
const VINCULO_STATUS = new Set(['ATIVO', 'ENCERRADO']);

function required(value) {
  return String(value || '').trim();
}

export function validateEquipamento(payload) {
  if (!required(payload.codigo) || !required(payload.nome)) return 'Código e nome do equipamento são obrigatórios.';
  if (!required(payload.status) || !EQUIPAMENTO_STATUS.has(payload.status.toUpperCase())) return 'Status de equipamento inválido.';
  if (required(payload.tipo) && !EQUIPAMENTO_TIPOS.has(payload.tipo.toUpperCase())) return 'Tipo de equipamento inválido.';
  return null;
}

export function validateObra(payload) {
  if (!required(payload.codigo) || !required(payload.nome)) return 'Código e nome da obra são obrigatórios.';
  if (!required(payload.status) || !OBRA_STATUS.has(payload.status.toUpperCase())) return 'Status de obra inválido.';
  return null;
}

export function validateVinculo(payload) {
  if (!required(payload.equipamento_id) || !required(payload.user_id) || !required(payload.obra_id) || !required(payload.inicio_em)) return 'equipamento_id, user_id, obra_id e inicio_em são obrigatórios.';
  if (!required(payload.status) || !VINCULO_STATUS.has(payload.status.toUpperCase())) return 'Status de vínculo inválido.';
  return null;
}

export function validateMedicao(payload) {
  if (!required(payload.equipamento_id) || !required(payload.obra_id) || !required(payload.user_id) || !required(payload.tipo) || !required(payload.unidade) || !required(payload.medido_em) || !required(payload.data)) {
    return 'Campos obrigatórios: equipamento_id, obra_id, user_id, tipo, unidade, medido_em e data.';
  }
  if (!Number.isFinite(Number(payload.valor))) return 'Valor da medição deve ser numérico.';
  return null;
}
