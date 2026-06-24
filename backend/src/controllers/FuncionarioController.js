const FuncionarioService = require('../services/FuncionarioService')

class FuncionarioController {
    async listar(req, res) {
        try {
            const resultado = await FuncionarioService.listar()
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
            const resultado = await FuncionarioService.buscarPorId(req.params.id)
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
            const resultado = await FuncionarioService.cadastrar(req.body)
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
            const resultado = await FuncionarioService.atualizar(req.params.id, req.body)
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
            const resultado = await FuncionarioService.deletar(req.params.id)
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

module.exports = new FuncionarioController()