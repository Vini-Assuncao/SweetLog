const EstoqueService = require('./EstoqueService')
const { validarId } = require('../utils/validacao')

class LoteService {
    async listar(filtros = {}) {
        const resultado = await EstoqueService.listar(filtros)
        return { sucesso: true, lotes: resultado.estoques, total: resultado.total }
    }

    async resumo() {
        return EstoqueService.resumo()
    }

    async buscarPorId(id) {
        const resultado = await EstoqueService.buscarPorId(validarId(id))
        return { sucesso: true, lote: resultado.estoque }
    }

    async listarDoProduto(idProduto) {
        const resultado = await EstoqueService.listarPorProduto(validarId(idProduto, 'ID do produto'))
        return { sucesso: true, lotes: resultado.estoques, total: resultado.total }
    }
}

module.exports = new LoteService()
