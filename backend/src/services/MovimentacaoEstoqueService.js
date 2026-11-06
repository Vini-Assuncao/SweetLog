const MovimentacaoEstoqueRepository = require('../repositories/MovimentacaoEstoqueRepository')
const { validarId } = require('../utils/validacao')

const TIPOS = ['Entrada', 'Baixa', 'Venda', 'Estorno', 'Ajuste']

class MovimentacaoEstoqueService {
    async listar(filtros = {}) {
        const normalizados = this.normalizarFiltros(filtros)
        const resultado = await MovimentacaoEstoqueRepository.listar(normalizados)
        return { sucesso: true, movimentacoes: resultado.rows, total: resultado.total }
    }

    async listarPorEstoque(id) {
        const idEstoque = validarId(id, 'ID do estoque')
        const resultado = await MovimentacaoEstoqueRepository.listarPorEstoque(idEstoque)
        return { sucesso: true, movimentacoes: resultado.rows, total: resultado.total }
    }

    normalizarFiltros(filtros) {
        const resultado = { limit: 50, offset: 0 }
        if (filtros.id_estoque) resultado.id_estoque = validarId(filtros.id_estoque, 'ID do estoque')
        if (filtros.id_produto) resultado.id_produto = validarId(filtros.id_produto, 'ID do produto')
        if (filtros.tipo) {
            if (!TIPOS.includes(filtros.tipo)) throw { status: 400, mensagem: 'Tipo de movimentação inválido' }
            resultado.tipo = filtros.tipo
        }
        if (filtros.limit !== undefined) {
            const limit = Number(filtros.limit)
            const offset = Number(filtros.offset || 0)
            if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
                throw { status: 400, mensagem: 'Paginação inválida. Use limit entre 1 e 100 e offset maior ou igual a zero' }
            }
            resultado.limit = limit
            resultado.offset = offset
        }
        return resultado
    }
}

module.exports = new MovimentacaoEstoqueService()
