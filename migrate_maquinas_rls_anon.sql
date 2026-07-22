-- Corrige RLS de "maquinas": o cliente do navegador usa sempre o papel anon
-- (login é via cookie próprio, não sessão do Supabase Auth) — a leitura já
-- funciona (tem policy de SELECT pro anon), mas faltava liberar escrita.
-- Policy adicional, não substitui nada existente (RLS é permissiva/OR).
CREATE POLICY "maquinas_write_anon" ON maquinas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
