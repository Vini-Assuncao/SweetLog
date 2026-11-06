const ProdutoRepository = require('../repositories/ProdutoRepository')
const { caminhoPublico, normalizarUrlPublica, validarAssinaturaArquivo, removerUpload, removerArquivoSalvo } = require('../utils/arquivos')
const { validarId, normalizarBooleano, opcionalTexto } = require('../utils/validacao')
const { validarCnpj } = require('../utils/cadastro')

class ProdutoService {
    async listar(filtros = {}) {
        const produtos = await ProdutoRepository.selectAll({ buscar: filtros.buscar })
        return { sucesso: true, produtos: produtos.map(produto => this.normalizarProduto(produto)), total: produtos.length }
    }

    async buscarPorId(id) {
        const produto = await ProdutoRepository.selectById(validarId(id))
        if (!produto) throw { status: 404, mensagem: 'Produto não encontrado' }
        return { sucesso: true, produto: this.normalizarProduto(produto) }
    }

    async cadastrar(dados) {
        const { file } = dados
        try {
            if (file) await validarAssinaturaArquivo(file, 'imagem')
            const nome = this.validarTextoObrigatorio(dados.nome, 'Nome', 100)
            const cnpj = this.normalizarCnpj(dados.cnpj_fabricante)
            const refrigeracao = normalizarBooleano(dados.necessidade_refrigeracao, 'Necessidade de refrigeração')

            const produto = {
                nome,
                necessidade_refrigeracao: refrigeracao,
                cnpj_fabricante: cnpj,
                marca: this.validarTextoOpcional(dados.marca, 'Marca', 100),
                tamanho: this.validarTextoOpcional(dados.tamanho, 'Tamanho', 20),
                descricao: this.validarTextoOpcional(dados.descricao, 'Descrição', 200),
                imagem: file ? caminhoPublico('produtos', file.filename) : null
            }

            const id = await ProdutoRepository.insert(produto)
            return {
                sucesso: true,
                mensagem: 'Produto cadastrado com sucesso',
                id,
                produto: this.normalizarProduto(await ProdutoRepository.selectById(id))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async atualizar(id, dados) {
        const { file } = dados
        let produtoExistente
        try {
            if (file) await validarAssinaturaArquivo(file, 'imagem')
            const idValidado = validarId(id)
            produtoExistente = await ProdutoRepository.selectById(idValidado)
            if (!produtoExistente) throw { status: 404, mensagem: 'Produto não encontrado' }

            const atualizado = {}
            if (dados.nome !== undefined) atualizado.nome = this.validarTextoObrigatorio(dados.nome, 'Nome', 100)
            if (dados.necessidade_refrigeracao !== undefined) {
                atualizado.necessidade_refrigeracao = normalizarBooleano(
                    dados.necessidade_refrigeracao, 'Necessidade de refrigeração'
                )
            }
            if (dados.cnpj_fabricante !== undefined) atualizado.cnpj_fabricante = this.normalizarCnpj(dados.cnpj_fabricante)
            if (dados.marca !== undefined) atualizado.marca = this.validarTextoOpcional(dados.marca, 'Marca', 100)
            if (dados.tamanho !== undefined) atualizado.tamanho = this.validarTextoOpcional(dados.tamanho, 'Tamanho', 20)
            if (dados.descricao !== undefined) atualizado.descricao = this.validarTextoOpcional(dados.descricao, 'Descrição', 200)
            if (file) atualizado.imagem = caminhoPublico('produtos', file.filename)

            if (Object.keys(atualizado).length === 0) {
                throw { status: 400, mensagem: 'Nenhum dado a atualizar' }
            }

            await ProdutoRepository.set(idValidado, atualizado)
            if (file && produtoExistente.imagem) await removerArquivoSalvo(produtoExistente.imagem)

            return {
                sucesso: true,
                mensagem: 'Produto atualizado com sucesso',
                novoProduto: this.normalizarProduto(await ProdutoRepository.selectById(idValidado))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async deletar(id) {
        const idValidado = validarId(id)
        const produto = await ProdutoRepository.selectById(idValidado)
        if (!produto) throw { status: 404, mensagem: 'Produto não encontrado' }

        if (await ProdutoRepository.hasStocks(idValidado)) {
            throw { status: 409, mensagem: 'Não é possível excluir um produto que possui lotes de estoque associados' }
        }
        if (await ProdutoRepository.hasAlerts(idValidado)) {
            throw { status: 409, mensagem: 'Não é possível excluir um produto com histórico de alertas associado' }
        }

        const excluido = await ProdutoRepository.delete(idValidado)
        if (!excluido) throw { status: 404, mensagem: 'Produto não encontrado' }
        await removerArquivoSalvo(produto.imagem)
        return {
            sucesso: true,
            mensagem: 'Produto deletado com sucesso',
            produtoDeletado: this.normalizarProduto(produto)
        }
    }

    normalizarProduto(produto) {
        if (!produto) return produto
        return { ...produto, imagem: normalizarUrlPublica(produto.imagem) }
    }

    validarTextoObrigatorio(valor, campo, tamanhoMaximo) {
        if (typeof valor !== 'string' || !valor.trim()) {
            throw { status: 400, mensagem: `${campo} é obrigatório` }
        }
        const texto = valor.trim()
        if (texto.length > tamanhoMaximo) {
            throw { status: 400, mensagem: `${campo} deve ter no máximo ${tamanhoMaximo} caracteres` }
        }
        return texto
    }

    validarTextoOpcional(valor, campo, tamanhoMaximo) {
        if (valor === undefined) return null
        const texto = opcionalTexto(valor)
        if (texto && texto.length > tamanhoMaximo) {
            throw { status: 400, mensagem: `${campo} deve ter no máximo ${tamanhoMaximo} caracteres` }
        }
        return texto
    }

    normalizarCnpj(valor) {
        return validarCnpj(valor)
    }
}

module.exports = new ProdutoService()
