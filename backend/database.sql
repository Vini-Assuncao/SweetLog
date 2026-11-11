CREATE DATABASE IF NOT EXISTS sweetlog;
USE sweetlog;
SET GLOBAL event_scheduler = ON;

CREATE TABLE IF NOT EXISTS tbl_matriculas (
	numero_matricula INT PRIMARY KEY,
    setor ENUM('Administrador', 'RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado') NOT NULL
);

CREATE TABLE IF NOT EXISTS tbl_funcionarios (
    numero_matricula INT PRIMARY KEY,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    CONSTRAINT uq_funcionarios_email UNIQUE (email),
    CONSTRAINT FK_numero_matricula_funcionarios
        FOREIGN KEY (numero_matricula) REFERENCES tbl_matriculas(numero_matricula)
);

CREATE TABLE IF NOT EXISTS tbl_produtos (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    necessidade_refrigeracao BOOLEAN NOT NULL,
    cnpj_fabricante VARCHAR(14) NOT NULL,
    marca VARCHAR(100),
    tamanho VARCHAR(20),
    descricao VARCHAR(200),
    imagem VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS tbl_estoques (
    id_estoque INT AUTO_INCREMENT PRIMARY KEY,
    lote_producao VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL,
    inspecionado BOOLEAN NOT NULL,
    data_validade DATE NOT NULL,
    data_entrada DATE NOT NULL,
    nota_fiscal VARCHAR(255) NOT NULL,
    id_produto INT NOT NULL,
    numero_matricula INT,
    CONSTRAINT FK_id_produto_estoques
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto),
	CONSTRAINT FK_numero_matricula_estoques
		FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula),
    CONSTRAINT chk_estoques_quantidade CHECK (quantidade >= 0)
);

CREATE TABLE IF NOT EXISTS tbl_vendas (
    id_venda INT AUTO_INCREMENT PRIMARY KEY,
    comprador VARCHAR(100) NOT NULL,
    data_pedido DATE NOT NULL,
    data_entrega DATE,
    nota_fiscal VARCHAR(255) NOT NULL,
    numero_matricula INT,
	CONSTRAINT FK_numero_matricula_vendas
		FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula)
);

CREATE TABLE IF NOT EXISTS tbl_vendas_itens (
    id_venda_item INT AUTO_INCREMENT PRIMARY KEY,
    quantidade_venda_item INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    id_venda INT NOT NULL,
    id_estoque INT NOT NULL,
    CONSTRAINT FK_id_venda_vi
        FOREIGN KEY (id_venda) REFERENCES tbl_vendas(id_venda),
    CONSTRAINT FK_id_estoque_vi
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque),
    CONSTRAINT chk_venda_item_quantidade CHECK (quantidade_venda_item > 0),
    CONSTRAINT chk_venda_item_preco CHECK (preco_unitario >= 0)
);

CREATE TABLE IF NOT EXISTS tbl_alertas (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    data_alerta DATE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em DATETIME NULL,
    id_estoque INT,
    id_produto INT,
    alerta_estoque_ativo INT GENERATED ALWAYS AS (
        CASE WHEN ativo = TRUE THEN id_estoque ELSE NULL END
    ) STORED,
    alerta_produto_ativo INT GENERATED ALWAYS AS (
        CASE WHEN ativo = TRUE THEN id_produto ELSE NULL END
    ) STORED,
    UNIQUE KEY uq_alerta_estoque_ativo (tipo, alerta_estoque_ativo),
    UNIQUE KEY uq_alerta_produto_ativo (tipo, alerta_produto_ativo),
    CONSTRAINT FK_id_produto_alertas
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto),
    CONSTRAINT FK_id_estoque_alertas
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque)
);

CREATE TABLE IF NOT EXISTS tbl_recuperacao_senha (
    id_recuperacao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_matricula INT NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    token_hash CHAR(64) NULL,
    tentativas TINYINT UNSIGNED NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    verificado_em DATETIME NULL,
    usado_em DATETIME NULL,
    INDEX idx_recuperacao_funcionario_status (numero_matricula, usado_em, expira_em),
    CONSTRAINT fk_recuperacao_funcionario
        FOREIGN KEY (numero_matricula)
        REFERENCES tbl_funcionarios(numero_matricula)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tbl_movimentacoes_estoque (
    id_movimentacao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_estoque INT NULL,
    id_produto INT NULL,
    id_venda INT NULL,
    numero_matricula INT NULL,
    tipo ENUM('Entrada', 'Baixa', 'Venda', 'Estorno', 'Ajuste') NOT NULL,
    quantidade INT NOT NULL,
    saldo_anterior INT NULL,
    saldo_posterior INT NULL,
    motivo VARCHAR(255) NULL,
    lote_producao VARCHAR(100) NULL,
    nome_produto VARCHAR(100) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_movimentacoes_data (criado_em),
    INDEX idx_movimentacoes_estoque (id_estoque, criado_em),
    INDEX idx_movimentacoes_produto (id_produto, criado_em),
    INDEX idx_movimentacoes_venda (id_venda),
    INDEX idx_movimentacoes_responsavel (numero_matricula, criado_em),
    CONSTRAINT chk_movimentacao_quantidade CHECK (quantidade > 0),
    CONSTRAINT fk_movimentacao_estoque
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque) ON DELETE SET NULL,
    CONSTRAINT fk_movimentacao_produto
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto) ON DELETE SET NULL,
    CONSTRAINT fk_movimentacao_venda
        FOREIGN KEY (id_venda) REFERENCES tbl_vendas(id_venda) ON DELETE SET NULL,
    CONSTRAINT fk_movimentacao_funcionario
        FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula) ON DELETE SET NULL
);

CREATE OR REPLACE VIEW vw_movimentacoes AS
SELECT
    m.tipo,
    m.id_estoque,
    m.id_venda,
    m.numero_matricula,
    DATE(m.criado_em) AS data_movimentacao
FROM tbl_movimentacoes_estoque m;

/*
Reconcilia diariamente os alertas como proteção adicional às atualizações
transacionais feitas pela API. O histórico resolvido é preservado.
*/

DROP EVENT IF EXISTS evt_alerta_validade_proxima;
DROP EVENT IF EXISTS evt_alerta_estoque_vencido;
DROP EVENT IF EXISTS evt_alerta_estoque_baixo;
DROP EVENT IF EXISTS evt_limpar_alertas_antigos;
DROP EVENT IF EXISTS evt_reconciliar_alertas;

DELIMITER $$

CREATE EVENT evt_reconciliar_alertas
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    UPDATE tbl_alertas a
    JOIN tbl_estoques e ON e.id_estoque = a.id_estoque
    SET a.ativo = FALSE,
        a.resolvido_em = CURRENT_TIMESTAMP
    WHERE a.tipo = 'Validade próxima'
      AND a.ativo = TRUE
      AND (
          e.quantidade <= 0
          OR DATEDIFF(e.data_validade, CURDATE()) < 0
          OR DATEDIFF(e.data_validade, CURDATE()) > 30
      );

    INSERT INTO tbl_alertas (tipo, data_alerta, ativo, id_estoque)
    SELECT 'Validade próxima', CURDATE(), TRUE, e.id_estoque
    FROM tbl_estoques e
    WHERE e.quantidade > 0
      AND DATEDIFF(e.data_validade, CURDATE()) BETWEEN 0 AND 30
    ON DUPLICATE KEY UPDATE id_alerta = id_alerta;

    UPDATE tbl_alertas a
    JOIN tbl_estoques e ON e.id_estoque = a.id_estoque
    SET a.ativo = FALSE,
        a.resolvido_em = CURRENT_TIMESTAMP
    WHERE a.tipo = 'Estoque vencido'
      AND a.ativo = TRUE
      AND (e.quantidade <= 0 OR e.data_validade >= CURDATE());

    INSERT INTO tbl_alertas (tipo, data_alerta, ativo, id_estoque)
    SELECT 'Estoque vencido', CURDATE(), TRUE, e.id_estoque
    FROM tbl_estoques e
    WHERE e.quantidade > 0
      AND e.data_validade < CURDATE()
    ON DUPLICATE KEY UPDATE id_alerta = id_alerta;

    UPDATE tbl_alertas a
    JOIN tbl_produtos p ON p.id_produto = a.id_produto
    LEFT JOIN (
        SELECT id_produto,
               COUNT(*) AS lotes_registrados,
               SUM(CASE WHEN data_validade >= CURDATE() THEN quantidade ELSE 0 END) AS quantidade_disponivel
        FROM tbl_estoques
        GROUP BY id_produto
    ) e ON e.id_produto = p.id_produto
    SET a.ativo = FALSE,
        a.resolvido_em = CURRENT_TIMESTAMP
    WHERE a.tipo = 'Estoque baixo'
      AND a.ativo = TRUE
      AND (
          COALESCE(e.lotes_registrados, 0) = 0
          OR COALESCE(e.quantidade_disponivel, 0) > 20
      );

    INSERT INTO tbl_alertas (tipo, data_alerta, ativo, id_produto)
    SELECT 'Estoque baixo', CURDATE(), TRUE, p.id_produto
    FROM tbl_produtos p
    LEFT JOIN (
        SELECT id_produto,
               COUNT(*) AS lotes_registrados,
               SUM(CASE WHEN data_validade >= CURDATE() THEN quantidade ELSE 0 END) AS quantidade_disponivel
        FROM tbl_estoques
        GROUP BY id_produto
    ) e ON e.id_produto = p.id_produto
    WHERE COALESCE(e.lotes_registrados, 0) > 0
      AND COALESCE(e.quantidade_disponivel, 0) <= 20
    ON DUPLICATE KEY UPDATE id_alerta = id_alerta;
END$$

DELIMITER ;