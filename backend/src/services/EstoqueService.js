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
            await this.deletarArquivo(estoqueData, "Todos os campos são obrigatórios")
            throw { status: 400, mensagem: "Todos os campos são obrigatórios" }
        }

        if (isNaN(quantidade) || quantidade <= 0) {
            await this.deletarArquivo(estoqueData, "Quantidade inválida")
            throw { status: 400, mensagem: "Quantidade inválida" }
        }

        if (inspecionado == true || inspecionado == 'true') inspecionado = true
        else if (inspecionado == false || inspecionado == 'false') inspecionado = false
        else{
            await this.deletarArquivo(estoqueData, "Status de inspeção inválido")
            throw { status: 400, mensagem: "Status de inspeção inválido" }
        }

        const dataRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dataRegex.test(data_validade)) {
            await this.deletarArquivo(estoqueData, "Data de validade inválida")
            throw { status: 400, mensagem: "Data de validade inválida. Use o formato YYYY-MM-DD" }
        }
        const [ano, mes, dia] = data_validade.split('-').map(Number)
        const data = new Date(ano, mes - 1, dia)
        if (
            data.getFullYear() !== ano ||
            data.getMonth() !== mes - 1 ||
            data.getDate() !== dia
        ) {
            await this.deletarArquivo(estoqueData, "Data de validade inválida")
            throw { status: 400, mensagem: "Data de validade inválida" }
        }

        if (isNaN(id_produto) || id_produto <= 0) {
            await this.deletarArquivo(estoqueData, "ID do produto inválido")
            throw { status: 400, mensagem: "ID do produto inválido" }
        } else {
            const produto = await ProdutoRepository.selectById(id_produto)
            if (!produto) {
                await this.deletarArquivo(estoqueData, "Produto não encontrado")
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

    async atualizar(id, estoqueData) {
        if (!id || isNaN(id) || id <= 0) {
            await this.deletarArquivo(estoqueData, "ID inválido")
            throw { status: 400, mensagem: "ID inválido" };
        }

        const estoqueExistente = await EstoqueRepository.selectById(id)
        if (!estoqueExistente) {
            await this.deletarArquivo(estoqueData, "Estoque não encontrado")
            throw { status: 404, mensagem: "Estoque não encontrado" }
        }

        const estoqueAtualizado = {}
        const { lote_producao, quantidade, inspecionado, data_validade, id_produto, file } = estoqueData

        if (lote_producao !== undefined) {
            if (lote_producao === null || lote_producao.trim() === '') {
                await this.deletarArquivo(estoqueData, "Lote de produção não pode ser vazio")
                throw { status: 400, mensagem: "Lote de produção não pode ser vazio" }
            }
            estoqueAtualizado.lote_producao = lote_producao.trim()
        }

        if (quantidade !== undefined) {
            if (isNaN(quantidade) || quantidade <= 0) {
                await this.deletarArquivo(estoqueData, "Quantidade inválida")
                throw { status: 400, mensagem: "Quantidade inválida" }
            }
            estoqueAtualizado.quantidade = quantidade
        }

        if (inspecionado !== undefined) {
            if (inspecionado === true || inspecionado === 'true') {
                inspecionado = true
            } else if (inspecionado === false || inspecionado === 'false') {
                inspecionado = false
            } else {
                await this.deletarArquivo(estoqueData, "Inspecionado inválido")
                throw { status: 400, mensagem: "Inspecionado inválido" }
            }
            estoqueAtualizado.inspecionado = inspecionado
        }

        if (data_validade !== undefined) {
            const dataRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dataRegex.test(data_validade)) {
                await this.deletarArquivo(estoqueData, "Data de validade inválida. Use o formato YYYY-MM-DD")
                throw { status: 400, mensagem: "Data de validade inválida. Use o formato YYYY-MM-DD" }
            }
            const [ano, mes, dia] = data_validade.split('-').map(Number)
            const data = new Date(ano, mes - 1, dia)
            if (
                data.getFullYear() !== ano ||
                data.getMonth() !== mes - 1 ||
                data.getDate() !== dia
            ) {
                throw { status: 400, mensagem: "Data de validade inválida" }
            }
            estoqueAtualizado.data_validade = data_validade
        }

        if (id_produto !== undefined) {
            if (isNaN(id_produto) || id_produto <= 0) {
                await this.deletarArquivo(estoqueData, "ID do produto inválido")
                throw { status: 400, mensagem: "ID do produto inválido" }
            } else {
                const produto = await ProdutoRepository.selectById(id_produto)
                if (!produto) {
                    await this.deletarArquivo(estoqueData, "Produto não encontrado")
                    throw { status: 404, mensagem: "Produto não encontrado" }
                }
                estoqueAtualizado.id_produto = id_produto
            }
        }

        if (file) {
            estoqueAtualizado.nota_fiscal = `backend/public/uploads/notas_fiscais/${file.filename}`;
            if (estoqueExistente.nota_fiscal) {
                const caminhoAntigo = path.join(__dirname, '..', '..', '..', estoqueExistente.nota_fiscal);
                try {
                    await fs.unlink(caminhoAntigo);
                } catch (err) {
                    console.error("Erro ao apagar nota fiscal antiga:", err);
                }
            }
        }

        if (Object.keys(estoqueAtualizado).length == 0) {
            throw { status: 400, mensagem: "Nenhum dado a atualizar" }
        }

        await EstoqueRepository.set(id, estoqueAtualizado)

        return {
            sucesso: true,
            mensagem: "Estoque atualizado com sucesso",
            novoEstoque: await EstoqueRepository.selectById(id)
        }
    }

    async deletar(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const estoque = await EstoqueRepository.selectById(id)
        if (!estoque) {
            throw { status: 404, mensagem: "Estoque não encontrado" }
        }

        if (estoque.nota_fiscal) {
            try {
                await fs.unlink(estoque.nota_fiscal);
            } catch (err) {
                console.error("Erro ao apagar nota fiscal antiga:", err);
            }
        }

        await EstoqueRepository.delete(id)

        return {
            sucesso: true,
            mensagem: "Estoque deletado com sucesso",
            estoqueDeletado: estoque
        }
    }

    async deletarArquivo(dados, mensagem) {
        if (dados.file) {
            try {
                await fs.unlink(dados.file.path);
            } catch (err) {
                console.error(`${mensagem} e erro ao apagar arquivo enviado`, err);
            }
        }
    }
}

module.exports = new EstoqueService()