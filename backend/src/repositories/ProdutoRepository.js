const pool = require('../config/database')
const AlertaRepository = require('./AlertaRepository')

const consultaProduto = `
    SELECT p.*,
           COALESCE(SUM(CASE WHEN e.data_validade >= CURDATE() THEN e.quantidade ELSE 0 END), 0) AS quantidade_disponivel,
           COUNT(e.id_estoque) AS total_lotes
    FROM tbl_produtos p
    LEFT JOIN tbl_estoques e ON e.id_produto = p.id_produto
`

class ProdutoRepository {
    async selectAll(filtros = {}) {
        const condicoes = []
        const valores = []
        if (filtros.buscar) {
            condicoes.push('(p.nome LIKE ? OR p.marca LIKE ? OR p.cnpj_fabricante LIKE ?)')
            const termo = `%${filtros.buscar}%`
            valores.push(termo, termo, termo)
        }
        const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
        const [rows] = await pool.query(`
            ${consultaProduto}
            ${where}
            GROUP BY p.id_produto
            ORDER BY p.nome ASC
        `, valores)
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query(`
            ${consultaProduto}
            WHERE p.id_produto = ?
            GROUP BY p.id_produto
        `, [id])
        return rows[0]
    }

    async insert(produtoData) {
        const { nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem } = produtoData
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [result] = await connection.query(
                `INSERT INTO tbl_produtos
                    (nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem]
            )
            await AlertaRepository.sincronizarProduto(connection, result.insertId)
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async set(id, produtoData) {
        const camposPermitidos = ['nome', 'necessidade_refrigeracao', 'cnpj_fabricante', 'marca', 'tamanho', 'descricao', 'imagem']
        const campos = Object.entries(produtoData).filter(([campo]) => camposPermitidos.includes(campo))
        if (campos.length === 0) return 0

        const atribuicoes = campos.map(([campo]) => `${campo} = ?`).join(', ')
        const valores = campos.map(([, valor]) => valor)
        const [result] = await pool.query(
            `UPDATE tbl_produtos SET ${atribuicoes} WHERE id_produto = ?`, [...valores, id]
        )
        return result.affectedRows
    }

    async delete(id) {
        const [result] = await pool.query('DELETE FROM tbl_produtos WHERE id_produto = ?', [id])
        return result.affectedRows
    }

    async hasAlerts(id) {
        const [rows] = await pool.query(
            'SELECT id_alerta FROM tbl_alertas WHERE id_produto = ? LIMIT 1', [id]
        )
        return rows.length > 0
    }

    async hasStocks(id) {
        const [rows] = await pool.query(
            'SELECT id_estoque FROM tbl_estoques WHERE id_produto = ? LIMIT 1', [id]
        )
        return rows.length > 0
    }
}

module.exports = new ProdutoRepository()
