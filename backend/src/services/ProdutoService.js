const ProdutoRepository = require('../repositories/ProdutoRepository')
const fs = require('fs').promises;
const path = require('path');

class ProdutoService {
    async listar() {
        const produtos = await ProdutoRepository.selectAll()

        return {
            sucesso: true,
            produtos: produtos,
            total: produtos.length
        }
    }

    async buscarPorId(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const produto = await ProdutoRepository.selectById(id)
        if (!produto) {
            throw { status: 404, mensagem: "Produto não encontrado" }
        }

        return {
            sucesso: true,
            produto: produto
        }
    }

    async cadastrar(produtoData) {
        let { nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem } = produtoData
        console.log(imagem.filename)

        if (!nome || necessidade_refrigeracao === undefined || necessidade_refrigeracao === null || !cnpj_fabricante) {
            throw { status: 400, mensagem: "Nome, necessidade de refrigeração e CNPJ do fabricante são obrigatórios" }
        }

        if (necessidade_refrigeracao == true || necessidade_refrigeracao == 'true') necessidade_refrigeracao = true
        else if (necessidade_refrigeracao == false || necessidade_refrigeracao == 'false') necessidade_refrigeracao = false
        else{
            throw { status: 400, mensagem: "Necessidade de refrigeração inválida" }
        }

        let numeros_cnpj = cnpj_fabricante.replace(/\D/g, '')
        if (!/^\d{14}$/.test(numeros_cnpj)) {
            throw { status: 400, mensagem: "CNPJ do fabricante inválido" }
        }

// ======================== TO DO: arrumar imagem aparecendo null ================================================================

        const produto = {
            nome: nome.trim(),
            necessidade_refrigeracao: necessidade_refrigeracao,
            cnpj_fabricante: numeros_cnpj,
            marca: marca ? marca.trim() : null,
            tamanho: tamanho ? tamanho.trim() : null,
            descricao: descricao ? descricao.trim() : null,
            imagem: imagem ? `uploads/produtos/${imagem.filename}` : null,
        }

        const id = await ProdutoRepository.insert(produto)

        return {
            sucesso: true,
            mensagem: "Produto cadastrado com sucesso",
            id,
            produto: produto
        }
    }

    async atualizar(id, produtoData) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const existe = await ProdutoRepository.selectById(id);
        if (!existe) {
            throw { status: 404, mensagem: "Produto não encontrado" };
        }

        const atualizado = {}
        let { nome, necessidade_refrigeracao, cnpj_fabricante, marca, tamanho, descricao, imagem } = produtoData

        if (nome !== undefined) {
            if (nome === null || nome.trim() === '') {
                throw { status: 400, mensagem: "Nome não pode ser vazio" }
            }
            atualizado.nome = nome.trim()
        }

        if (necessidade_refrigeracao !== undefined) {
            if (necessidade_refrigeracao === true || necessidade_refrigeracao === 'true') {
                necessidade_refrigeracao = true
            } else if (necessidade_refrigeracao === false || necessidade_refrigeracao === 'false') {
                necessidade_refrigeracao = false
            } else {
                throw { status: 400, mensagem: "Necessidade de refrigeração inválida" }
            }
            atualizado.necessidade_refrigeracao = necessidade_refrigeracao
        }

        if (cnpj_fabricante !== undefined) {
            if (cnpj_fabricante === null || cnpj_fabricante.trim() === '') {
                throw { status: 400, mensagem: "CNPJ do fabricante é obrigatório" }
            }
            let numeros_cnpj = cnpj_fabricante.replace(/\D/g, '')
            if (!/^\d{14}$/.test(numeros_cnpj)) {
                throw { status: 400, mensagem: "CNPJ do fabricante inválido" }
            }
            atualizado.cnpj_fabricante = numeros_cnpj
        }

        if (marca !== undefined) atualizado.marca = marca.trim()
        if (tamanho !== undefined) atualizado.tamanho = tamanho.trim()
        if (descricao !== undefined) atualizado.descricao = descricao.trim()

        if (file) {
            atualizado.imagem = `uploads/produtos/${file.filename}`;
            if (existe.imagem) {
                const caminhoAntigo = path.join(__dirname, '..', '..', 'public', existe.imagem);
                try {
                    await fs.unlink(caminhoAntigo);
                } catch (err) {
                    console.error("Erro ao apagar imagem antiga:", err);
                }
            }
        }

        if (Object.keys(atualizado).length == 0) {
            throw { status: 400, mensagem: "Nenhum dado a atualizar" }
        }

        await ProdutoRepository.set(id, atualizado)

        return {
            sucesso: true,
            mensagem: "Produto atualizado com sucesso",
            novoProduto: await ProdutoRepository.selectById(id)
        }
    }

    async deletar(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const produto = await ProdutoRepository.selectById(id)
        if (!produto) {
            throw { status: 404, mensagem: "Produto não encontrado" }
        }

        await ProdutoRepository.delete(id)

        return {
            sucesso: true,
            mensagem: "Produto deletado com sucesso",
            produtoDeletado: produto
        }
    }
}

module.exports = new ProdutoService()