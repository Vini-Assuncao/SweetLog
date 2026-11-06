const MatriculaService = require('../services/matriculaService')
const { executar } = require('./controle')

class MatriculaController {
    listar(req, res) { return executar(res, () => MatriculaService.listar()) }
    buscarPorId(req, res) { return executar(res, () => MatriculaService.buscarPorId(req.params.id)) }
    cadastrar(req, res) { return executar(res, () => MatriculaService.cadastrar(req.body || {})) }
    atualizar(req, res) { return executar(res, () => MatriculaService.atualizar(req.params.id, req.body || {})) }
    deletar(req, res) { return executar(res, () => MatriculaService.deletar(req.params.id)) }
}

module.exports = new MatriculaController()
