const AlertaRepository = require('../repositories/AlertaRepository')
const { validarId, validarData } = require('../utils/validacao')

const tiposPermitidos = ['Validade próxima', 'Estoque vencido', 'Estoque baixo']

class AlertaService {
    async listar(filtros = {}) {
        const consulta = {}
        if (filtros.ativo !== undefined && filtros.ativo !== '') {
            if (['true', '1', true, 1].includes(filtros.ativo)) consulta.ativo = true
            else if (['false', '0', false, 0].includes(filtros.ativo)) consulta.ativo = false
            else throw { status: 400, mensagem: 'O filtro ativo deve ser true ou false' }
        }
        if (filtros.tipo) {
            if (!tiposPermitidos.includes(filtros.tipo)) throw { status: 400, mensagem: 'Tipo de alerta inválido' }
            consulta.tipo = filtros.tipo
        }
        if (filtros.data_inicio) consulta.data_inicio = validarData(filtros.data_inicio, 'Data inicial')
        if (filtros.data_fim) consulta.data_fim = validarData(filtros.data_fim, 'Data final')
        if (consulta.data_inicio && consulta.data_fim && consulta.data_inicio > consulta.data_fim) {
            throw { status: 400, mensagem: 'A data inicial não pode ser posterior à data final' }
        }
        if (filtros.limit !== undefined) {
            const limite = Number(filtros.limit)
            if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
                throw { status: 400, mensagem: 'O limite deve ser um número inteiro entre 1 e 100' }
            }
            consulta.limit = limite
        }
        const alertas = await AlertaRepository.selectAll(consulta)
        return { sucesso: true, alertas, total: alertas.length }
    }

    async buscarPorId(id) {
        const alerta = await AlertaRepository.selectById(validarId(id))
        if (!alerta) throw { status: 404, mensagem: 'Alerta não encontrado' }
        return { sucesso: true, alerta }
    }
}

module.exports = new AlertaService()
