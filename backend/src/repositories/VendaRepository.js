const pool = require('../config/database')

class VendaRepository {
    async selectAll() {
        const [rows] = await pool.query(`
            SELECT v.*, vi.id_venda_item, vi.quantidade_venda_item,
                   vi.preco_unitario, vi.id_estoque
            FROM tbl_vendas v
            LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            ORDER BY v.id_venda, vi.id_venda_item
        `)
        return this.organizarVendas(rows)
    }

    async selectById(id) {
        const [rows] = await pool.query(`
            SELECT v.*, vi.id_venda_item, vi.quantidade_venda_item,
                   vi.preco_unitario, vi.id_estoque
            FROM tbl_vendas v
            LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            WHERE v.id_venda = ?
            ORDER BY vi.id_venda_item
        `, [id])
        return this.organizarVendas(rows)[0]
    }

    async insert(vendaData, itens) {
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

            await this.inserirItens(connection, result.insertId, itens)
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async set(id, vendaData, itens) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [vendas] = await connection.query(
                'SELECT id_venda FROM tbl_vendas WHERE id_venda = ? FOR UPDATE',
                [id]
            )
            if (vendas.length === 0) {
                const error = new Error('Venda não encontrada')
                error.status = 404
                throw error
            }

            if (itens !== undefined) {
                const [itensAntigos] = await connection.query(
                    'SELECT id_estoque, quantidade_venda_item FROM tbl_vendas_itens WHERE id_venda = ? ORDER BY id_estoque',
                    [id]
                )
                for (const item of itensAntigos) {
                    await connection.query(
                        'UPDATE tbl_estoques SET quantidade = quantidade + ? WHERE id_estoque = ?',
                        [item.quantidade_venda_item, item.id_estoque]
                    )
                }
                await connection.query('DELETE FROM tbl_vendas_itens WHERE id_venda = ?', [id])
                await this.inserirItens(connection, id, itens)
            }

            const camposPermitidos = ['comprador', 'data_pedido', 'data_entrega', 'nota_fiscal', 'numero_matricula']
            const campos = Object.entries(vendaData).filter(([campo]) => camposPermitidos.includes(campo))
            if (campos.length > 0) {
                const atribuicoes = campos.map(([campo]) => `${campo} = ?`).join(', ')
                const valores = campos.map(([, valor]) => valor)
                await connection.query(
                    `UPDATE tbl_vendas SET ${atribuicoes} WHERE id_venda = ?`,
                    [...valores, id]
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

    async delete(id) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [vendas] = await connection.query(
                'SELECT * FROM tbl_vendas WHERE id_venda = ? FOR UPDATE',
                [id]
            )
            if (vendas.length === 0) {
                const error = new Error('Venda não encontrada')
                error.status = 404
                throw error
            }

            const [itens] = await connection.query(
                'SELECT id_estoque, quantidade_venda_item FROM tbl_vendas_itens WHERE id_venda = ? ORDER BY id_estoque',
                [id]
            )
            for (const item of itens) {
                await connection.query(
                    'UPDATE tbl_estoques SET quantidade = quantidade + ? WHERE id_estoque = ?',
                    [item.quantidade_venda_item, item.id_estoque]
                )
            }

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

    async inserirItens(connection, idVenda, itens) {
        for (const item of itens) {
            const [result] = await connection.query(
                `UPDATE tbl_estoques
                 SET quantidade = quantidade - ?
                 WHERE id_estoque = ? AND quantidade >= ?`,
                [item.quantidade_venda_item, item.id_estoque, item.quantidade_venda_item]
            )
            if (result.affectedRows === 0) {
                const error = new Error('Estoque insuficiente para um dos itens da venda')
                error.status = 409
                throw error
            }

            await connection.query(
                `INSERT INTO tbl_vendas_itens
                    (quantidade_venda_item, preco_unitario, id_venda, id_estoque)
                 VALUES (?, ?, ?, ?)`,
                [item.quantidade_venda_item, item.preco_unitario, idVenda, item.id_estoque]
            )
        }
    }

    organizarVendas(rows) {
        const vendas = new Map()
        for (const row of rows) {
            if (!vendas.has(row.id_venda)) {
                const { id_venda_item, quantidade_venda_item, preco_unitario, id_estoque, ...venda } = row
                venda.itens = []
                vendas.set(row.id_venda, venda)
            }

            if (row.id_venda_item !== null) {
                vendas.get(row.id_venda).itens.push({
                    id_venda_item: row.id_venda_item,
                    quantidade_venda_item: row.quantidade_venda_item,
                    preco_unitario: row.preco_unitario,
                    id_estoque: row.id_estoque
                })
            }
        }
        return Array.from(vendas.values())
    }
}

module.exports = new VendaRepository()
