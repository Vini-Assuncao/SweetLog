const LoteService = require('../services/LoteService')
const { executar } = require('./controle')

class LoteController {
    listar(req, res) { return executar(res, () => LoteService.listar(req.query)) }
    resumo(req, res) { return executar(res, () => LoteService.resumo()) }
    buscarPorId(req, res) { return executar(res, () => LoteService.buscarPorId(req.params.id)) }
    listarDoProduto(req, res) { return executar(res, () => LoteService.listarDoProduto(req.params.idProduto)) }
}

module.exports = new LoteController()
