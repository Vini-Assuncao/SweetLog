const EstoqueService = require('../services/EstoqueService')
const { executar } = require('./controle')

class EstoqueController {
    listar(req, res) { return executar(res, () => EstoqueService.listar(req.query)) }
    resumo(req, res) { return executar(res, () => EstoqueService.resumo()) }
    listarPorProduto(req, res) { return executar(res, () => EstoqueService.listarPorProduto(req.params.idProduto)) }
    buscarPorId(req, res) { return executar(res, () => EstoqueService.buscarPorId(req.params.id)) }
    diminuirQuantidade(req, res) {
        return executar(res, () => EstoqueService.diminuirQuantidade(
            req.params.id, req.body.quantidade, req.user.numero_matricula, req.body.motivo
        ))
    }
    cadastrar(req, res) {
        return executar(res, () => EstoqueService.cadastrar({
            ...req.body, numero_matricula: req.user.numero_matricula, file: req.file
        }))
    }
    atualizar(req, res) {
        return executar(res, () => EstoqueService.atualizar(req.params.id, {
            ...req.body, numero_matricula: req.user.numero_matricula,
            operador_matricula: req.user.numero_matricula, file: req.file
        }))
    }
    deletar(req, res) { return executar(res, () => EstoqueService.deletar(req.params.id)) }
}

module.exports = new EstoqueController()
