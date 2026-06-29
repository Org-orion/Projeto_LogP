-- Cria a tabela usuarios se não existir
CREATE TABLE IF NOT EXISTS usuarios (
  id      SERIAL PRIMARY KEY,
  nome    TEXT NOT NULL,
  email   TEXT NOT NULL UNIQUE,
  senha   TEXT NOT NULL,
  perfil  TEXT DEFAULT 'Administrador',
  paginas TEXT[] DEFAULT '{}'
);

-- Insere o usuário admin padrão (senha em texto puro — será convertida para bcrypt no 1º login)
-- Altere o email e a senha antes de rodar em produção!
INSERT INTO usuarios (nome, email, senha, perfil, paginas)
VALUES (
  'Administrador',
  'admin@concrem.com.br',
  'Concrem@2026',
  'Administrador',
  ARRAY['home','machines','rastreabilidade','pedidos','metas','qualidade',
        'material-fsc','auditorias','relatorios','registros','usuarios',
        'configuracoes','ajuda']
)
ON CONFLICT (email) DO NOTHING;
