const pool = require('../config/database')
const AlertaRepository = require('./AlertaRepository')
const MovimentacaoEstoqueRepository = require('./MovimentacaoEstoqueRepository')

class EstoqueRepository {
    async selectAll(filtros = {}) {
        const condicoes = []
        const valores = []

        if (filtros.id_produto) {
            condicoes.push('e.id_produto = ?')
            valores.push(filtros.id_produto)
        }
        if (filtros.status === 'valido') {
            condicoes.push('e.quantidade > 0 AND e.data_validade > DATE_ADD(CURDATE(), INTERVAL 30 DAY)')
        } else if (filtros.status === 'proximo') {
            condicoes.push('e.quantidade > 0 AND DATEDIFF(e.data_validade, CURDATE()) BETWEEN 0 AND 30')
        } else if (filtros.status === 'vencido') {
            condicoes.push('e.quantidade > 0 AND e.data_validade < CURDATE()')
        } else if (filtros.status === 'zerado') {
            condicoes.push('e.quantidade <= 0')
        }
        if (filtros.buscar) {
            condicoes.push('(e.lote_producao LIKE ? OR p.nome LIKE ? OR CAST(e.id_estoque AS CHAR) LIKE ?)')
            const termo = `%${filtros.buscar}%`
            valores.push(termo, termo, termo)
        }

        const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
        let limite = ''
        if (filtros.limit) {
            limite = 'LIMIT ? OFFSET ?'
            valores.push(filtros.limit, filtros.offset || 0)
        }

        const [rows] = await pool.query(`
            SELECT e.*,
                   p.nome AS nome_produto,
                   p.marca AS marca_produto,
                   p.tamanho AS tamanho_produto,
                   f.nome AS nome_responsavel,
                   DATEDIFF(e.data_validade, CURDATE()) AS dias_para_validade,
                   CASE
                       WHEN e.quantidade <= 0 THEN 'zerado'
                       WHEN e.data_validade < CURDATE() THEN 'vencido'
                       WHEN DATEDIFF(e.data_validade, CURDATE()) <= 30 THEN 'proximo'
                       ELSE 'valido'
                   END AS status_validade
            FROM tbl_estoques e
            INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
            LEFT JOIN tbl_funcionarios f ON f.numero_matricula = e.numero_matricula
            ${where}
            ORDER BY e.data_validade ASC, e.id_estoque DESC
            ${limite}
        `, valores)
        return rows
    }

    async contar(filtros = {}) {
        const condicoes = []
        const valores = []
        if (filtros.id_produto) {
            condicoes.push('e.id_produto = ?')
            valores.push(filtros.id_produto)
        }
        if (filtros.status === 'valido') condicoes.push('e.quantidade > 0 AND e.data_validade > DATE_ADD(CURDATE(), INTERVAL 30 DAY)')
        else if (filtros.status === 'proximo') condicoes.push('e.quantidade > 0 AND DATEDIFF(e.data_validade, CURDATE()) BETWEEN 0 AND 30')
        else if (filtros.status === 'vencido') condicoes.push('e.quantidade > 0 AND e.data_validade < CURDATE()')
        else if (filtros.status === 'zerado') condicoes.push('e.quantidade <= 0')
        if (filtros.buscar) {
            condicoes.push('(e.lote_producao LIKE ? OR p.nome LIKE ? OR CAST(e.id_estoque AS CHAR) LIKE ?)')
            const termo = `%${filtros.buscar}%`
            valores.push(termo, termo, termo)
        }
        const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM tbl_estoques e
            INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
            ${where}
        `, valores)
        return Number(rows[0].total)
    }

    async selectById(id) {
        const [rows] = await pool.query(`
            SELECT e.*,
                   p.nome AS nome_produto,
                   p.marca AS marca_produto,
                   p.tamanho AS tamanho_produto,
                   f.nome AS nome_responsavel,
                   DATEDIFF(e.data_validade, CURDATE()) AS dias_para_validade,
                   CASE
                       WHEN e.quantidade <= 0 THEN 'zerado'
                       WHEN e.data_validade < CURDATE() THEN 'vencido'
                       WHEN DATEDIFF(e.data_validade, CURDATE()) <= 30 THEN 'proximo'
                       ELSE 'valido'
                   END AS status_validade
            FROM tbl_estoques e
            INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
            LEFT JOIN tbl_funcionarios f ON f.numero_matricula = e.numero_matricula
            WHERE e.id_estoque = ?
        `, [id])
        return rows[0]
    }

    async selectResumo() {
        const [rows] = await pool.query(`
            SELECT
                COUNT(*) AS total_lotes,
                SUM(CASE WHEN quantidade > 0 THEN 1 ELSE 0 END) AS lotes_com_saldo,
                COALESCE(SUM(CASE WHEN data_validade >= CURDATE() AND quantidade > 0 THEN quantidade ELSE 0 END), 0) AS quantidade_disponivel,
                SUM(CASE WHEN quantidade > 0 AND DATEDIFF(data_validade, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) AS vencimento_em_7_dias,
                SUM(CASE WHEN quantidade > 0 AND data_validade < CURDATE() THEN 1 ELSE 0 END) AS lotes_vencidos,
                SUM(CASE WHEN quantidade <= 0 THEN 1 ELSE 0 END) AS lotes_zerados
            FROM tbl_estoques
        `)
        const [produtosBaixos] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM (
                SELECT p.id_produto,
                       COALESCE(SUM(CASE WHEN e.data_validade >= CURDATE() THEN e.quantidade ELSE 0 END), 0) AS quantidade_disponivel,
                       COUNT(e.id_estoque) AS lotes_registrados
                FROM tbl_produtos p
                LEFT JOIN tbl_estoques e ON e.id_produto = p.id_produto
                GROUP BY p.id_produto
            ) resumo
            WHERE lotes_registrados > 0 AND quantidade_disponivel <= 20
        `)
        return {
            ...rows[0],
            total_lotes: Number(rows[0].total_lotes || 0),
            lotes_com_saldo: Number(rows[0].lotes_com_saldo || 0),
            quantidade_disponivel: Number(rows[0].quantidade_disponivel || 0),
            vencimento_em_7_dias: Number(rows[0].vencimento_em_7_dias || 0),
            lotes_vencidos: Number(rows[0].lotes_vencidos || 0),
            lotes_zerados: Number(rows[0].lotes_zerados || 0),
            produtos_estoque_baixo: Number(produtosBaixos[0].total || 0)
        }
    }

    async selectByProduto(idProduto) {
        const [rows] = await pool.query(`
            SELECT e.*,
                   p.nome AS nome_produto,
                   p.marca AS marca_produto,
                   p.tamanho AS tamanho_produto,
                   f.nome AS nome_responsavel,
                   DATEDIFF(e.data_validade, CURDATE()) AS dias_para_validade,
                   CASE
                       WHEN e.quantidade <= 0 THEN 'zerado'
                       WHEN e.data_validade < CURDATE() THEN 'vencido'
                       WHEN DATEDIFF(e.data_validade, CURDATE()) <= 30 THEN 'proximo'
                       ELSE 'valido'
                   END AS status_validade
            FROM tbl_estoques e
            INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
            LEFT JOIN tbl_funcionarios f ON f.numero_matricula = e.numero_matricula
            WHERE e.id_produto = ?
            ORDER BY e.data_validade ASC, e.id_estoque DESC
        `, [idProduto])
        return rows
    }

    async insert(estoqueData) {
        const {
            lote_producao, quantidade, inspecionado, data_validade,
            data_entrada, id_produto, numero_matricula, nota_fiscal
        } = estoqueData
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [result] = await connection.query(
                `INSERT INTO tbl_estoques
                    (lote_producao, quantidade, inspecionado, data_validade, data_entrada,
                     id_produto, numero_matricula, nota_fiscal)
                 VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?, ?)`,
                [lote_producao, quantidade, inspecionado, data_validade,
                    data_entrada,
                    id_produto, numero_matricula, nota_fiscal]
            )
            const [snapshotRows] = await connection.query(`
                SELECT e.id_estoque, e.id_produto, e.lote_producao, e.quantidade, p.nome AS nome_produto
                FROM tbl_estoques e
                INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
                WHERE e.id_estoque = ?
            `, [result.insertId])
            const snapshot = snapshotRows[0]
            await MovimentacaoEstoqueRepository.registrar(connection, {
                id_estoque: result.insertId,
                id_produto: snapshot.id_produto,
                numero_matricula,
                tipo: 'Entrada',
                quantidade: Number(quantidade),
                saldo_anterior: 0,
                saldo_posterior: Number(snapshot.quantidade),
                motivo: 'Entrada de lote no estoque',
                lote_producao: snapshot.lote_producao,
                nome_produto: snapshot.nome_produto
            })
            await AlertaRepository.sincronizarEstoque(connection, result.insertId)
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async set(id, estoqueData, operadorMatricula = null) {
        const camposPermitidos = [
            'lote_producao', 'quantidade', 'inspecionado', 'data_validade',
            'data_entrada', 'id_produto', 'numero_matricula', 'nota_fiscal'
        ]
        const campos = Object.entries(estoqueData).filter(([campo]) => camposPermitidos.includes(campo))
        if (campos.length === 0) return 0

        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [estoques] = await connection.query(
                'SELECT id_produto, lote_producao, quantidade FROM tbl_estoques WHERE id_estoque = ? FOR UPDATE', [id]
            )
            if (estoques.length === 0) {
                await connection.rollback()
                return 0
            }

            const produtoAntigo = Number(estoques[0].id_produto)
            const atribuicoes = campos.map(([campo]) => `${campo} = ?`).join(', ')
            const valores = campos.map(([, valor]) => valor)
            await connection.query(
                `UPDATE tbl_estoques SET ${atribuicoes} WHERE id_estoque = ?`,
                [...valores, id]
            )
            const [atualizado] = await connection.query(`
                SELECT e.id_produto, e.lote_producao, e.quantidade, p.nome AS nome_produto
                FROM tbl_estoques e
                INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
                WHERE e.id_estoque = ?
            `, [id])
            if (campos.some(([campo]) => campo === 'quantidade')) {
                const anterior = Number(estoques[0].quantidade)
                const posterior = Number(atualizado[0].quantidade)
                if (anterior !== posterior) {
                    await MovimentacaoEstoqueRepository.registrar(connection, {
                        id_estoque: id,
                        id_produto: atualizado[0].id_produto,
                        numero_matricula: operadorMatricula,
                        tipo: 'Ajuste',
                        quantidade: Math.abs(posterior - anterior),
                        saldo_anterior: anterior,
                        saldo_posterior: posterior,
                        motivo: 'Ajuste manual do saldo do lote',
                        lote_producao: atualizado[0].lote_producao,
                        nome_produto: atualizado[0].nome_produto
                    })
                }
            }
            await AlertaRepository.sincronizarEstoque(connection, id)
            if (produtoAntigo !== Number(atualizado[0].id_produto)) {
                await AlertaRepository.sincronizarProduto(connection, produtoAntigo)
            }
            await connection.commit()
            return 1
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async decreaseQuantity(id, quantidade, numeroMatricula = null, motivo = 'Baixa manual de estoque') {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [estoques] = await connection.query(`
                SELECT e.id_estoque, e.id_produto, e.lote_producao, e.quantidade,
                       e.data_validade, (e.data_validade >= CURDATE()) AS lote_valido,
                       p.nome AS nome_produto
                FROM tbl_estoques e
                INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
                WHERE e.id_estoque = ?
                FOR UPDATE
            `, [id])
            if (estoques.length === 0) {
                await connection.rollback()
                return null
            }

            const estoque = estoques[0]
            const anterior = Number(estoque.quantidade)
            if (anterior < quantidade || Number(estoque.lote_valido) !== 1) {
                await connection.rollback()
                return { affectedRows: 0, quantidadeAnterior: anterior, quantidadeAtual: anterior }
            }

            await connection.query(
                'UPDATE tbl_estoques SET quantidade = quantidade - ? WHERE id_estoque = ?',
                [quantidade, id]
            )
            const posterior = anterior - quantidade
            await MovimentacaoEstoqueRepository.registrar(connection, {
                id_estoque: id,
                id_produto: estoque.id_produto,
                numero_matricula: numeroMatricula,
                tipo: 'Baixa',
                quantidade,
                saldo_anterior: anterior,
                saldo_posterior: posterior,
                motivo,
                lote_producao: estoque.lote_producao,
                nome_produto: estoque.nome_produto
            })
            await AlertaRepository.sincronizarEstoque(connection, id)
            await connection.commit()
            return { affectedRows: 1, quantidadeAnterior: anterior, quantidadeAtual: posterior }
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async hasSalesItems(id) {
        const [rows] = await pool.query(
            'SELECT id_venda_item FROM tbl_vendas_itens WHERE id_estoque = ? LIMIT 1', [id]
        )
        return rows.length > 0
    }

    async hasAlerts(id) {
        const [rows] = await pool.query(
            'SELECT id_alerta FROM tbl_alertas WHERE id_estoque = ? LIMIT 1', [id]
        )
        return rows.length > 0
    }

    async delete(id) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [estoques] = await connection.query(
                'SELECT id_produto FROM tbl_estoques WHERE id_estoque = ? FOR UPDATE', [id]
            )
            if (estoques.length === 0) {
                await connection.commit()
                return 0
            }
            const [result] = await connection.query('DELETE FROM tbl_estoques WHERE id_estoque = ?', [id])
            if (result.affectedRows > 0) {
                await AlertaRepository.sincronizarProduto(connection, estoques[0].id_produto)
            }
            await connection.commit()
            return result.affectedRows
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }
}

module.exports = new EstoqueRepository()
