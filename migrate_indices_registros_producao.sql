-- Índices para eliminar varreduras completas em registros_producao
-- Execute no Supabase SQL Editor

-- Acelera queries por data (dashboard, fetchDados, producao_*_resumo)
CREATE INDEX IF NOT EXISTS idx_rp_data
  ON registros_producao (data);

-- Acelera queries por máquina (modal de histórico)
CREATE INDEX IF NOT EXISTS idx_rp_maquina
  ON registros_producao (maquina);

-- Índice composto: máquina + data (modal com filtro de ano)
CREATE INDEX IF NOT EXISTS idx_rp_maquina_data
  ON registros_producao (maquina, data DESC);

-- Verificação
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'registros_producao'
ORDER BY indexname;
