const MatriculaService = require('../services/MatriculaService')

class MatriculaController {
    async listar(req, res) {
        try {
            const resultado = await MatriculaService.listar()
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }

    async buscarPorId(req, res) {
        try {
            const { id } = req.params
            const resultado = await MatriculaService.buscarPorId(id)
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }

    async cadastrar(req, res) {
        try {
            const resultado = await MatriculaService.cadastrar(req.body)
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }

    async atualizar(req, res) {
        try {
            const resultado = await MatriculaService.atualizar(req.params, req.body)
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }

    async deletar(req, res) {
        try {
            const resultado = await MatriculaService.deletar(req.params.id)
            res.json(resultado)
        } catch (error) {
            res.status(error.status || 500).json({
                sucesso: false,
                mensagem: error.message || "Erro interno do servidor",
                erro: error.stack || error
            })
        }
    }
}

module.exports = new MatriculaController()