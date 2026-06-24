# DROP DATABASE IF EXISTS sweetlog;
CREATE DATABASE sweetlog;
USE sweetlog;

CREATE TABLE tbl_funcionarios (
    numero_matricula INT PRIMARY KEY,
    senha VARCHAR(20) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    cargo VARCHAR(50) NOT NULL
);

CREATE TABLE tbl_produtos (
    id_produto INT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    necessidade_refrigeramento BOOLEAN NOT NULL,
    cnpj_fabricante VARCHAR(14) NOT NULL,
    tamanho VARCHAR(20),
    descricao VARCHAR(200),
    imagem BLOB
);

CREATE TABLE tbl_estoques (
    id_estoque INT AUTO_INCREMENT PRIMARY KEY,
    lote_producao VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL,
    inspecionado BOOLEAN NOT NULL,
    data_validade DATE NOT NULL,
    nota_fiscal VARCHAR(50) NOT NULL,
    id_produto INT NOT NULL,
    CONSTRAINT FK_id_produto_estoques
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto)
);

CREATE TABLE tbl_vendas (
    id_venda INT AUTO_INCREMENT PRIMARY KEY,
    comprador VARCHAR(100) NOT NULL,
    data_pedido DATE NOT NULL,
    data_entrega DATE
);

CREATE TABLE tbl_vendas_itens (
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

CREATE TABLE tbl_alertas (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    data_alerta DATE NOT NULL,
    id_produto INT NOT NULL,
    id_estoque INT,
    CONSTRAINT FK_id_produto_alertas
        FOREIGN KEY (id_produto) REFERENCES tbl_produtos(id_produto),
    CONSTRAINT FK_id_estoque_alertas
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque)
);

CREATE TABLE tbl_log_movimentacoes (
    id_log_movimentacao INT AUTO_INCREMENT PRIMARY KEY,
    data_movimentacao DATE NOT NULL,
    tipo VARCHAR(50),
    numero_matricula INT NOT NULL,
    id_estoque INT,
    id_venda INT,
    CONSTRAINT FK_id_estoque_movimentacoes
        FOREIGN KEY (id_estoque) REFERENCES tbl_estoques(id_estoque),
    CONSTRAINT FK_id_venda_movimentacoes
        FOREIGN KEY (id_venda) REFERENCES tbl_vendas(id_venda),
    CONSTRAINT FK_numero_matricula_movimentacoes
        FOREIGN KEY (numero_matricula) REFERENCES tbl_funcionarios(numero_matricula)
);

DELIMITER $$

CREATE TRIGGER trg_log_movimentacoes_estoque
AFTER INSERT ON tbl_estoques
FOR EACH ROW
BEGIN
    INSERT INTO tbl_log_movimentacoes (
        data_movimentacao,
        tipo,
        id_estoque
    )
    VALUES (NOW(), 'Entrada', NEW.id_estoque);
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_log_movimentacoes_venda
AFTER INSERT ON tbl_vendas
FOR EACH ROW
BEGIN
    INSERT INTO tbl_log_movimentacoes (
        data_movimentacao,
        tipo_movimentacao,
        id_venda
    )
    VALUES (NOW(), 'Saída', NEW.id_venda);
END$$

DELIMITER ;

INSERT INTO tbl_funcionarios (
    numero_matricula,
    senha,
    nome,
    telefone,
    cargo
)
VALUES (
    1001,
    'senha123',
    'Joao da Silva',
    '11953898096',
    'Estoquista'
);