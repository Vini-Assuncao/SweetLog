const pool = require('../config/database')

class FuncionarioRepository {
    async selectAll() {
        const [rows] = await pool.query(`
            SELECT f.numero_matricula, f.nome, f.email, m.setor
            FROM tbl_funcionarios f
            INNER JOIN tbl_matriculas m ON m.numero_matricula = f.numero_matricula
            ORDER BY f.nome ASC
        `)
        return rows
    }

    async selectById(numero_matricula) {
        const [rows] = await pool.query(`
            SELECT f.numero_matricula, f.nome, f.email, m.setor
            FROM tbl_funcionarios f
            INNER JOIN tbl_matriculas m ON m.numero_matricula = f.numero_matricula
            WHERE f.numero_matricula = ?
        `, [numero_matricula])
        return rows[0]
    }

    async selectByEmail(email) {
        const [rows] = await pool.query(
            'SELECT numero_matricula FROM tbl_funcionarios WHERE email = ?', [email]
        )
        return rows[0]
    }

    async selectSenha(numero_matricula) {
        const [rows] = await pool.query(
            'SELECT senha FROM tbl_funcionarios WHERE numero_matricula = ?', [numero_matricula]
        )
        return rows[0]
    }

    async insert(funcionarioData) {
        const { numero_matricula, senha, nome, email } = funcionarioData
        const [result] = await pool.query(
            'INSERT INTO tbl_funcionarios (numero_matricula, senha, nome, email) VALUES (?, ?, ?, ?)',
            [numero_matricula, senha, nome, email]
        )
        return result.affectedRows
    }

    async set(numero_matricula, funcionarioData) {
        const camposPermitidos = ['senha', 'nome', 'email']
        const campos = Object.entries(funcionarioData).filter(([campo]) => camposPermitidos.includes(campo))
        if (campos.length === 0) return 0
        const atribuicoes = campos.map(([campo]) => `${campo} = ?`).join(', ')
        const valores = campos.map(([, valor]) => valor)
        const [result] = await pool.query(
            `UPDATE tbl_funcionarios SET ${atribuicoes} WHERE numero_matricula = ?`,
            [...valores, numero_matricula]
        )
        return result.affectedRows
    }

    async hasMovimentacoes(numero_matricula) {
        const [rows] = await pool.query(`
            SELECT 1 AS possui FROM tbl_estoques WHERE numero_matricula = ?
            UNION ALL
            SELECT 1 AS possui FROM tbl_vendas WHERE numero_matricula = ?
            UNION ALL
            SELECT 1 AS possui FROM tbl_movimentacoes_estoque WHERE numero_matricula = ?
            LIMIT 1
        `, [numero_matricula, numero_matricula, numero_matricula])
        return rows.length > 0
    }

    async delete(numero_matricula) {
        const [result] = await pool.query(
            'DELETE FROM tbl_funcionarios WHERE numero_matricula = ?', [numero_matricula]
        )
        return result.affectedRows
    }
}

module.exports = new FuncionarioRepository()
