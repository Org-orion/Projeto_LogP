
-- ============================================================
-- MATERIAL CERTIFICADO FSC — Supabase Setup
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela principal
CREATE TABLE IF NOT EXISTS public.material_certificado_fsc (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              timestamptz DEFAULT now() NOT NULL,
  data_recebimento        date NOT NULL,
  tipo_material           text NOT NULL CHECK (tipo_material IN ('Papelão', 'Papel', 'MDF', 'Colmeia')),
  fornecedor              text NOT NULL DEFAULT '',
  quantidade              numeric(12, 3) NOT NULL DEFAULT 0,
  unidade                 text NOT NULL DEFAULT 'kg',
  numero_nota_fiscal      text NOT NULL DEFAULT '',
  codigo_rq               text NOT NULL DEFAULT '',
  imagem_nf_url           text,
  numero_certificado_fsc  text NOT NULL DEFAULT '',
  validade_certificado    date,
  operador                text NOT NULL DEFAULT '',
  status                  text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado')),
  observacoes             text NOT NULL DEFAULT ''
);

-- 2. Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_mat_fsc_data        ON public.material_certificado_fsc (data_recebimento DESC);
CREATE INDEX IF NOT EXISTS idx_mat_fsc_tipo        ON public.material_certificado_fsc (tipo_material);
CREATE INDEX IF NOT EXISTS idx_mat_fsc_codigo_rq   ON public.material_certificado_fsc (codigo_rq);
CREATE INDEX IF NOT EXISTS idx_mat_fsc_certificado ON public.material_certificado_fsc (numero_certificado_fsc);
CREATE INDEX IF NOT EXISTS idx_mat_fsc_status      ON public.material_certificado_fsc (status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.material_certificado_fsc ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ler todos os registros
CREATE POLICY "Leitura autenticada" ON public.material_certificado_fsc
  FOR SELECT TO authenticated USING (true);

-- Política: usuários autenticados podem inserir
CREATE POLICY "Inserção autenticada" ON public.material_certificado_fsc
  FOR INSERT TO authenticated WITH CHECK (true);

-- Política: usuários autenticados podem atualizar
CREATE POLICY "Atualização autenticada" ON public.material_certificado_fsc
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Política: usuários autenticados podem excluir
CREATE POLICY "Exclusão autenticada" ON public.material_certificado_fsc
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 4. Storage bucket para imagens de Nota Fiscal
-- Execute separadamente no SQL Editor ou via Dashboard:
-- ============================================================
-- No Dashboard do Supabase: Storage → New bucket
--   Name: nf-materiais-fsc
--   Public: true (para permitir visualização das imagens)

-- Ou via SQL (requer extensão storage habilitada):
INSERT INTO storage.buckets (id, name, public)
VALUES ('nf-materiais-fsc', 'nf-materiais-fsc', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: upload apenas por usuários autenticados
CREATE POLICY "Upload NF autenticado" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nf-materiais-fsc');

CREATE POLICY "Leitura NF pública" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'nf-materiais-fsc');

CREATE POLICY "Update NF autenticado" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'nf-materiais-fsc');

CREATE POLICY "Delete NF autenticado" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'nf-materiais-fsc');

-- ============================================================
-- Verificação: após executar, confirme:
-- SELECT count(*) FROM public.material_certificado_fsc;
-- ============================================================
