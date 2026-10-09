const pool = require('../config/database')

class MatriculaRepository {
    async selectAll() {
        const [rows] = await pool.query('SELECT * FROM tbl_matriculas')
        return rows
    }

    async selectById(id) {
        const [rows] = await pool.query('SELECT * FROM tbl_matriculas WHERE numero_matricula = ?', [id])
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
        const fields = []
        const values = []
        for (const [key, value] of Object.entries(matriculaData)) {
            fields.push(`${key} = ?`)
            values.push(value)
        }
        if (fields.length === 0) return null

        values.push(numero_matricula)
        const query = `UPDATE tbl_matriculas SET ${fields.join(', ')} WHERE numero_matricula = ?`
        const [result] = await pool.query(query, values)
        return result.affectedRows
    }

    async delete(numero_matricula) {
        const [result] = await pool.query('DELETE FROM tbl_matriculas WHERE numero_matricula = ?', [numero_matricula])
        return result.affectedRows
    }
}

module.exports = new MatriculaRepository()