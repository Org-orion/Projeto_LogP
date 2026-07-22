-- AQ003 (Pintura do Friso) ainda não tinha coluna própria em
-- registros_producao — AQ022 (Usinagem do Friso, usinagem_friso_aq022) já
-- existia. Segue a mesma convenção das demais colunas de rastreabilidade
-- (texto livre, guarda o lote de origem).
ALTER TABLE registros_producao
  ADD COLUMN IF NOT EXISTS pintura_friso_aq003 text;
