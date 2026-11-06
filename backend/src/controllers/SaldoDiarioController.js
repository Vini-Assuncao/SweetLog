const SaldoDiarioService = require('../services/SaldoDiarioService')
const { executar } = require('./controle')

class SaldoDiarioController {
    resumo(req, res) { return executar(res, () => SaldoDiarioService.resumo(req.query.data)) }
    historico(req, res) { return executar(res, () => SaldoDiarioService.historico(req.query.dias)) }

    async exportar(req, res) {
        try {
            const arquivo = await SaldoDiarioService.exportar(req.query.data)
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome}"`)
            return res.send(arquivo.conteudo)
        } catch (error) {
            const { responderErro } = require('../utils/resposta')
            return responderErro(res, error)
        }
    }
}

module.exports = new SaldoDiarioController()
