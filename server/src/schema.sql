CREATE TABLE IF NOT EXISTS usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  nome        text,
  senha_hash  text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (lower(email));

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
