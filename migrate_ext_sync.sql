-- ============================================================
-- Tabelas espelho do sistema de logística externo
-- Origem: https://ctntlgvoefdbjxvfkahp.supabase.co
-- Executar no Supabase SQL Editor do projeto door-production-log
-- ============================================================

-- Programações de embarque
CREATE TABLE IF NOT EXISTS ext_programacoes_embarque (
  id                text PRIMARY KEY,
  driver_id         uuid,
  pedidos           text[],
  planned_date      date,
  realization_date  date,
  previsao_entrega  date,
  obs               text,
  criado_por        text,
  criado_em         timestamptz,
  production_status text,
  shipment_status   text,
  status            text,
  updated_at        timestamptz,
  estimated_weight  numeric,
  freight_value     numeric,
  synced_at         timestamptz DEFAULT now()
);

-- Entregas individuais por pedido
CREATE TABLE IF NOT EXISTS ext_entregas (
  id               integer PRIMARY KEY,
  programacao_id   text,
  pedido_id        text,
  status           text,
  entregue_em      timestamptz,
  numero_nota      text,
  ordem_entrega    numeric,
  qtd_kits         numeric,
  qtd_pallets      numeric,
  qtd_volumes      numeric,
  synced_at        timestamptz DEFAULT now()
);

-- Estado do último sync por tabela
CREATE TABLE IF NOT EXISTS ext_sync_state (
  tabela          text PRIMARY KEY,
  ultimo_sync     timestamptz DEFAULT '2020-01-01',
  total_registros integer DEFAULT 0,
  atualizado_em   timestamptz DEFAULT now()
);

INSERT INTO ext_sync_state (tabela) VALUES
  ('programacoes_embarque'),
  ('entregas')
ON CONFLICT (tabela) DO NOTHING;
