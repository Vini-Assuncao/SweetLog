const EstoqueRepository = require('../repositories/EstoqueRepository')
const ProdutoRepository = require('../repositories/ProdutoRepository')
const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const { caminhoPublico, normalizarUrlPublica, validarAssinaturaArquivo, removerUpload, removerArquivoSalvo } = require('../utils/arquivos')
const { validarId, validarInteiro, validarData, normalizarBooleano } = require('../utils/validacao')

class EstoqueService {
    async listar(filtros = {}) {
        const filtrosValidados = this.normalizarFiltros(filtros)
        const estoques = await EstoqueRepository.selectAll(filtrosValidados)
        const total = filtrosValidados.limit
            ? await EstoqueRepository.contar(filtrosValidados)
            : estoques.length
        return { sucesso: true, estoques: estoques.map(estoque => this.normalizarEstoque(estoque)), total }
    }

    async buscarPorId(id) {
        const estoque = await EstoqueRepository.selectById(validarId(id))
        if (!estoque) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }
        return { sucesso: true, estoque: this.normalizarEstoque(estoque) }
    }

    async resumo() {
        return { sucesso: true, resumo: await EstoqueRepository.selectResumo() }
    }

    async listarPorProduto(idProduto) {
        const id = validarId(idProduto, 'ID do produto')
        if (!await ProdutoRepository.selectById(id)) throw { status: 404, mensagem: 'Produto não encontrado' }
        const estoques = await EstoqueRepository.selectByProduto(id)
        return { sucesso: true, estoques: estoques.map(estoque => this.normalizarEstoque(estoque)), total: estoques.length }
    }

    async diminuirQuantidade(id, quantidade, numeroMatricula, motivo) {
        const idValidado = validarId(id)
        const quantidadeNumerica = validarInteiro(quantidade, 'Quantidade', 1)
        const responsavel = await this.validarMatricula(numeroMatricula)
        const motivoValidado = motivo === undefined || motivo === null || String(motivo).trim() === ''
            ? 'Baixa manual de estoque'
            : String(motivo).trim()
        if (motivoValidado.length > 255) throw { status: 400, mensagem: 'Motivo deve ter no máximo 255 caracteres' }

        const resultado = await EstoqueRepository.decreaseQuantity(
            idValidado, quantidadeNumerica, responsavel, motivoValidado
        )
        if (!resultado) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }
        if (resultado.affectedRows === 0) {
            throw { status: 409, mensagem: 'Não foi possível realizar a baixa. Verifique o saldo e a validade do lote' }
        }
        return {
            sucesso: true,
            mensagem: 'Quantidade do estoque diminuída com sucesso',
            estoque: this.normalizarEstoque(await EstoqueRepository.selectById(idValidado))
        }
    }

    async cadastrar(dados) {
        const { file } = dados
        try {
            if (file) await validarAssinaturaArquivo(file, 'pdf')
            const lote = this.validarTexto(dados.lote_producao, 'Lote de produção', 100)
            const quantidade = validarInteiro(dados.quantidade, 'Quantidade', 1)
            if (!file) throw { status: 400, mensagem: 'Nota fiscal em PDF é obrigatória' }

            const inspecionado = normalizarBooleano(dados.inspecionado, 'Inspecionado')
            const dataValidade = validarData(dados.data_validade, 'Data de validade')
            const idProduto = validarId(dados.id_produto, 'ID do produto')
            if (!await ProdutoRepository.selectById(idProduto)) throw { status: 404, mensagem: 'Produto não encontrado' }

            const matricula = await this.validarMatricula(dados.numero_matricula)
            const dataEntrada = validarData(dados.data_entrada, 'Data de entrada', false)

            const estoque = {
                lote_producao: lote,
                quantidade,
                inspecionado,
                data_validade: dataValidade,
                data_entrada: dataEntrada,
                id_produto: idProduto,
                numero_matricula: matricula,
                nota_fiscal: caminhoPublico('notas_fiscais/entrada', file.filename)
            }

            const id = await EstoqueRepository.insert(estoque)
            return {
                sucesso: true,
                mensagem: 'Lote cadastrado com sucesso',
                id,
                estoque: this.normalizarEstoque(await EstoqueRepository.selectById(id))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async atualizar(id, dados) {
        const { file } = dados
        let estoqueExistente
        try {
            if (file) await validarAssinaturaArquivo(file, 'pdf')
            const idValidado = validarId(id)
            estoqueExistente = await EstoqueRepository.selectById(idValidado)
            if (!estoqueExistente) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }

            const atualizado = {}
            if (dados.lote_producao !== undefined) {
                atualizado.lote_producao = this.validarTexto(dados.lote_producao, 'Lote de produção', 100)
            }
            if (dados.quantidade !== undefined) {
                const quantidade = validarInteiro(dados.quantidade, 'Quantidade')
                atualizado.quantidade = quantidade
            }
            if (dados.inspecionado !== undefined) {
                atualizado.inspecionado = normalizarBooleano(dados.inspecionado, 'Inspecionado')
            }
            if (dados.data_validade !== undefined) {
                atualizado.data_validade = validarData(dados.data_validade, 'Data de validade')
            }
            if (dados.data_entrada !== undefined) {
                const dataEntrada = validarData(dados.data_entrada, 'Data de entrada', false)
                if (dataEntrada) atualizado.data_entrada = dataEntrada
            }
            if (dados.id_produto !== undefined) {
                const idProduto = validarId(dados.id_produto, 'ID do produto')
                if (!await ProdutoRepository.selectById(idProduto)) throw { status: 404, mensagem: 'Produto não encontrado' }
                atualizado.id_produto = idProduto
            }
            if (dados.numero_matricula !== undefined) {
                atualizado.numero_matricula = await this.validarMatricula(dados.numero_matricula)
            }
            if (file) atualizado.nota_fiscal = caminhoPublico('notas_fiscais/entrada', file.filename)
            if (Object.keys(atualizado).length === 0) throw { status: 400, mensagem: 'Nenhum dado a atualizar' }

            const atualizadoNoBanco = await EstoqueRepository.set(idValidado, atualizado, dados.operador_matricula || dados.numero_matricula || null)
            if (!atualizadoNoBanco) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }
            if (file && estoqueExistente.nota_fiscal) await removerArquivoSalvo(estoqueExistente.nota_fiscal)

            return {
                sucesso: true,
                mensagem: 'Lote atualizado com sucesso',
                novoEstoque: this.normalizarEstoque(await EstoqueRepository.selectById(idValidado))
            }
        } catch (error) {
            await removerUpload(file)
            throw error
        }
    }

    async deletar(id) {
        const idValidado = validarId(id)
        const estoque = await EstoqueRepository.selectById(idValidado)
        if (!estoque) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }
        if (await EstoqueRepository.hasSalesItems(idValidado)) {
            throw { status: 409, mensagem: 'Não é possível excluir um lote vinculado a uma venda' }
        }
        if (await EstoqueRepository.hasAlerts(idValidado)) {
            throw { status: 409, mensagem: 'Não é possível excluir um lote com histórico de alertas associado' }
        }

        const excluido = await EstoqueRepository.delete(idValidado)
        if (!excluido) throw { status: 404, mensagem: 'Lote de estoque não encontrado' }
        await removerArquivoSalvo(estoque.nota_fiscal)
        return {
            sucesso: true,
            mensagem: 'Lote excluído com sucesso',
            estoqueDeletado: this.normalizarEstoque(estoque)
        }
    }

    normalizarEstoque(estoque) {
        if (!estoque) return estoque
        return { ...estoque, nota_fiscal: normalizarUrlPublica(estoque.nota_fiscal) }
    }

    normalizarFiltros(filtros) {
        const statusPermitidos = ['todos', 'valido', 'proximo', 'vencido', 'zerado']
        const status = filtros.status || 'todos'
        if (!statusPermitidos.includes(status)) {
            throw { status: 400, mensagem: 'Filtro de status inválido' }
        }
        const resultado = { status, buscar: filtros.buscar ? String(filtros.buscar).trim() : undefined }
        if (filtros.id_produto !== undefined && filtros.id_produto !== '') {
            resultado.id_produto = validarId(filtros.id_produto, 'ID do produto')
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

    async validarMatricula(valor) {
        if (valor === undefined || valor === null || valor === '') return null
        const matricula = validarId(valor, 'Número de matrícula')
        if (!await FuncionarioRepository.selectById(matricula)) {
            throw { status: 404, mensagem: 'Funcionário responsável não encontrado' }
        }
        return matricula
    }

    validarTexto(valor, campo, tamanhoMaximo) {
        if (typeof valor !== 'string' || !valor.trim()) throw { status: 400, mensagem: `${campo} é obrigatório` }
        const texto = valor.trim()
        if (texto.length > tamanhoMaximo) throw { status: 400, mensagem: `${campo} deve ter no máximo ${tamanhoMaximo} caracteres` }
        return texto
    }
}

module.exports = new EstoqueService()
