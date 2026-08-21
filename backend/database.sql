# DROP DATABASE IF EXISTS sweetlog;
CREATE DATABASE IF NOT EXISTS sweetlog;
USE sweetlog;
SET GLOBAL event_scheduler = ON;

CREATE TABLE IF NOT EXISTS tbl_funcionarios (
    numero_matricula INT PRIMARY KEY,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    cargo VARCHAR(50) NOT NULL
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
    numero_matricula INT,
	CONSTRAINT FK_numero_matricula_vendas
		FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula)
);

CREATE TABLE IF NOT EXISTS tbl_vendas_itens (
    id_venda_item INT AUTO_INCREMENT PRIMARY KEY,
    quantidade_venda_item INT NOT NULL,
    preco_unitario FLOAT NOT NULL,
    id_venda INT NOT NULL,
    id_produto INT NOT NULL,
    CONSTRAINT FK_id_venda_vi
        FOREIGN KEY (id_venda) REFERENCES tbl_vendas(id_venda),
    CONSTRAINT FK_id_produto_vi
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto)
);

CREATE TABLE IF NOT EXISTS tbl_alertas (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    data_alerta DATE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true, 
    id_estoque INT,
	id_produto INT,
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
EVENTS PARA O TBL_ALERTAS -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*/

DELIMITER $$

CREATE EVENT evt_alerta_validade_proxima
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- Cria o alerta quando faltarem entre 0 e 30 dias
    INSERT INTO tbl_alertas (
        tipo,
        data_alerta,
        id_estoque
    )
    SELECT
        'Validade próxima',
        CURDATE(),
        e.id_estoque
    FROM tbl_estoques e
    WHERE DATEDIFF(e.data_validade, CURDATE()) BETWEEN 0 AND 30
      AND NOT EXISTS (
          SELECT 1
          FROM tbl_alertas a
          WHERE a.id_estoque = e.id_estoque
            AND a.tipo = 'Validade próxima'
      );
END$$


CREATE EVENT evt_alerta_estoque_vencido
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- Desativa o alerta de validade próxima
    UPDATE tbl_alertas a
    JOIN tbl_estoques e ON a.id_estoque = e.id_estoque
    SET a.ativo = FALSE
    WHERE a.tipo = 'Validade próxima'
      AND a.ativo = TRUE
      AND e.data_validade < CURDATE();

    -- Cria o alerta de estoque vencido
    INSERT INTO tbl_alertas (tipo, data_alerta, id_estoque)
    SELECT
        'Estoque vencido',
        CURDATE(),
        e.id_estoque
    FROM tbl_estoques e
    WHERE e.data_validade < CURDATE()
      AND NOT EXISTS (
          SELECT 1
          FROM tbl_alertas a
          WHERE a.id_estoque = e.id_estoque
            AND a.tipo = 'Estoque vencido'
      );
END$$


CREATE EVENT evt_alerta_estoque_baixo
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- Desativa os alertas ativos quando o produto deixa de estar com estoque baixo
    UPDATE tbl_alertas a
    JOIN (
        SELECT id_produto
        FROM tbl_estoques
        GROUP BY id_produto
        HAVING SUM(quantidade) > 20
    ) p ON a.id_produto = p.id_produto
    SET a.ativo = FALSE
    WHERE a.tipo = 'Estoque baixo'
      AND a.ativo = TRUE;

    -- Cria o alerta de estoque baixo
    INSERT INTO tbl_alertas (
        tipo,
        data_alerta,
        id_produto
    )
    SELECT
        'Estoque baixo',
        CURDATE(),
        e.id_produto
    FROM tbl_estoques e
    GROUP BY e.id_produto
    HAVING SUM(e.quantidade) <= 20
       AND NOT EXISTS (
           SELECT 1
           FROM tbl_alertas a
           WHERE a.id_produto = e.id_produto
             AND a.tipo = 'Estoque baixo'
             AND a.ativo = TRUE
       );
END$$

DELIMITER ;

CREATE EVENT evt_limpar_alertas_antigos
ON SCHEDULE EVERY 1 DAY
DO
DELETE FROM tbl_alertas
WHERE ativo = FALSE
  AND DATEDIFF(CURDATE(), data_alerta) > 40;


/*
EXEMPLOS DE INSERÇÕES -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
*/

INSERT INTO tbl_funcionarios (
    numero_matricula,
    senha,
    nome,
    telefone,
    cargo
) VALUES (
    1001,
    'senha123',
    'Joao da Silva',
    '11953898096',
    'Estoquista'
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
    'backend/public/uploads/notas_fiscais/1786729031225-359000192.pdf',
    1,
    1001
);