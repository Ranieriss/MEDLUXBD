export const EQUIPAMENTO_SELECT_COLUMNS = 'id,codigo,nome,modelo,tipo,status,deleted_at,created_at,updated_at';

export const OBRA_SELECT_COLUMNS = 'id,codigo,nome,local,status,deleted_at,created_at,updated_at';

export const VINCULO_SELECT_COLUMNS = [
  'id',
  'equipamento_id',
  'obra_id',
  'user_id',
  'inicio_em',
  'status',
  'termo_url',
  'termo_nome',
  'motivo_encerramento',
  'encerrou_em',
  'encerrado_por',
  'created_at',
  'updated_at',
  'deleted_at',
  'equipamento:equipamentos!left(id,codigo,nome)',
  'obra:obras!left(id,codigo,nome)'
].join(',');

export const MEDICAO_SELECT_COLUMNS = [
  'id',
  'equipamento_id',
  'obra_id',
  'user_id',
  'tipo',
  'valor',
  'unidade',
  'conforme',
  'data',
  'medido_em',
  'observacoes',
  'deleted_at',
  'created_at',
  'updated_at'
].join(',');

export const AUDIT_LOG_SELECT_COLUMNS = 'id,created_at,user_id,action,payload';
