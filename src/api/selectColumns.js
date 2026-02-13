export const EQUIPAMENTO_SELECT_COLUMNS = '*';
export const OBRA_SELECT_COLUMNS = '*';
export const VINCULO_SELECT_COLUMNS = '*,equipamento:equipamentos!left(id,codigo,nome),obra:obras!left(id,codigo,nome)';
export const MEDICAO_SELECT_COLUMNS = '*';
export const AUDIT_LOG_SELECT_COLUMNS = 'id,created_at,user_id,action,payload';
