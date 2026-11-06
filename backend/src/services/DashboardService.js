const DashboardRepository = require('../repositories/DashboardRepository')

class DashboardService {
    async resumo() {
        const dados = await DashboardRepository.selectResumo()
        return { sucesso: true, ...dados }
    }
}

module.exports = new DashboardService()
