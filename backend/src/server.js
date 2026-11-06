require('dotenv').config()

const app = require('./app')
const pool = require('./config/database')
const AlertaRepository = require('./repositories/AlertaRepository')

const PORT = Number(process.env.PORT) || 3000

async function startServer() {
    let servidor
    try {
        const connection = await pool.getConnection()
        console.log('🏦 Conexão com MySQL estabelecida')
        connection.release()

        await AlertaRepository.sincronizarTudo()
        console.log('🔔 Alertas sincronizados com o estoque atual')

        servidor = app.listen(PORT, () => {
            console.log(`🖥️ Servidor rodando na porta ${PORT}`)
        })

        const encerrar = async sinal => {
            console.log(`\n${sinal} recebido. Encerrando a API...`)
            servidor.close(async () => {
                await pool.end()
                process.exit(0)
            })
        }
        process.once('SIGINT', () => encerrar('SIGINT'))
        process.once('SIGTERM', () => encerrar('SIGTERM'))
    } catch (error) {
        console.error('Erro ao preparar o banco de dados e iniciar o servidor:', error.message || error)
        await pool.end().catch(() => {})
        process.exit(1)
    }
}

if (require.main === module) startServer()

module.exports = { startServer }
