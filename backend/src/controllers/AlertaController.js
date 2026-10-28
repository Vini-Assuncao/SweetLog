const AlertaService = require('../services/AlertaService')

class AlertaController {
    async listar(req, res) {
        try {
            const resultado = await AlertaService.listar()
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.mensagem || error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }

    async buscarPorId(req, res) {
        try {
            const resultado = await AlertaService.buscarPorId(req.params.id)
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.mensagem || error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }
}

module.exports = new AlertaController()
