const pool = require('../config/database')

class FuncionarioRepository {
    async selectAll() {
        const [rows] = await pool.query('SELECT * FROM tbl_funcionarios')
        return rows
    }
    
    async selectById(numero_matricula) {
        const [rows] = await pool.query('SELECT * FROM tbl_funcionarios WHERE numero_matricula = ?', [numero_matricula])
        return rows[0]
    }
    
    async insert(funcionarioData) {
        const { numero_matricula, senha, nome, telefone, cargo } = funcionarioData
        const [result] = await pool.query(
            'INSERT INTO tbl_funcionarios (numero_matricula, senha, nome, telefone, cargo) VALUES (?, ?, ?, ?, ?)',
            [numero_matricula, senha, nome, telefone, cargo]
        )
        return result.affectedRows
    }

    async set(numero_matricula, funcionarioData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(funcionarioData)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return null;

        values.push(numero_matricula);
        const query = `UPDATE tbl_funcionarios SET ${fields.join(', ')} WHERE numero_matricula = ?`;
        const [result] = await pool.query(query, values);
        return result.affectedRows;
    }

    async delete(numero_matricula) {
        const [result] = await pool.query('DELETE FROM tbl_funcionarios WHERE numero_matricula = ?', [numero_matricula])
        return result.affectedRows
    }
}

module.exports = new FuncionarioRepository()