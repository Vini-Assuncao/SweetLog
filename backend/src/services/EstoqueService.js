const EstoqueRepository = require('../repositories/EstoqueRepository')
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
        const { lote_producao, quantidade, inspecionado, data_validade, id_produto, file } = estoqueData

        if (!lote_producao || !quantidade || !inspecionado || !data_validade || !id_produto || !file) {
            await this.deletarImagem(estoqueData, "Todos os campos são obrigatórios")
            throw { status: 400, mensagem: "Todos os campos são obrigatórios" }
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