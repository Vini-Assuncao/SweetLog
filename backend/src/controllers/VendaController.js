const VendaService = require('../services/VendaService')
const { executar } = require('./controle')

class VendaController {
    listar(req, res) { return executar(res, () => VendaService.listar(req.query)) }
    buscarPorId(req, res) { return executar(res, () => VendaService.buscarPorId(req.params.id)) }
    cadastrar(req, res) {
        return executar(res, () => VendaService.cadastrar({
            ...req.body, numero_matricula: req.user.numero_matricula, file: req.file
        }))
    }
    atualizar(req, res) {
        return executar(res, () => VendaService.atualizar(req.params.id, {
            ...req.body, operador_matricula: req.user.numero_matricula, file: req.file
        }))
    }
    deletar(req, res) {
        return executar(res, () => VendaService.deletar(req.params.id, req.user.numero_matricula))
    }
}

module.exports = new VendaController()
