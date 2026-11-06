const MovimentacaoEstoqueService = require('../services/MovimentacaoEstoqueService')
const { executar } = require('./controle')

class MovimentacaoEstoqueController {
    listar(req, res) { return executar(res, () => MovimentacaoEstoqueService.listar(req.query)) }
    listarPorEstoque(req, res) {
        return executar(res, () => MovimentacaoEstoqueService.listarPorEstoque(req.params.id))
    }
}

module.exports = new MovimentacaoEstoqueController()
