const app = require('./app')
const pool = require('./config/database')
const AlertaRepository = require('./repositories/AlertaRepository')

const PORT = process.env.PORT || 3000

async function startServer() {
    try {
        const connection = await pool.getConnection()
        console.log("🏦 Conexão com MySQL estabelecida")
        connection.release()

        await AlertaRepository.sincronizarTudo()
        console.log("🔔 Alertas sincronizados com o estoque atual")

        app.listen(PORT, () => {
            console.log(`🖥️ Servidor rodando na porta ${PORT}`)
        })
    } catch (err) {
        console.error("Erro fatal ao preparar o banco de dados e iniciar o servidor:", err)
        process.exit(1)
    }
}

startServer()