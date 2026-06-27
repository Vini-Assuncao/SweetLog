const ProdutoService = require('../services/ProdutoService')

class ProdutoController {
    async listar(req, res) {
        try {
            const resultado = await ProdutoService.listar()
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
            const resultado = await ProdutoService.buscarPorId(req.params.id)
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
            const dados = { ...req.body, file: req.file }
            const resultado = await ProdutoService.cadastrar(dados)
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
            const dados = { ...req.body, file: req.file }
            const resultado = await ProdutoService.atualizar(req.params.id, dados)  
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
            const resultado = await ProdutoService.deletar(req.params.id)
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

module.exports = new ProdutoController()