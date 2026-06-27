const pool = require('../config/database')

class ProdutoRepository {
    async selectAll() {
        const [rows] = await pool.query('SELECT * FROM tbl_produtos')
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query('SELECT * FROM tbl_produtos WHERE id_produto = ?', [id])
        return rows[0]
    }
    
    async insert(produtoData) {
        const { nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem } = produtoData
        const [result] = await pool.query(
            'INSERT INTO tbl_produtos (nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem]
        )
        return result.insertId
    }

    async set(id, produtoData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(produtoData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE tbl_produtos SET ${fields.join(', ')} WHERE id_produto = ?`;
        const [result] = await pool.query(query, values);
        return result.affectedRows;
    }

    async delete(id) {
        const [result] = await pool.query('DELETE FROM tbl_produtos WHERE id_produto = ?', [id])
        return result.affectedRows
    }
}

module.exports = new ProdutoRepository()