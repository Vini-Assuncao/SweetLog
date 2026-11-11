const pool = require('../config/database')

class RecuperacaoSenhaRepository {
    async selectFuncionariosPorEmail(email) {
        const [rows] = await pool.query(
            'SELECT numero_matricula FROM tbl_funcionarios WHERE email = ?', [email]
        )
        return rows
    }

    async selectUltimaSolicitacao(numeroMatricula) {
        const [rows] = await pool.query(`
            SELECT id_recuperacao,
                   TIMESTAMPDIFF(SECOND, criado_em, CURRENT_TIMESTAMP) AS segundos_desde
            FROM tbl_recuperacao_senha
            WHERE numero_matricula = ? AND usado_em IS NULL
            ORDER BY id_recuperacao DESC
            LIMIT 1
        `, [numeroMatricula])
        return rows[0]
    }

    async criar(numeroMatricula, codigoHash) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            await connection.query(`
                UPDATE tbl_recuperacao_senha
                SET usado_em = CURRENT_TIMESTAMP
                WHERE numero_matricula = ? AND usado_em IS NULL
            `, [numeroMatricula])
            const [result] = await connection.query(`
                INSERT INTO tbl_recuperacao_senha
                    (numero_matricula, codigo_hash, expira_em, tentativas)
                VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE), 0)
            `, [numeroMatricula, codigoHash])
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async cancelar(id) {
        await pool.query(
            'UPDATE tbl_recuperacao_senha SET usado_em = CURRENT_TIMESTAMP WHERE id_recuperacao = ?', [id]
        )
    }

    async selectAtual(numeroMatricula) {
        const [rows] = await pool.query(`
            SELECT id_recuperacao, numero_matricula, codigo_hash, token_hash,
                   tentativas, expira_em, verificado_em
            FROM tbl_recuperacao_senha
            WHERE numero_matricula = ?
              AND usado_em IS NULL
              AND expira_em > CURRENT_TIMESTAMP
            ORDER BY id_recuperacao DESC
            LIMIT 1
        `, [numeroMatricula])
        return rows[0]
    }

    async incrementarTentativas(id) {
        await pool.query(`
            UPDATE tbl_recuperacao_senha
            SET usado_em = CASE WHEN tentativas >= 4 THEN CURRENT_TIMESTAMP ELSE usado_em END,
                tentativas = tentativas + 1
            WHERE id_recuperacao = ?
        `, [id])
    }

    async confirmarCodigo(id, tokenHash) {
        const [result] = await pool.query(`
            UPDATE tbl_recuperacao_senha
            SET token_hash = ?,
                verificado_em = CURRENT_TIMESTAMP,
                expira_em = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)
            WHERE id_recuperacao = ? AND usado_em IS NULL AND verificado_em IS NULL
        `, [tokenHash, id])
        return result.affectedRows
    }

    async redefinirSenha(numeroMatricula, tokenHash, senhaHash) {
        const connection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const [registros] = await connection.query(`
                SELECT id_recuperacao
                FROM tbl_recuperacao_senha
                WHERE numero_matricula = ?
                  AND token_hash = ?
                  AND verificado_em IS NOT NULL
                  AND usado_em IS NULL
                  AND expira_em > CURRENT_TIMESTAMP
                ORDER BY id_recuperacao DESC
                LIMIT 1
                FOR UPDATE
            `, [numeroMatricula, tokenHash])
            if (registros.length === 0) {
                await connection.rollback()
                return false
            }

            await connection.query(
                'UPDATE tbl_funcionarios SET senha = ? WHERE numero_matricula = ?',
                [senhaHash, numeroMatricula]
            )
            await connection.query(
                'UPDATE tbl_recuperacao_senha SET usado_em = CURRENT_TIMESTAMP WHERE id_recuperacao = ?',
                [registros[0].id_recuperacao]
            )
            await connection.commit()
            return true
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }
}

module.exports = new RecuperacaoSenhaRepository()
