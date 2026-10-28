USE sweetlog;
SET GLOBAL event_scheduler = ON;

ALTER TABLE tbl_alertas
    ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN resolvido_em DATETIME NULL;

UPDATE tbl_alertas a
JOIN tbl_alertas anterior
  ON anterior.tipo = a.tipo
 AND anterior.ativo = TRUE
 AND a.ativo = TRUE
 AND anterior.id_alerta < a.id_alerta
 AND (
     (a.id_estoque IS NOT NULL AND anterior.id_estoque = a.id_estoque)
     OR
     (a.id_produto IS NOT NULL AND anterior.id_produto = a.id_produto)
 )
SET a.ativo = FALSE,
    a.resolvido_em = CURRENT_TIMESTAMP;

UPDATE tbl_alertas
SET resolvido_em = TIMESTAMP(data_alerta)
WHERE ativo = FALSE
  AND resolvido_em IS NULL;

ALTER TABLE tbl_alertas
    ADD COLUMN alerta_estoque_ativo INT GENERATED ALWAYS AS (
        CASE WHEN ativo = TRUE THEN id_estoque ELSE NULL END
    ) STORED,
    ADD COLUMN alerta_produto_ativo INT GENERATED ALWAYS AS (
        CASE WHEN ativo = TRUE THEN id_produto ELSE NULL END
    ) STORED,
    ADD UNIQUE KEY uq_alerta_estoque_ativo (tipo, alerta_estoque_ativo),
    ADD UNIQUE KEY uq_alerta_produto_ativo (tipo, alerta_produto_ativo);

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
