const pool = require('../config/database')

class MatriculaRepository {
    async selectAll() {
        const [rows] = await pool.query(`
            SELECT m.*, f.nome AS nome_funcionario, f.telefone
            FROM tbl_matriculas m
            LEFT JOIN tbl_funcionarios f ON f.numero_matricula = m.numero_matricula
            ORDER BY m.numero_matricula ASC
        `)
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM tbl_matriculas WHERE numero_matricula = ?', [id]
        )
        return rows[0]
    }

    async insert(matriculaData) {
        const { numero_matricula, setor } = matriculaData
        const [result] = await pool.query(
            'INSERT INTO tbl_matriculas (numero_matricula, setor) VALUES (?, ?)',
            [numero_matricula, setor]
        )
        return result.affectedRows
    }

    async set(numero_matricula, matriculaData) {
        if (!Object.keys(matriculaData).every(campo => campo === 'setor')) return 0
        const [result] = await pool.query(
            'UPDATE tbl_matriculas SET setor = ? WHERE numero_matricula = ?',
            [matriculaData.setor, numero_matricula]
        )
        return result.affectedRows
    }

    async delete(numero_matricula) {
        const [result] = await pool.query(
            'DELETE FROM tbl_matriculas WHERE numero_matricula = ?', [numero_matricula]
        )
        return result.affectedRows
    }
}

module.exports = new MatriculaRepository()
