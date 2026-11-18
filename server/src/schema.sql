CREATE TABLE IF NOT EXISTS usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nome        text,
  senha_hash  text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (lower(email));
-- Sessões (tokens) emitidas antes desta data deixam de valer: usada ao redefinir a senha.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_alterada_em timestamptz;

CREATE TABLE IF NOT EXISTS produtos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  categoria      text NOT NULL DEFAULT '',
  quantidade     integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  foto           text,
  custo_unitario numeric(14,4) NOT NULL DEFAULT 0,
  preco_venda    numeric(14,4) NOT NULL DEFAULT 0,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  criado_por     text,
  atualizado_em  timestamptz,
  atualizado_por text
);
-- Partes do objeto (lista de {nome, quantidade, gramas, custoUnitario, precoUnitario}) e tamanho.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS partes jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS altura numeric(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS largura numeric(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS profundidade numeric(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_medida text NOT NULL DEFAULT 'cm'
  CHECK (unidade_medida IN ('cm', 'm'));

CREATE UNIQUE INDEX IF NOT EXISTS produtos_nome_uq ON produtos (lower(btrim(nome)));

CREATE TABLE IF NOT EXISTS movimentacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id     uuid,
  produto_nome   text NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade     integer NOT NULL,
  motivo         text NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  registrado_por text
);
CREATE INDEX IF NOT EXISTS movimentacoes_criado_em_idx ON movimentacoes (criado_em DESC);

CREATE TABLE IF NOT EXISTS vendas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id     uuid,
  produto_nome   text NOT NULL,
  quantidade     integer NOT NULL,
  valor_unitario numeric(14,4) NOT NULL,
  valor_total    numeric(14,4) NOT NULL,
  custo_unitario numeric(14,4) NOT NULL,
  custo_total    numeric(14,4) NOT NULL,
  lucro          numeric(14,4) NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  registrado_por text
);
CREATE INDEX IF NOT EXISTS vendas_criado_em_idx ON vendas (criado_em DESC);

CREATE TABLE IF NOT EXISTS pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente        text NOT NULL,
  contato        text NOT NULL DEFAULT '',
  itens          jsonb NOT NULL DEFAULT '[]',
  valor_total    numeric(14,4) NOT NULL DEFAULT 0,
  data_prevista  text,
  observacoes    text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'pedido'
                 CHECK (status IN ('pedido','producao','pronto','entregue','cancelado')),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  criado_por     text,
  atualizado_em  timestamptz,
  atualizado_por text,
  entregue_em    timestamptz
);
CREATE INDEX IF NOT EXISTS pedidos_criado_em_idx ON pedidos (criado_em DESC);

CREATE TABLE IF NOT EXISTS categorias (
  nome text PRIMARY KEY
);
CREATE UNIQUE INDEX IF NOT EXISTS categorias_nome_uq ON categorias (lower(nome));

CREATE TABLE IF NOT EXISTS config (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL
);

-- ---------- Integração com impressoras (o agente no notebook envia o estado; ver agente/README.md) ----------
CREATE TABLE IF NOT EXISTS impressoras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  provider      text NOT NULL DEFAULT 'flashforge',   -- hoje só 'flashforge'; outros (ex.: 'moonraker') entram sem mudar o esquema
  ip            text NOT NULL,                          -- editável: o agente lê o IP atual a cada consulta
  porta         integer NOT NULL DEFAULT 8898 CHECK (porta BETWEEN 1 AND 65535),
  numero_serie  text NOT NULL,
  ativa         boolean NOT NULL DEFAULT true,
  token_hash    text,                                   -- sha256 do token do agente; o token em si nunca é guardado
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz
);
-- O checkCode da impressora NÃO é guardado aqui: fica só no arquivo de configuração do agente (no notebook).

CREATE TABLE IF NOT EXISTS impressora_estado (
  impressora_id uuid PRIMARY KEY REFERENCES impressoras(id) ON DELETE CASCADE,
  snapshot      jsonb,                                  -- último estado normalizado recebido do agente
  recebido_em   timestamptz,                            -- último sinal do agente
  erro_codigo   text,                                   -- offline | credencial | lan | firmware | servico
  erro_mensagem text,
  job_atual     jsonb,                                  -- job em andamento; persistido para sobreviver a reinícios sem duplicar
  ui_visto_em   timestamptz                             -- última consulta da tela: define o ritmo de consulta do agente
);

CREATE TABLE IF NOT EXISTS impressao_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impressora_id    uuid NOT NULL REFERENCES impressoras(id) ON DELETE CASCADE,
  chave_job        text NOT NULL,                       -- arquivo + início do job (calculado uma única vez ao abrir o job)
  arquivo          text NOT NULL,
  iniciado_em      timestamptz NOT NULL,
  inicio_estimado  boolean NOT NULL DEFAULT false,      -- true quando o sistema só viu o job já em andamento
  concluido_em     timestamptz NOT NULL,
  duracao_segundos integer NOT NULL CHECK (duracao_segundos >= 0),
  resultado        text NOT NULL CHECK (resultado IN ('concluido', 'cancelado', 'erro', 'interrompido')),
  camada_total     integer,
  gramas_estimadas numeric(10,2),                       -- estimativa do fatiador (a API não informa o consumo real)
  materiais        jsonb,                               -- [{ferramenta, material, cor, gramas, slot}]
  produto_id       uuid,                                -- vínculo opcional (sem FK: o produto pode ser removido)
  observacoes      text NOT NULL DEFAULT '',
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (impressora_id, chave_job)                     -- garante que o mesmo job nunca seja registrado duas vezes
);
CREATE INDEX IF NOT EXISTS impressao_jobs_concluido_idx ON impressao_jobs (concluido_em DESC);
