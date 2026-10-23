const VendaRepository = require('../repositories/VendaRepository')
const EstoqueRepository = require('../repositories/EstoqueRepository')
const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const fs = require('fs').promises
const path = require('path')

class VendaService {
    async listar() {
        const vendas = await VendaRepository.selectAll()
        return {
            sucesso: true,
            vendas,
            total: vendas.length
        }
    }

    async buscarPorId(id) {
        this.validarId(id, "ID inválido")
        const venda = await VendaRepository.selectById(id)
        if (!venda) {
            throw { status: 404, mensagem: "Venda não encontrada" }
        }
        return {
            sucesso: true,
            venda
        }
    }

    async cadastrar(vendaData) {
        let persistida = false
        try {
            const { comprador, data_pedido, data_entrega, numero_matricula, file } = vendaData
            if (typeof comprador !== 'string' || !comprador.trim() || !data_pedido || !file) {
                throw { status: 400, mensagem: "Comprador, data do pedido e nota fiscal são obrigatórios" }
            }

            const itens = this.normalizarItens(vendaData.itens)
            await this.validarEstoques(itens)
            const matricula = await this.validarMatricula(numero_matricula)
            this.validarData(data_pedido, "Data do pedido")
            if (data_entrega) this.validarData(data_entrega, "Data de entrega")

            const dadosVenda = {
                comprador: comprador.trim(),
                data_pedido,
                data_entrega: data_entrega || null,
                nota_fiscal: `backend/public/uploads/notas_fiscais/saida/${file.filename}`,
                numero_matricula: matricula
            }

            const id = await VendaRepository.insert(dadosVenda, itens)
            persistida = true
            return {
                sucesso: true,
                mensagem: "Venda cadastrada com sucesso",
                id,
                venda: await VendaRepository.selectById(id)
            }
        } catch (error) {
            if (!persistida) await this.deletarArquivo(vendaData.file)
            throw error
        }
    }

    async atualizar(id, vendaData) {
        let persistida = false
        try {
            this.validarId(id, "ID inválido")
            const vendaExistente = await VendaRepository.selectById(id)
            if (!vendaExistente) {
                throw { status: 404, mensagem: "Venda não encontrada" }
            }

            const dadosAtualizados = {}
            const { comprador, data_pedido, data_entrega, numero_matricula, file } = vendaData
            if (comprador !== undefined) {
                if (typeof comprador !== 'string' || !comprador.trim()) {
                    throw { status: 400, mensagem: "Comprador não pode ser vazio" }
                }
                dadosAtualizados.comprador = comprador.trim()
            }
            if (data_pedido !== undefined) {
                this.validarData(data_pedido, "Data do pedido")
                dadosAtualizados.data_pedido = data_pedido
            }
            if (data_entrega !== undefined) {
                if (data_entrega !== null && data_entrega !== '') {
                    this.validarData(data_entrega, "Data de entrega")
                }
                dadosAtualizados.data_entrega = data_entrega || null
            }
            if (numero_matricula !== undefined) {
                dadosAtualizados.numero_matricula = await this.validarMatricula(numero_matricula)
            }
            if (file) {
                dadosAtualizados.nota_fiscal = `backend/public/uploads/notas_fiscais/saida/${file.filename}`
            }

            const itens = vendaData.itens === undefined
                ? undefined
                : this.normalizarItens(vendaData.itens)

            if (itens !== undefined) await this.validarEstoques(itens)
            if (Object.keys(dadosAtualizados).length === 0 && itens === undefined) {
                throw { status: 400, mensagem: "Nenhum dado a atualizar" }
            }

            await VendaRepository.set(id, dadosAtualizados, itens)
            persistida = true

            if (file && vendaExistente.nota_fiscal) {
                await this.deletarArquivoAntigo(vendaExistente.nota_fiscal)
            }

            return {
                sucesso: true,
                mensagem: "Venda atualizada com sucesso",
                novaVenda: await VendaRepository.selectById(id)
            }
        } catch (error) {
            if (!persistida) await this.deletarArquivo(vendaData.file)
            throw error
        }
    }

    async deletar(id) {
        this.validarId(id, "ID inválido")
        const vendaDeletada = await VendaRepository.delete(id)
        await this.deletarArquivoAntigo(vendaDeletada.nota_fiscal)
        return {
            sucesso: true,
            mensagem: "Venda deletada com sucesso",
            vendaDeletada
        }
    }

    normalizarItens(itens) {
        if (typeof itens === 'string') {
            try {
                itens = JSON.parse(itens)
            } catch {
                throw { status: 400, mensagem: "Itens da venda devem ser um JSON válido" }
            }
        }

        if (!Array.isArray(itens) || itens.length === 0) {
            throw { status: 400, mensagem: "A venda deve conter ao menos um item" }
        }

        return itens.map(item => {
            if (!item || typeof item !== 'object') {
                throw { status: 400, mensagem: "Item da venda inválido" }
            }
            const idEstoque = Number(item.id_estoque)
            const quantidade = Number(item.quantidade_venda_item)
            const preco = Number(item.preco_unitario)

            if (!Number.isInteger(idEstoque) || idEstoque <= 0) {
                throw { status: 400, mensagem: "ID do estoque inválido em um dos itens" }
            }
            if (!Number.isInteger(quantidade) || quantidade <= 0) {
                throw { status: 400, mensagem: "A quantidade de cada item deve ser um inteiro positivo" }
            }
            if (!Number.isFinite(preco) || preco < 0) {
                throw { status: 400, mensagem: "Preço unitário inválido em um dos itens" }
            }

            return {
                id_estoque: idEstoque,
                quantidade_venda_item: quantidade,
                preco_unitario: preco
            }
        }).sort((a, b) => a.id_estoque - b.id_estoque)
    }

    async validarEstoques(itens) {
        for (const idEstoque of new Set(itens.map(item => item.id_estoque))) {
            const estoque = await EstoqueRepository.selectById(idEstoque)
            if (!estoque) {
                throw { status: 404, mensagem: `Estoque ${idEstoque} não encontrado` }
            }
        }
    }

    async validarMatricula(numeroMatricula) {
        if (numeroMatricula === undefined || numeroMatricula === null || numeroMatricula === '') {
            return null
        }
        if (!Number.isInteger(Number(numeroMatricula)) || Number(numeroMatricula) <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" }
        }
        const funcionario = await FuncionarioRepository.selectById(numeroMatricula)
        if (!funcionario) {
            throw { status: 404, mensagem: "Funcionário não encontrado" }
        }
        return Number(numeroMatricula)
    }

    validarId(id, mensagem) {
        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            throw { status: 400, mensagem }
        }
    }

    validarData(data, campo) {
        if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            throw { status: 400, mensagem: `${campo} inválida. Use o formato YYYY-MM-DD` }
        }
        const [ano, mes, dia] = data.split('-').map(Number)
        const dataValidada = new Date(ano, mes - 1, dia)
        if (
            dataValidada.getFullYear() !== ano ||
            dataValidada.getMonth() !== mes - 1 ||
            dataValidada.getDate() !== dia
        ) {
            throw { status: 400, mensagem: `${campo} inválida` }
        }
    }

    async deletarArquivo(file) {
        if (!file) return
        try {
            await fs.unlink(file.path)
        } catch (error) {
            console.error("Erro ao apagar nota fiscal enviada:", error)
        }
    }

    async deletarArquivoAntigo(caminho) {
        if (!caminho) return
        try {
            await fs.unlink(path.resolve(__dirname, '..', '..', '..', caminho))
        } catch (error) {
            console.error("Erro ao apagar nota fiscal antiga:", error)
        }
    }
}

module.exports = new VendaService()
