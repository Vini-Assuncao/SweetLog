# DROP DATABASE IF EXISTS sweetlog;
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
    telefone VARCHAR(15),
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
		FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula)
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
    preco_unitario FLOAT NOT NULL,
    id_venda INT NOT NULL,
    id_estoque INT NOT NULL,
    CONSTRAINT FK_id_venda_vi
        FOREIGN KEY (id_venda) REFERENCES tbl_vendas(id_venda),
    CONSTRAINT FK_id_estoque_vi
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque)
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

CREATE OR REPLACE VIEW vw_movimentacoes AS
SELECT
    'Entrada' AS tipo,
    e.id_estoque,
    NULL AS id_venda,
    e.numero_matricula,
    e.data_entrada AS data_movimentacao
FROM tbl_estoques e
UNION ALL
SELECT
    'Saída' AS tipo,
    NULL AS id_estoque,
    v.id_venda,
    v.numero_matricula,
    v.data_pedido AS data_movimentacao
FROM tbl_vendas v;

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


/*
EXEMPLOS DE INSERÇÕES -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
*/

INSERT INTO tbl_matriculas (
	numero_matricula,
    setor
) VALUES (
	1001,
    'Administrativo'
);

INSERT INTO tbl_funcionarios (
    numero_matricula,
    senha,
    nome,
    telefone
) VALUES (
    1001,
    'senha123',
    'Joao da Silva',
    '11953898096'
);

INSERT INTO tbl_produtos (
    nome,
    necessidade_refrigeracao,
    cnpj_fabricante,
    marca,
    tamanho,
    descricao,
    imagem
) VALUES (
    'Iogurte de Morango',
    true,
    '12345678901234',
    'Nestlé',
    '170g',
    'Iogurte de morango da Nestlé de 170g',
    'backend/public/uploads/produtos/1786728996727-641206759.jpg'
);

INSERT INTO tbl_estoques (
    lote_producao,
    quantidade,
    inspecionado,
    data_entrada,
    data_validade,
    nota_fiscal,
    id_produto,
    numero_matricula
) VALUES (
    'S-100',
    400,
    false,
	CURDATE(),
    '2026-12-15',
    'backend/public/uploads/notas_fiscais/entrada/1786729031225-359000192.pdf',
    1,
    1001
);

/*
EXEMPLO DE VENDA
*/

START TRANSACTION;

SET @id_estoque_venda_exemplo = (
    SELECT id_estoque
    FROM tbl_estoques
    WHERE lote_producao = 'S-100'
      AND id_produto = 1
    ORDER BY id_estoque
    LIMIT 1
);

INSERT INTO tbl_vendas (
    comprador,
    data_pedido,
    data_entrega,
    nota_fiscal,
    numero_matricula
) VALUES (
    'Mercado Exemplo',
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 2 DAY),
    'backend/public/uploads/notas_fiscais/saida/1786729031225-359000192.pdf',
    1001
);

SET @id_venda_exemplo = LAST_INSERT_ID();

UPDATE tbl_estoques
SET quantidade = quantidade - 5
WHERE id_estoque = @id_estoque_venda_exemplo
  AND quantidade >= 5;

INSERT INTO tbl_vendas_itens (
    quantidade_venda_item,
    preco_unitario,
    id_venda,
    id_estoque
) VALUES (
    5,
    2.50,
    @id_venda_exemplo,
    @id_estoque_venda_exemplo
);

COMMIT;