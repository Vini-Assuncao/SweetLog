const ProdutoService = require('../services/ProdutoService')
const { executar } = require('./controle')

class ProdutoController {
    listar(req, res) { return executar(res, () => ProdutoService.listar(req.query)) }
    buscarPorId(req, res) { return executar(res, () => ProdutoService.buscarPorId(req.params.id)) }
    cadastrar(req, res) {
        return executar(res, () => ProdutoService.cadastrar({ ...req.body, file: req.file }))
    }
    atualizar(req, res) {
        return executar(res, () => ProdutoService.atualizar(req.params.id, { ...req.body, file: req.file }))
    }
    deletar(req, res) { return executar(res, () => ProdutoService.deletar(req.params.id)) }
}

module.exports = new ProdutoController()
