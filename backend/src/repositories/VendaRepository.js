const pool = require('../config/database')
const AlertaRepository = require('./AlertaRepository')
const MovimentacaoEstoqueRepository = require('./MovimentacaoEstoqueRepository')

const consultaVendas = `
    SELECT v.*,
           vi.id_venda_item,
           vi.quantidade_venda_item,
           vi.preco_unitario,
           vi.id_estoque,
           e.id_produto,
           e.lote_producao,
           p.nome AS nome_produto
    FROM tbl_vendas v
    LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
    LEFT JOIN tbl_estoques e ON e.id_estoque = vi.id_estoque
    LEFT JOIN tbl_produtos p ON p.id_produto = e.id_produto
`

class VendaRepository {
    async selectAll(filtros = {}) {
        const condicoes = []
        const valores = []
        if (filtros.data_inicio) {
            condicoes.push('v.data_pedido >= ?')
            valores.push(filtros.data_inicio)
        }
        if (filtros.data_fim) {
            condicoes.push('v.data_pedido <= ?')
            valores.push(filtros.data_fim)
        }
        if (filtros.numero_matricula) {
            condicoes.push('v.numero_matricula = ?')
            valores.push(filtros.numero_matricula)
        }
        if (filtros.buscar) {
            condicoes.push('(v.comprador LIKE ? OR CAST(v.id_venda AS CHAR) LIKE ?)')
            const termo = `%${filtros.buscar}%`
            valores.push(termo, termo)
        }
        const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
        const [rows] = await pool.query(`
            ${consultaVendas}
            ${where}
            ORDER BY v.data_pedido DESC, v.id_venda DESC, vi.id_venda_item ASC
        `, valores)
        return this.organizarVendas(rows)
    }

    async selectById(id) {
        const [rows] = await pool.query(`
            ${consultaVendas}
            WHERE v.id_venda = ?
            ORDER BY vi.id_venda_item ASC
        `, [id])
        return this.organizarVendas(rows)[0]
    }

    async insert(vendaData, itens, operadorMatricula = vendaData.numero_matricula) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const { comprador, data_pedido, data_entrega, nota_fiscal, numero_matricula } = vendaData
            const [result] = await connection.query(
                `INSERT INTO tbl_vendas
                    (comprador, data_pedido, data_entrega, nota_fiscal, numero_matricula)
                 VALUES (?, ?, ?, ?, ?)`,
                [comprador, data_pedido, data_entrega, nota_fiscal, numero_matricula]
            )

            await this.inserirItens(connection, result.insertId, itens, operadorMatricula)
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async set(id, vendaData, itens, operadorMatricula = null) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [vendas] = await connection.query(
                'SELECT id_venda FROM tbl_vendas WHERE id_venda = ? FOR UPDATE', [id]
            )
            if (vendas.length === 0) {
                throw { status: 404, mensagem: 'Venda não encontrada' }
            }

            if (itens !== undefined) {
                const [itensAntigos] = await connection.query(
                    'SELECT id_estoque, quantidade_venda_item FROM tbl_vendas_itens WHERE id_venda = ? ORDER BY id_estoque',
                    [id]
                )
                await this.estornarItens(connection, id, itensAntigos, operadorMatricula)
                await connection.query('DELETE FROM tbl_vendas_itens WHERE id_venda = ?', [id])
                await this.inserirItens(connection, id, itens, operadorMatricula)
            }

            const camposPermitidos = ['comprador', 'data_pedido', 'data_entrega', 'nota_fiscal', 'numero_matricula']
            const campos = Object.entries(vendaData).filter(([campo]) => camposPermitidos.includes(campo))
            if (campos.length > 0) {
                const atribuicoes = campos.map(([campo]) => `${campo} = ?`).join(', ')
                const valores = campos.map(([, valor]) => valor)
                await connection.query(
                    `UPDATE tbl_vendas SET ${atribuicoes} WHERE id_venda = ?`, [...valores, id]
                )
            }

            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async delete(id, operadorMatricula = null) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [vendas] = await connection.query(
                'SELECT * FROM tbl_vendas WHERE id_venda = ? FOR UPDATE', [id]
            )
            if (vendas.length === 0) {
                throw { status: 404, mensagem: 'Venda não encontrada' }
            }

            const [itens] = await connection.query(
                'SELECT id_estoque, quantidade_venda_item FROM tbl_vendas_itens WHERE id_venda = ? ORDER BY id_estoque',
                [id]
            )
            await this.estornarItens(connection, id, itens, operadorMatricula)

            await connection.query('DELETE FROM tbl_vendas_itens WHERE id_venda = ?', [id])
            await connection.query('DELETE FROM tbl_vendas WHERE id_venda = ?', [id])
            await connection.commit()
            return vendas[0]
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async estornarItens(connection, idVenda, itens, operadorMatricula) {
        for (const item of itens) {
            const [estoques] = await connection.query(`
                SELECT e.id_produto, e.lote_producao, e.quantidade, p.nome AS nome_produto
                FROM tbl_estoques e
                INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
                WHERE e.id_estoque = ?
                FOR UPDATE
            `, [item.id_estoque])
            if (estoques.length === 0) {
                throw { status: 409, mensagem: `O lote ${item.id_estoque} associado à venda não existe mais` }
            }

            const estoque = estoques[0]
            const anterior = Number(estoque.quantidade)
            const quantidade = Number(item.quantidade_venda_item)
            const posterior = anterior + quantidade
            await connection.query(
                'UPDATE tbl_estoques SET quantidade = ? WHERE id_estoque = ?',
                [posterior, item.id_estoque]
            )
            await MovimentacaoEstoqueRepository.registrar(connection, {
                id_estoque: item.id_estoque,
                id_produto: estoque.id_produto,
                id_venda: idVenda,
                numero_matricula: operadorMatricula,
                tipo: 'Estorno',
                quantidade,
                saldo_anterior: anterior,
                saldo_posterior: posterior,
                motivo: 'Estorno de item de venda',
                lote_producao: estoque.lote_producao,
                nome_produto: estoque.nome_produto
            })
            await AlertaRepository.sincronizarEstoque(connection, item.id_estoque)
        }
    }

    async inserirItens(connection, idVenda, itens, operadorMatricula) {
        for (const item of itens) {
            const [estoques] = await connection.query(`
                SELECT e.id_produto, e.lote_producao, e.quantidade, e.data_validade,
                       (e.data_validade >= CURDATE()) AS lote_valido, p.nome AS nome_produto
                FROM tbl_estoques e
                INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
                WHERE e.id_estoque = ?
                FOR UPDATE
            `, [item.id_estoque])
            if (estoques.length === 0) {
                throw { status: 409, mensagem: `Lote de estoque ${item.id_estoque} não encontrado` }
            }

            const estoque = estoques[0]
            const anterior = Number(estoque.quantidade)
            if (anterior < item.quantidade_venda_item || Number(estoque.lote_valido) !== 1) {
                throw {
                    status: 409,
                    mensagem: `Estoque insuficiente, inexistente ou vencido no lote ${item.id_estoque}`
                }
            }

            const posterior = anterior - item.quantidade_venda_item
            await connection.query(
                'UPDATE tbl_estoques SET quantidade = ? WHERE id_estoque = ?',
                [posterior, item.id_estoque]
            )
            await connection.query(
                `INSERT INTO tbl_vendas_itens
                    (quantidade_venda_item, preco_unitario, id_venda, id_estoque)
                 VALUES (?, ?, ?, ?)`,
                [item.quantidade_venda_item, item.preco_unitario, idVenda, item.id_estoque]
            )
            await MovimentacaoEstoqueRepository.registrar(connection, {
                id_estoque: item.id_estoque,
                id_produto: estoque.id_produto,
                id_venda: idVenda,
                numero_matricula: operadorMatricula,
                tipo: 'Venda',
                quantidade: item.quantidade_venda_item,
                saldo_anterior: anterior,
                saldo_posterior: posterior,
                motivo: 'Saída de estoque por venda',
                lote_producao: estoque.lote_producao,
                nome_produto: estoque.nome_produto
            })
            await AlertaRepository.sincronizarEstoque(connection, item.id_estoque)
        }
    }

    organizarVendas(rows) {
        const vendas = new Map()
        for (const row of rows) {
            if (!vendas.has(row.id_venda)) {
                const {
                    id_venda_item, quantidade_venda_item, preco_unitario, id_estoque,
                    id_produto, lote_producao, nome_produto, ...venda
                } = row
                venda.itens = []
                venda.valor_total = 0
                vendas.set(row.id_venda, venda)
            }

            if (row.id_venda_item !== null) {
                const item = {
                    id_venda_item: row.id_venda_item,
                    quantidade_venda_item: Number(row.quantidade_venda_item),
                    preco_unitario: Number(row.preco_unitario),
                    id_estoque: row.id_estoque,
                    id_produto: row.id_produto,
                    lote_producao: row.lote_producao,
                    nome_produto: row.nome_produto
                }
                const venda = vendas.get(row.id_venda)
                venda.itens.push(item)
                venda.valor_total += item.quantidade_venda_item * item.preco_unitario
            }
        }
        return Array.from(vendas.values()).map(venda => ({
            ...venda,
            valor_total: Number(venda.valor_total.toFixed(2))
        }))
    }
}

module.exports = new VendaRepository()
