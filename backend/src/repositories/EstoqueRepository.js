const pool = require('../config/database')
const AlertaRepository = require('./AlertaRepository')

class EstoqueRepository {
    async selectAll() {
        const [rows] = await pool.query('SELECT * FROM tbl_estoques')
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query('SELECT * FROM tbl_estoques WHERE id_estoque = ?', [id])
        return rows[0]
    }

    async insert(estoqueData) {
        const { lote_producao, quantidade, inspecionado, data_validade, id_produto, nota_fiscal } = estoqueData
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [result] = await connection.query(
                'INSERT INTO tbl_estoques (lote_producao, quantidade, inspecionado, data_validade, data_entrada, id_produto, nota_fiscal) VALUES (?, ?, ?, ?, CURDATE(), ?, ?)',
                [lote_producao, quantidade, inspecionado, data_validade, id_produto, nota_fiscal]
            )
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

    async set(id, estoqueData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(estoqueData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return null;

        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [rows] = await connection.query(
                'SELECT id_produto FROM tbl_estoques WHERE id_estoque = ? FOR UPDATE',
                [id]
            )
            if (rows.length === 0) {
                await connection.commit()
                return 0
            }

            const produtoAntigo = rows[0].id_produto
            values.push(id)
            const query = `UPDATE tbl_estoques SET ${fields.join(', ')} WHERE id_estoque = ?`
            const [result] = await connection.query(query, values)
            const [estoqueAtualizado] = await connection.query(
                'SELECT id_produto FROM tbl_estoques WHERE id_estoque = ?',
                [id]
            )
            await AlertaRepository.sincronizarEstoque(connection, id)
            if (produtoAntigo !== estoqueAtualizado[0].id_produto) {
                await AlertaRepository.sincronizarProduto(connection, produtoAntigo)
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

    async decreaseQuantity(id, quantidade) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [result] = await connection.query(
                'UPDATE tbl_estoques SET quantidade = quantidade - ? WHERE id_estoque = ? AND quantidade >= ?',
                [quantidade, id, quantidade]
            )
            if (result.affectedRows > 0) {
                await AlertaRepository.sincronizarEstoque(connection, id)
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

    async hasSalesItems(id) {
        const [rows] = await pool.query(
            'SELECT id_venda_item FROM tbl_vendas_itens WHERE id_estoque = ? LIMIT 1',
            [id]
        )
        return rows.length > 0
    }

    async hasAlerts(id) {
        const [rows] = await pool.query(
            'SELECT id_alerta FROM tbl_alertas WHERE id_estoque = ? LIMIT 1',
            [id]
        )
        return rows.length > 0
    }

    async delete(id) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [estoques] = await connection.query(
                'SELECT id_produto FROM tbl_estoques WHERE id_estoque = ? FOR UPDATE',
                [id]
            )
            if (estoques.length === 0) {
                await connection.commit()
                return 0
            }

            const [result] = await connection.query(
                'DELETE FROM tbl_estoques WHERE id_estoque = ?',
                [id]
            )
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