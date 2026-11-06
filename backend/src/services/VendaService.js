const VendaRepository = require('../repositories/VendaRepository')
const EstoqueRepository = require('../repositories/EstoqueRepository')
const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const { caminhoPublico, normalizarUrlPublica, validarAssinaturaArquivo, removerUpload, removerArquivoSalvo } = require('../utils/arquivos')
const { validarId, validarData } = require('../utils/validacao')

class VendaService {
    async listar(filtros = {}) {
        const filtrosValidados = {}
        if (filtros.data_inicio) filtrosValidados.data_inicio = validarData(filtros.data_inicio, 'Data inicial')
        if (filtros.data_fim) filtrosValidados.data_fim = validarData(filtros.data_fim, 'Data final')
        if (filtros.data_inicio && filtros.data_fim && filtros.data_inicio > filtros.data_fim) {
            throw { status: 400, mensagem: 'A data inicial não pode ser posterior à data final' }
        }
        if (filtros.numero_matricula) filtrosValidados.numero_matricula = validarId(filtros.numero_matricula, 'Número de matrícula')
        if (filtros.buscar) filtrosValidados.buscar = String(filtros.buscar).trim()

        const vendas = await VendaRepository.selectAll(filtrosValidados)
        return { sucesso: true, vendas: vendas.map(venda => this.normalizarVenda(venda)), total: vendas.length }
    }

    async buscarPorId(id) {
        const venda = await VendaRepository.selectById(validarId(id))
        if (!venda) throw { status: 404, mensagem: 'Venda não encontrada' }
        return { sucesso: true, venda: this.normalizarVenda(venda) }
    }

    async cadastrar(dados) {
        const { file } = dados
        try {
            if (file) await validarAssinaturaArquivo(file, 'pdf')
            const comprador = this.validarTexto(dados.comprador, 'Comprador', 100)
            const dataPedido = validarData(dados.data_pedido, 'Data do pedido')
            const dataEntrega = validarData(dados.data_entrega, 'Data de entrega', false)
            if (dataEntrega && dataEntrega < dataPedido) {
                throw { status: 400, mensagem: 'A data de entrega não pode ser anterior à data do pedido' }
            }
            if (!file) throw { status: 400, mensagem: 'Nota fiscal em PDF é obrigatória' }

            const itens = this.normalizarItens(dados.itens)
            await this.validarEstoques(itens)
            const matricula = await this.validarMatricula(dados.numero_matricula)

            const venda = {
                comprador,
                data_pedido: dataPedido,
                data_entrega: dataEntrega,
                nota_fiscal: caminhoPublico('notas_fiscais/saida', file.filename),
                numero_matricula: matricula
            }

            const id = await VendaRepository.insert(venda, itens, matricula)
            return {
                sucesso: true,
                mensagem: 'Venda cadastrada com sucesso',
                id,
                venda: this.normalizarVenda(await VendaRepository.selectById(id))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async atualizar(id, dados) {
        const { file } = dados
        let vendaExistente
        try {
            if (file) await validarAssinaturaArquivo(file, 'pdf')
            const idValidado = validarId(id)
            vendaExistente = await VendaRepository.selectById(idValidado)
            if (!vendaExistente) throw { status: 404, mensagem: 'Venda não encontrada' }

            const atualizado = {}
            if (dados.comprador !== undefined) atualizado.comprador = this.validarTexto(dados.comprador, 'Comprador', 100)
            if (dados.data_pedido !== undefined) atualizado.data_pedido = validarData(dados.data_pedido, 'Data do pedido')
            if (dados.data_entrega !== undefined) atualizado.data_entrega = validarData(dados.data_entrega, 'Data de entrega', false)
            if (file) atualizado.nota_fiscal = caminhoPublico('notas_fiscais/saida', file.filename)

            const dataPedidoFinal = atualizado.data_pedido || vendaExistente.data_pedido
            const dataEntregaFinal = atualizado.data_entrega !== undefined
                ? atualizado.data_entrega
                : vendaExistente.data_entrega
            if (dataEntregaFinal && dataEntregaFinal < dataPedidoFinal) {
                throw { status: 400, mensagem: 'A data de entrega não pode ser anterior à data do pedido' }
            }

            const itens = dados.itens === undefined ? undefined : this.normalizarItens(dados.itens)
            if (itens !== undefined) await this.validarEstoques(itens)
            if (Object.keys(atualizado).length === 0 && itens === undefined) {
                throw { status: 400, mensagem: 'Nenhum dado a atualizar' }
            }

            await VendaRepository.set(idValidado, atualizado, itens, dados.operador_matricula || null)
            if (file && vendaExistente.nota_fiscal) await removerArquivoSalvo(vendaExistente.nota_fiscal)

            return {
                sucesso: true,
                mensagem: 'Venda atualizada com sucesso',
                novaVenda: this.normalizarVenda(await VendaRepository.selectById(idValidado))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async deletar(id, operadorMatricula = null) {
        const idValidado = validarId(id)
        const vendaDeletada = await VendaRepository.delete(idValidado, operadorMatricula)
        await removerArquivoSalvo(vendaDeletada.nota_fiscal)
        return {
            sucesso: true,
            mensagem: 'Venda excluída com sucesso',
            vendaDeletada: this.normalizarVenda(vendaDeletada)
        }
    }

    normalizarVenda(venda) {
        if (!venda) return venda
        return { ...venda, nota_fiscal: normalizarUrlPublica(venda.nota_fiscal) }
    }

    normalizarItens(itens) {
        if (typeof itens === 'string') {
            try {
                itens = JSON.parse(itens)
            } catch {
                throw { status: 400, mensagem: 'Itens da venda devem ser um JSON válido' }
            }
        }
        if (!Array.isArray(itens) || itens.length === 0) {
            throw { status: 400, mensagem: 'A venda deve conter ao menos um item' }
        }

        return itens.map(item => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw { status: 400, mensagem: 'Item da venda inválido' }
            }
            const idEstoque = validarId(item.id_estoque, 'ID do estoque')
            const quantidade = Number(item.quantidade_venda_item)
            if (item.preco_unitario === undefined || item.preco_unitario === null || String(item.preco_unitario).trim() === '') {
                throw { status: 400, mensagem: 'Preço unitário é obrigatório em cada item' }
            }
            const preco = Number(String(item.preco_unitario).replace(',', '.'))
            if (!Number.isInteger(quantidade) || quantidade <= 0) {
                throw { status: 400, mensagem: 'A quantidade de cada item deve ser um inteiro positivo' }
            }
            if (!Number.isFinite(preco) || preco < 0 || preco > 99999999) {
                throw { status: 400, mensagem: 'Preço unitário inválido em um dos itens' }
            }
            return {
                id_estoque: idEstoque,
                quantidade_venda_item: quantidade,
                preco_unitario: Math.round(preco * 100) / 100
            }
        }).sort((a, b) => a.id_estoque - b.id_estoque)
    }

    async validarEstoques(itens) {
        for (const idEstoque of new Set(itens.map(item => item.id_estoque))) {
            if (!await EstoqueRepository.selectById(idEstoque)) {
                throw { status: 404, mensagem: `Lote de estoque ${idEstoque} não encontrado` }
            }
        }
    }

    async validarMatricula(valor) {
        if (valor === undefined || valor === null || valor === '') return null
        const matricula = validarId(valor, 'Número de matrícula')
        if (!await FuncionarioRepository.selectById(matricula)) {
            throw { status: 404, mensagem: 'Funcionário responsável não encontrado' }
        }
        return matricula
    }

    validarTexto(valor, campo, maximo) {
        if (typeof valor !== 'string' || !valor.trim()) throw { status: 400, mensagem: `${campo} é obrigatório` }
        const texto = valor.trim()
        if (texto.length > maximo) throw { status: 400, mensagem: `${campo} deve ter no máximo ${maximo} caracteres` }
        return texto
    }
}

module.exports = new VendaService()
