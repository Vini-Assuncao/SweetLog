const pool = require('../config/database')

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
        const [result] = await pool.query(
            'INSERT INTO tbl_estoques (lote_producao, quantidade, inspecionado, data_validade, id_produto, nota_fiscal) VALUES (?, ?, ?, ?, ?, ?)',
            [lote_producao, quantidade, inspecionado, data_validade, id_produto, nota_fiscal]
        )
        return result.insertId
    }

    async set(id, estoqueData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(estoqueData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE tbl_estoques SET ${fields.join(', ')} WHERE id_estoque = ?`;
        const [result] = await pool.query(query, values);
        return result.affectedRows;
    }

    async decreaseQuantity(id, quantidade) {
        const [result] = await pool.query(
            'UPDATE tbl_estoques SET quantidade = quantidade - ? WHERE id_estoque = ? AND quantidade >= ?',
            [quantidade, id, quantidade]
        )
        return result.affectedRows
    }

    async hasSalesItems(id) {
        const [rows] = await pool.query(
            'SELECT id_venda_item FROM tbl_vendas_itens WHERE id_estoque = ? LIMIT 1',
            [id]
        )
        return rows.length > 0
    }

    async delete(id) {
        const [result] = await pool.query('DELETE FROM tbl_estoques WHERE id_estoque = ?', [id])
        return result.affectedRows
    }
}

module.exports = new EstoqueRepository()