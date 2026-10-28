const pool = require('../config/database')

class AlertaRepository {
    async sincronizarTudo() {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [estoques] = await connection.query(
                'SELECT id_estoque FROM tbl_estoques ORDER BY id_estoque'
            )
            for (const estoque of estoques) {
                await this.sincronizarEstoque(connection, estoque.id_estoque, false)
            }

            const [produtos] = await connection.query(
                'SELECT id_produto FROM tbl_produtos ORDER BY id_produto'
            )
            for (const produto of produtos) {
                await this.sincronizarProduto(connection, produto.id_produto)
            }
            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async sincronizarEstoque(connection, idEstoque, atualizarProduto = true) {
        const [rows] = await connection.query(`
            SELECT e.id_estoque, e.id_produto, e.quantidade,
                   DATEDIFF(e.data_validade, CURDATE()) AS dias_para_validade
            FROM tbl_estoques e
            WHERE e.id_estoque = ?
            FOR UPDATE
        `, [idEstoque])
        const estoque = rows[0]
        if (!estoque) return null

        const possuiSaldo = Number(estoque.quantidade) > 0
        await this.atualizarEstado(
            connection,
            'Validade próxima',
            'id_estoque',
            estoque.id_estoque,
            possuiSaldo && estoque.dias_para_validade >= 0 && estoque.dias_para_validade <= 30
        )
        await this.atualizarEstado(
            connection,
            'Estoque vencido',
            'id_estoque',
            estoque.id_estoque,
            possuiSaldo && estoque.dias_para_validade < 0
        )
        if (atualizarProduto) {
            await this.sincronizarProduto(connection, estoque.id_produto)
        }
        return estoque.id_produto
    }

    async sincronizarProduto(connection, idProduto) {
        const [produtos] = await connection.query(
            'SELECT id_produto FROM tbl_produtos WHERE id_produto = ? FOR UPDATE',
            [idProduto]
        )
        if (produtos.length === 0) return

        const [rows] = await connection.query(`
            SELECT COUNT(*) AS lotes_registrados,
                   COALESCE(SUM(
                       CASE WHEN e.data_validade >= CURDATE() THEN e.quantidade ELSE 0 END
                   ), 0) AS quantidade_disponivel
            FROM tbl_estoques e
            WHERE e.id_produto = ?
        `, [idProduto])
        const estoqueBaixo = Number(rows[0].lotes_registrados) > 0 &&
            Number(rows[0].quantidade_disponivel) <= 20
        await this.atualizarEstado(
            connection,
            'Estoque baixo',
            'id_produto',
            idProduto,
            estoqueBaixo
        )
    }

    async atualizarEstado(connection, tipo, colunaAlvo, idAlvo, deveEstarAtivo) {
        if (!['id_estoque', 'id_produto'].includes(colunaAlvo)) {
            throw new Error('Coluna de alvo de alerta inválida')
        }

        if (!deveEstarAtivo) {
            await connection.query(`
                UPDATE tbl_alertas
                SET ativo = FALSE, resolvido_em = CURRENT_TIMESTAMP
                WHERE tipo = ? AND ${colunaAlvo} = ? AND ativo = TRUE
            `, [tipo, idAlvo])
            return
        }

        await connection.query(`
            INSERT INTO tbl_alertas (tipo, data_alerta, ativo, ${colunaAlvo})
            VALUES (?, CURDATE(), TRUE, ?)
            ON DUPLICATE KEY UPDATE id_alerta = id_alerta
        `, [tipo, idAlvo])
    }

    async selectAll() {
        const [rows] = await pool.query(`
            SELECT a.*,
                   p.nome AS nome_produto,
                   e.lote_producao,
                   e.quantidade AS quantidade_estoque,
                   e.data_validade
            FROM tbl_alertas a
            LEFT JOIN tbl_estoques e ON e.id_estoque = a.id_estoque
            LEFT JOIN tbl_produtos p ON p.id_produto = COALESCE(a.id_produto, e.id_produto)
            ORDER BY a.ativo DESC, a.data_alerta DESC, a.id_alerta DESC
        `)
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query(`
            SELECT a.*,
                   p.nome AS nome_produto,
                   e.lote_producao,
                   e.quantidade AS quantidade_estoque,
                   e.data_validade
            FROM tbl_alertas a
            LEFT JOIN tbl_estoques e ON e.id_estoque = a.id_estoque
            LEFT JOIN tbl_produtos p ON p.id_produto = COALESCE(a.id_produto, e.id_produto)
            WHERE a.id_alerta = ?
        `, [id])
        return rows[0]
    }
}

module.exports = new AlertaRepository()
