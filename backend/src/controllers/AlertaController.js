const AlertaService = require('../services/AlertaService')
const { executar } = require('./controle')

class AlertaController {
    listar(req, res) { return executar(res, () => AlertaService.listar(req.query)) }
    buscarPorId(req, res) { return executar(res, () => AlertaService.buscarPorId(req.params.id)) }
}

module.exports = new AlertaController()
