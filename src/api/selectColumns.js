export const EQUIPAMENTO_SELECT_COLUMNS = [
  'id',
  'codigo',
  'nome',
  'modelo',
  'tipo',
  'numero_serie',
  'status',
  'ultima_calibracao',
  'proxima_calibracao',
  'localidade',
  'recalibrar_em',
  'observacoes',
  'created_at',
  'updated_at'
].join(',');

export const OBRA_SELECT_COLUMNS = [
  'id',
  'codigo',
  'nome',
  'concessionaria',
  'rodovia',
  'km_inicio',
  'km_fim',
  'cidade',
  'uf',
  'status',
  'observacoes',
  'created_at',
  'updated_at',
  'contrato',
  'local',
  'responsavel'
].join(',');

export const VINCULO_SELECT_COLUMNS = [
  'id',
  'equipamento_id',
  'user_id',
  'obra_id',
  'inicio_em',
  'fim_em',
  'status',
  'motivo_encerramento',
  'encerrado_por',
  'encerrou_em',
  'fim',
  'termo_url',
  'termo_nome',
  'created_at',
  'updated_at',
  'equipamento:equipamentos!left(id,codigo,nome)',
  'obra:obras!left(id,codigo,nome)'
].join(',');

export const MEDICAO_SELECT_COLUMNS = [
  'id',
  'equipamento_id',
  'obra_id',
  'vinculo_id',
  'user_id',
  'tipo',
  'valor',
  'unidade',
  'conforme',
  'observacoes',
  'medido_em',
  'created_at',
  'updated_at',
  'data',
  'rl',
  'qd',
  'cor',
  'anexos'
].join(',');

export const AUDIT_LOG_SELECT_COLUMNS = [
  'id',
  'occurred_at',
  'actor_id',
  'action',
  'entity',
  'entity_id',
  'severity',
  'details',
  'ip',
  'user_agent'
].join(',');
