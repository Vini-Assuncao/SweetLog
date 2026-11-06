const pool = require('../config/database')

class MovimentacaoEstoqueRepository {
    async listar(filtros = {}) {
        const condicoes = []
        const valores = []
        if (filtros.id_estoque) {
            condicoes.push('m.id_estoque = ?')
            valores.push(filtros.id_estoque)
        }
        if (filtros.id_produto) {
            condicoes.push('m.id_produto = ?')
            valores.push(filtros.id_produto)
        }
        if (filtros.tipo) {
            condicoes.push('m.tipo = ?')
            valores.push(filtros.tipo)
        }
        const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
        const [contagem] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM tbl_movimentacoes_estoque m
            ${where}
        `, valores)
        const [rows] = await pool.query(`
            SELECT m.*, f.nome AS nome_responsavel
            FROM tbl_movimentacoes_estoque m
            LEFT JOIN tbl_funcionarios f ON f.numero_matricula = m.numero_matricula
            ${where}
            ORDER BY m.criado_em DESC, m.id_movimentacao DESC
            LIMIT ? OFFSET ?
        `, [...valores, filtros.limit || 50, filtros.offset || 0])
        return { rows, total: Number(contagem[0].total || 0) }
    }

    async listarPorEstoque(idEstoque) {
        return this.listar({ id_estoque: idEstoque, limit: 100, offset: 0 })
    }

    async registrar(connection, dados) {
        const {
            id_estoque = null,
            id_produto = null,
            id_venda = null,
            numero_matricula = null,
            tipo,
            quantidade,
            saldo_anterior = null,
            saldo_posterior = null,
            motivo = null,
            lote_producao = null,
            nome_produto = null
        } = dados

        await connection.query(`
            INSERT INTO tbl_movimentacoes_estoque
                (id_estoque, id_produto, id_venda, numero_matricula, tipo,
                 quantidade, saldo_anterior, saldo_posterior, motivo,
                 lote_producao, nome_produto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id_estoque, id_produto, id_venda, numero_matricula, tipo,
            quantidade, saldo_anterior, saldo_posterior, motivo,
            lote_producao, nome_produto
        ])
    }
}

module.exports = new MovimentacaoEstoqueRepository()
