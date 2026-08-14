const EstoqueRepository = require('../repositories/EstoqueRepository')
const ProdutoRepository = require('../repositories/ProdutoRepository')
const fs = require('fs').promises;
const path = require('path');

class EstoqueService {
    async listar() {
        const estoques = await EstoqueRepository.selectAll()
        return {
            sucesso: true,
            estoques: estoques,
            total: estoques.length
        }
    }

    async buscarPorId(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const estoque = await EstoqueRepository.selectById(id)
        if (!estoque) {
            throw { status: 404, mensagem: "Estoque não encontrado" }
        }

        return {
            sucesso: true,
            estoque: estoque
        }
    }

    async cadastrar(estoqueData) {
        let { lote_producao, quantidade, inspecionado, data_validade, id_produto, file } = estoqueData

        if (!lote_producao || !quantidade || !inspecionado || !data_validade || !id_produto || !file) {
            await this.deletarImagem(estoqueData, "Todos os campos são obrigatórios")
            throw { status: 400, mensagem: "Todos os campos são obrigatórios" }
        }

        if (isNaN(quantidade) || quantidade <= 0) {
            await this.deletarImagem(estoqueData, "Quantidade inválida")
            throw { status: 400, mensagem: "Quantidade inválida" }
        }

        if (inspecionado == true || inspecionado == 'true') inspecionado = true
        else if (inspecionado == false || inspecionado == 'false') inspecionado = false
        else{
            await this.deletarImagem(estoqueData, "Status de inspeção inválido")
            throw { status: 400, mensagem: "Status de inspeção inválido" }
        }

        const dataRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dataRegex.test(data_validade)) {
            await this.deletarImagem(estoqueData, "Data de validade inválida")
            throw { status: 400, mensagem: "Data de validade inválida. Use o formato YYYY-MM-DD" }
        }
        const [ano, mes, dia] = data_validade.split('-').map(Number)
        const data = new Date(ano, mes - 1, dia)
        if (
            data.getFullYear() !== ano ||
            data.getMonth() !== mes - 1 ||
            data.getDate() !== dia
        ) {
            await this.deletarImagem(estoqueData, "Data de validade inválida")
            throw { status: 400, mensagem: "Data de validade inválida" }
        }

        if (isNaN(id_produto) || id_produto <= 0) {
            await this.deletarImagem(estoqueData, "ID do produto inválido")
            throw { status: 400, mensagem: "ID do produto inválido" }
        } else {
            const produto = await ProdutoRepository.selectById(id_produto)
            if (!produto) {
                await this.deletarImagem(estoqueData, "Produto não encontrado")
                throw { status: 404, mensagem: "Produto não encontrado" }
            }
        }

        const estoque = {
            lote_producao: lote_producao.trim(),
            quantidade: quantidade,
            inspecionado: inspecionado,
            data_validade: data_validade,
            id_produto: id_produto,
            nota_fiscal: file ? `backend/public/uploads/notas_fiscais/${file.filename}` : null,
        }

        const id = await EstoqueRepository.insert(estoque)

        return {
            sucesso: true,
            mensagem: "Estoque cadastrado com sucesso",
            id,
            estoque: estoque
        }
    }

    async deletarImagem(dados, mensagem) {
        if (dados.file) {
            try {
                await fs.unlink(dados.file.path);
            } catch (err) {
                console.error(`${mensagem} e erro ao apagar imagem enviada`, err);
            }
        }
    }
}

module.exports = new EstoqueService()