-- ============================================================
-- Responsáveis fixos por setor — propaga para todos os meses
-- Fonte: indicadores_producao abril/2026
-- Execute no Supabase SQL Editor
-- ============================================================

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '343', nome_supervisor  = 'Thallison dos Reis Silva'
WHERE setor = 'Aplicação de Borracha';

UPDATE indicadores_producao SET
  matricula_encarregado = '23',  nome_encarregado = 'Eline Silva Freitas',
  matricula_supervisor  = '57',  nome_supervisor  = 'João Vitor Silva Leite'
WHERE setor = 'Coladeira de Alizar';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '393', nome_supervisor  = 'Rafael de Sousa Lima'
WHERE setor = 'Colagem de Bordas';

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '23',  nome_supervisor  = 'Eline Silva Freitas'
WHERE setor = 'Destopadeira 45°';

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '23',  nome_supervisor  = 'Eline Silva Freitas'
WHERE setor = 'Destopadeira de Alizar';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '419', nome_supervisor  = 'Henrique Braz Bezerra'
WHERE setor = 'Destopadeira de Cabeceiras';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '419', nome_supervisor  = 'Henrique Braz Bezerra'
WHERE setor = 'Embalagem de Kits';

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '343', nome_supervisor  = 'Thallison dos Reis Silva'
WHERE setor = 'Embalagem de Perfil';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '419', nome_supervisor  = 'Henrique Braz Bezerra'
WHERE setor = 'Embalagem de Portas';

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '23',  nome_supervisor  = 'Eline Silva Freitas'
WHERE setor = 'Fatiadeira de papel';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '419', nome_supervisor  = 'Henrique Braz Bezerra'
WHERE setor = 'Furação e corte das portas';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '25',  nome_supervisor  = 'Lucas Neves da Silva'
WHERE setor = 'Esquadrejadeira';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '1215',nome_supervisor  = 'Juliana Costa Mendes'
WHERE setor = 'Expedição';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '25',  nome_supervisor  = 'Lucas Neves da Silva'
WHERE setor = 'Lixadeira (Tampos)';

UPDATE indicadores_producao SET
  matricula_encarregado = '364', nome_encarregado = 'Edmar dos Santos Medina',
  matricula_supervisor  = NULL,  nome_supervisor  = NULL
WHERE setor = 'Marcenaria';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '59',  nome_supervisor  = 'Sergio Melo Garcia'
WHERE setor = 'Material dos Quadros (reguas, topas, sarrafos, lamelas)';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '807', nome_supervisor  = 'Pablo Martins Carvalho'
WHERE setor = 'Mesa de Montagem de quadro';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '807', nome_supervisor  = 'Pablo Martins Carvalho'
WHERE setor = 'Montadora De Grade';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '419', nome_supervisor  = 'Henrique Braz Bezerra'
WHERE setor = 'Montagem do Kit';

UPDATE indicadores_producao SET
  matricula_encarregado = '23',  nome_encarregado = 'Eline Silva Freitas',
  matricula_supervisor  = '57',  nome_supervisor  = 'João Vitor Silva Leite'
WHERE setor = 'Multiserra Perfil';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '147', nome_supervisor  = 'Luis Felipe Silva Alves'
WHERE setor = 'Pintura de Portas';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '147', nome_supervisor  = 'Luis Felipe Silva Alves'
WHERE setor = 'Pintura de Tampos';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '500', nome_supervisor  = 'John Kennedy de Oliveira Gomes'
WHERE setor = 'Pintura do Friso';

UPDATE indicadores_producao SET
  matricula_encarregado = '23',  nome_encarregado = 'Eline Silva Freitas',
  matricula_supervisor  = '57',  nome_supervisor  = 'João Vitor Silva Leite'
WHERE setor = 'Plaina moldureira de Alizar';

UPDATE indicadores_producao SET
  matricula_encarregado = '23',  nome_encarregado = 'Eline Silva Freitas',
  matricula_supervisor  = '57',  nome_supervisor  = 'João Vitor Silva Leite'
WHERE setor = 'Plaina Moldureira de Batente';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '807', nome_supervisor  = 'Pablo Martins Carvalho'
WHERE setor = 'Prensagem de portas';

UPDATE indicadores_producao SET
  matricula_encarregado = '7',   nome_encarregado = 'Gabriel Ramos da Silva',
  matricula_supervisor  = '415', nome_supervisor  = 'Raimundo Nonato Carvalho Borges'
WHERE setor = 'Recobridora de Perfil';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '25',  nome_supervisor  = 'Lucas Neves da Silva'
WHERE setor = 'Recobridora de Tampos';

UPDATE indicadores_producao SET
  matricula_encarregado = '23',  nome_encarregado = 'Eline Silva Freitas',
  matricula_supervisor  = '57',  nome_supervisor  = 'João Vitor Silva Leite'
WHERE setor = 'Seccionadora 01';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '25',  nome_supervisor  = 'Lucas Neves da Silva'
WHERE setor = 'Seccionadora 02';

UPDATE indicadores_producao SET
  matricula_encarregado = '165', nome_encarregado = 'Domingos José Vilar de Souza',
  matricula_supervisor  = '1052',nome_supervisor  = 'Geovane Mendes Araujo'
WHERE setor = 'Usinagem de Batentes';

UPDATE indicadores_producao SET
  matricula_encarregado = NULL,  nome_encarregado = NULL,
  matricula_supervisor  = '500', nome_supervisor  = 'John Kennedy de Oliveira Gomes'
WHERE setor = 'Usinagem de Frisos';
