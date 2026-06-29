-- ============================================================
-- Catálogo de Produtos — Uso e Consumo
-- ============================================================

CREATE TABLE IF NOT EXISTS produtos (
  codigo         text PRIMARY KEY,
  descricao      text NOT NULL,
  categoria      text NOT NULL DEFAULT '',
  preco_unitario numeric NOT NULL DEFAULT 0,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz DEFAULT now()
);

-- ── TAMPO_SC ──────────────────────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('005635', '100X3,0MM COMUM',  'TAMPO_SC',  18.7800),
  ('014256', '102X3,0MM COMUM',  'TAMPO_SC',  18.7800),
  ('005640', '60X3,0MM SUPER',   'TAMPO_SC',  14.9200),
  ('14230',  '110X3,0MM COMUM',  'TAMPO_SC',  20.6200),
  ('005645', '62X3,0MM SUPER',   'TAMPO_SC',  14.9200),
  ('008159', '20X3,0MM COMUM',   'TAMPO_SC',   4.0800),
  ('005641', '70X3,0MM SUPER',   'TAMPO_SC',  17.3100),
  ('44729',  '40X3,0MM COMUM',   'TAMPO_SC',   7.7700),
  ('005646', '72X3,0MM SUPER',   'TAMPO_SC',  17.3100),
  ('5631',   '60X3,0MM COMUM',   'TAMPO_SC',  11.4300),
  ('005642', '80X3,0MM SUPER',   'TAMPO_SC',  19.7100),
  ('5636',   '62X3,0MM COMUM',   'TAMPO_SC',  11.4899),
  ('005647', '82X3,0MM SUPER',   'TAMPO_SC',  19.7100),
  ('5632',   '70X3,0MM COMUM',   'TAMPO_SC',  13.2700),
  ('005643', '90X3,0MM SUPER',   'TAMPO_SC',  22.1100),
  ('005637', '72X3,0MM COMUM',   'TAMPO_SC',  13.2700),
  ('005633', '80X3,0MM COMUM',   'TAMPO_SC',  15.1100),
  ('005648', '92X3,0MM SUPER',   'TAMPO_SC',  22.1100),
  ('005634', '90X3,0MM COMUM',   'TAMPO_SC',  16.9400),
  ('005639', '92X3,0MM COMUM',   'TAMPO_SC',  16.9400),
  ('005644', '100X3,0MM SUPER',  'TAMPO_SC',  24.5000),
  ('006463', '110X3,0MM SUPER',  'TAMPO_SC',  26.9100)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── RODAPE_SC ─────────────────────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('14154', 'RODAPE PEÇA 240X20X10MM',   'RODAPE_SC', 12.4100),
  ('14153', 'RODAPE PEÇA 240X15X10MM',   'RODAPE_SC',  9.3900),
  ('13554', 'RODAPE PEÇA 240X10,0X10MM', 'RODAPE_SC',  6.3800),
  ('14152', 'RODAPE PEÇA 240X0,7X10MM',  'RODAPE_SC',  4.5800)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── QUADRO — SÓLIDA e COLMEIA ─────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('005718', '92X2,95CM SÓLIDA',   'QUADRO', 109.9500),
  ('005677', '92X2,95CM COLMEIA',  'QUADRO',  22.7100),
  ('005708', '90X2,95CM SÓLIDA',   'QUADRO', 109.9500),
  ('005667', '90X2,95CM COLMEIA',  'QUADRO',  22.7100),
  ('5716',   '82X2,95CM SÓLIDA',   'QUADRO',  99.8500),
  ('005675', '82X2,95CM COLMEIA',  'QUADRO',  22.8630),
  ('005706', '80X2,95CM SÓLIDA',   'QUADRO',  99.8500),
  ('005664', '80X2,95CM COLMEIA',  'QUADRO',  22.7100),
  ('005714', '72X2,95CM SÓLIDA',   'QUADRO',  89.7500),
  ('005673', '72X2,95CM COLMEIA',  'QUADRO',  21.7580),
  ('005704', '70X2,95CM SÓLIDA',   'QUADRO',  89.7500),
  ('005662', '70X2,95CM COLMEIA',  'QUADRO',  21.6200),
  ('005712', '62X2,95CM SÓLIDA',   'QUADRO',  79.6500),
  ('005671', '62X2,95CM COLMEIA',  'QUADRO',  20.6130),
  ('005700', '60X2,95CM SÓLIDA',   'QUADRO',  79.6500),
  ('005659', '60X2,95CM COLMEIA',  'QUADRO',  20.5700),
  ('006698', '57X2,95CM COLMEIA',  'QUADRO',  10.2300),
  ('18409',  '40X2,95CM SÓLIDA',   'QUADRO',  49.9300),
  ('18418',  '40X2,95CM COLMEIA',  'QUADRO',  17.2400),
  ('17632',  '20X2,95CM COLMEIA',  'QUADRO',  13.9100),
  ('018407', '110X2,95CM SÓLIDA',  'QUADRO', 130.1500),
  ('6466',   '110X2,95CM COLMEIA', 'QUADRO',  26.9100),
  ('014257', '102X2,95CM COLMEIA', 'QUADRO',  23.6900),
  ('005710', '100X2,95CM SÓLIDA',  'QUADRO', 120.0500),
  ('005669', '100X2,95CM COLMEIA', 'QUADRO',  23.6900),
  ('22613',  '102X2,95CM SÓLIDA',  'QUADRO', 120.0500)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── QUADRO — SARRAFO 6MM e 3MM ────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('005688', '100X2,95CM SARRAFO 6MM', 'SARRAFO',  44.1900),
  ('014079', '100X2,95CM SARRAFO 3MM', 'SARRAFO',  33.9900),
  ('000117', '102X2,95CM SARRAFO 6MM', 'SARRAFO',  44.1900),
  ('014080', '102X2,95CM SARRAFO 3MM', 'SARRAFO',  33.9900),
  ('970',    '110X2,95CM SARRAFO 6MM', 'SARRAFO',  51.7620),
  ('44909',  '110X2,95CM SARRAFO 3MM', 'SARRAFO',  38.0000),
  ('8158',   '20X2,95CM SARRAFO 6MM',  'SARRAFO',  13.0400),
  ('14068',  '60X2,95CM SARRAFO 3MM',  'SARRAFO',  21.1200),
  ('005680', '60X2,95CM SARRAFO 6MM',  'SARRAFO',  22.3300),
  ('014069', '62X2,95CM SARRAFO 3MM',  'SARRAFO',  21.1200),
  ('5690',   '62X2,95CM SARRAFO 6MM',  'SARRAFO',  22.3300),
  ('14070',  '70X2,95CM SARRAFO 3MM',  'SARRAFO',  23.9000),
  ('14071',  '72X2,95CM SARRAFO 3MM',  'SARRAFO',  23.9000),
  ('005682', '70X2,95CM SARRAFO 6MM',  'SARRAFO',  26.9500),
  ('014073', '80X2,95CM SARRAFO 3MM',  'SARRAFO',  26.9700),
  ('005692', '72X2,95CM SARRAFO 6MM',  'SARRAFO',  26.9500),
  ('005684', '80X2,95CM SARRAFO 6MM',  'SARRAFO',  32.1300),
  ('014077', '82X2,95CM SARRAFO 3MM',  'SARRAFO',  26.9700),
  ('005694', '82X2,95CM SARRAFO 6MM',  'SARRAFO',  32.1300),
  ('014075', '90X2,95CM SARRAFO 3MM',  'SARRAFO',  30.3300),
  ('5686',   '90X2,95CM SARRAFO 6MM',  'SARRAFO',  37.8800),
  ('005696', '92X2,95CM SARRAFO 6MM',  'SARRAFO',  37.8800),
  ('014078', '92X2,95CM SARRAFO 3MM',  'SARRAFO',  30.3300)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── BATENTE_SC ────────────────────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('005880', 'BATENTE PEÇA 218X9,0CM', 'BATENTE_SC', 14.1200),
  ('005881', 'BATENTE PEÇA 218X8,5CM', 'BATENTE_SC', 13.9000),
  ('005879', 'BATENTE PEÇA 218X7,5CM', 'BATENTE_SC', 11.9100),
  ('015065', 'BATENTE PEÇA 218X6,5CM', 'BATENTE_SC', 10.4400),
  ('005878', 'BATENTE PEÇA 218X5,5CM', 'BATENTE_SC',  8.9700),
  ('005885', 'BATENTE PEÇA 218X21CM',  'BATENTE_SC', 31.7700),
  ('005884', 'BATENTE PEÇA 218X18CM',  'BATENTE_SC', 27.3600),
  ('005883', 'BATENTE PEÇA 218X15CM',  'BATENTE_SC', 22.9500),
  ('005882', 'BATENTE PEÇA 218X12CM',  'BATENTE_SC', 18.3500),
  ('007152', 'BATENTE PEÇA 218X10CM',  'BATENTE_SC', 15.9000)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── ALIZAR_REGUA_SC ───────────────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('5894',   'ALIZAR REGUA 223X7,0X1,5CM',  'ALIZAR_REGUA_SC', 5.2700),
  ('15939',  'ALIZAR REGUA 223X10,0X1,0CM', 'ALIZAR_REGUA_SC', 5.0900),
  ('5893',   'ALIZAR REGUA 223X5,0X1,5CM',  'ALIZAR_REGUA_SC', 3.7900),
  ('012515', 'ALIZAR REGUA 223X11,0X1,0CM', 'ALIZAR_REGUA_SC', 5.5900),
  ('8134',   'ALIZAR REGUA 223X3,0X1,0CM',  'ALIZAR_REGUA_SC', 1.6000),
  ('005891', 'ALIZAR REGUA 223X5,0X1,0CM',  'ALIZAR_REGUA_SC', 2.5700),
  ('005892', 'ALIZAR REGUA 223X7,0X1,0CM',  'ALIZAR_REGUA_SC', 3.5800)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;

-- ── ALIZAR_ABA_SC ─────────────────────────────────────────────────────────────
INSERT INTO produtos (codigo, descricao, categoria, preco_unitario) VALUES
  ('5899',   'ALIZAR ABA 223X7,0 LAM. 3MM', 'ALIZAR_ABA_SC', 2.5600),
  ('005900', 'ALIZAR ABA 223X7,0 LAM. 3MM', 'ALIZAR_ABA_SC', 2.0500),
  ('007377', 'ALIZAR ABA 223X7,5 LAM. 3MM', 'ALIZAR_ABA_SC', 1.7000),
  ('005898', 'ALIZAR ABA 223X5,0 LAM. 3MM', 'ALIZAR_ABA_SC', 1.5500),
  ('007374', 'ALIZAR ABA 223X2,5 LAM. 3MM', 'ALIZAR_ABA_SC', 0.9100),
  ('005895', 'ALIZAR ABA 223X2,0 LAM. 3MM', 'ALIZAR_ABA_SC', 0.7900),
  ('016810', 'ALIZAR 1 L BIANCO',           'ALIZAR_ABA_SC', 309.8500)
ON CONFLICT (codigo) DO UPDATE
  SET descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      preco_unitario = EXCLUDED.preco_unitario;
