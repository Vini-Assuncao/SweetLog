const AlertaRepository = require('../repositories/AlertaRepository')

class AlertaService {
    async listar() {
        const alertas = await AlertaRepository.selectAll()
        return {
            sucesso: true,
            alertas,
            total: alertas.length
        }
    }

    async buscarPorId(id) {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            throw { status: 400, mensagem: "ID inválido" }
        }

        const alerta = await AlertaRepository.selectById(id)
        if (!alerta) {
            throw { status: 404, mensagem: "Alerta não encontrado" }
        }

        return {
            sucesso: true,
            alerta
        }
    }
}

module.exports = new AlertaService()
