-- Migration: tabela de relatórios RNC/AC (AQ037)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rnc_relatorios (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_rnc           text UNIQUE NOT NULL,
  processo_cliente     text NOT NULL,
  lote_numero_pedido   text,
  obra                 text,
  data_abertura        date NOT NULL,
  data_fechamento      date,
  nota_fiscal          text,
  via_transportadora   boolean DEFAULT false,
  via_representante    boolean DEFAULT false,
  nome_representante   text,
  data_entrega_pedido  date,
  verificacao_entrega  text CHECK (verificacao_entrega IN ('sim','nao','nao_aplicavel')),
  familia_nc           integer CHECK (familia_nc BETWEEN 1 AND 15),
  reclamacao_descricao text,
  requisito            text,
  investigacao         text,
  evidencia            text,
  responsavel          text,
  visto                text,
  data_responsavel     date,
  status               text DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rnc_relatorios_data
  ON rnc_relatorios(data_abertura DESC);

ALTER TABLE rnc_relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rnc_allow_all" ON rnc_relatorios
  FOR ALL USING (true) WITH CHECK (true);
