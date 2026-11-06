const DashboardService = require('../services/DashboardService')
const { executar } = require('./controle')

class DashboardController {
    resumo(req, res) { return executar(res, () => DashboardService.resumo()) }
}

module.exports = new DashboardController()
