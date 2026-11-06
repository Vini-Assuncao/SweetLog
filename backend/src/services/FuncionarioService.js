const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const MatriculaRepository = require('../repositories/MatriculaRepository')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { validarId } = require('../utils/validacao')
const { gerarTokenFuncionario } = require('../utils/jwt')
const { normalizarTelefone: validarTelefone } = require('../utils/cadastro')

class FuncionarioService {
    async listar() {
        const funcionarios = await FuncionarioRepository.selectAll()
        return { sucesso: true, funcionarios, total: funcionarios.length }
    }

    async buscarPorId(numeroMatricula) {
        const numero = validarId(numeroMatricula, 'Número de matrícula')
        const funcionario = await FuncionarioRepository.selectById(numero)
        if (!funcionario) throw { status: 404, mensagem: 'Funcionário não encontrado' }
        return { sucesso: true, funcionario }
    }

    async cadastrar(dados) {
        const numero = validarId(dados.numero_matricula, 'Número de matrícula')
        const nome = this.validarNome(dados.nome)
        const senha = this.validarSenha(dados.senha)
        if (!await MatriculaRepository.selectById(numero)) {
            throw { status: 404, mensagem: 'Número da matrícula não encontrado' }
        }
        if (await FuncionarioRepository.selectById(numero)) {
            throw { status: 409, mensagem: 'Funcionário já cadastrado para esta matrícula' }
        }

        const telefone = this.normalizarTelefone(dados.telefone)
        const senhaHash = await bcrypt.hash(senha, 10)
        await FuncionarioRepository.insert({ numero_matricula: numero, senha: senhaHash, nome, telefone })
        return {
            sucesso: true,
            mensagem: 'Funcionário cadastrado com sucesso',
            funcionario: await FuncionarioRepository.selectById(numero)
        }
    }

    async atualizar(numeroMatricula, dados) {
        const numero = validarId(numeroMatricula, 'Número de matrícula')
        if (!await FuncionarioRepository.selectById(numero)) {
            throw { status: 404, mensagem: 'Funcionário não encontrado' }
        }

        const atualizado = {}
        if (dados.nome !== undefined) atualizado.nome = this.validarNome(dados.nome)
        if (dados.senha !== undefined) atualizado.senha = await bcrypt.hash(this.validarSenha(dados.senha), 10)
        if (dados.telefone !== undefined) atualizado.telefone = this.normalizarTelefone(dados.telefone)
        if (Object.keys(atualizado).length === 0) throw { status: 400, mensagem: 'Nenhum dado a atualizar' }

        await FuncionarioRepository.set(numero, atualizado)
        return {
            sucesso: true,
            mensagem: 'Funcionário atualizado com sucesso',
            novoFuncionario: await FuncionarioRepository.selectById(numero)
        }
    }

    async login(dados) {
        const numero = validarId(dados.numero_matricula, 'Número de matrícula')
        if (typeof dados.senha !== 'string' || !dados.senha) {
            throw { status: 400, mensagem: 'Senha é obrigatória' }
        }
        if (Buffer.byteLength(dados.senha, 'utf8') > 72) {
            throw { status: 401, mensagem: 'Matrícula ou senha incorreta' }
        }

        const registroSenha = await FuncionarioRepository.selectSenha(numero)
        if (!registroSenha) throw { status: 401, mensagem: 'Matrícula ou senha incorreta' }

        let senhaValida = false
        if (/^\$2[aby]\$/.test(registroSenha.senha)) {
            senhaValida = await bcrypt.compare(dados.senha, registroSenha.senha)
        } else {
            // Compatibilidade temporária com cadastros antigos gravados sem hash.
            const informada = Buffer.from(dados.senha)
            const armazenada = Buffer.from(String(registroSenha.senha))
            senhaValida = informada.length === armazenada.length && crypto.timingSafeEqual(informada, armazenada)
            if (senhaValida) {
                await FuncionarioRepository.set(numero, { senha: await bcrypt.hash(dados.senha, 10) })
            }
        }

        if (!senhaValida) throw { status: 401, mensagem: 'Matrícula ou senha incorreta' }
        const funcionario = await FuncionarioRepository.selectById(numero)
        const token = gerarTokenFuncionario(funcionario)
        return {
            sucesso: true,
            mensagem: 'Login realizado com sucesso',
            token,
            tipo_token: 'Bearer',
            expira_em_segundos: 8 * 60 * 60,
            funcionario
        }
    }

    async deletar(numeroMatricula) {
        const numero = validarId(numeroMatricula, 'Número de matrícula')
        const funcionario = await FuncionarioRepository.selectById(numero)
        if (!funcionario) throw { status: 404, mensagem: 'Funcionário não encontrado' }
        if (await FuncionarioRepository.hasMovimentacoes(numero)) {
            throw { status: 409, mensagem: 'Não é possível excluir um funcionário vinculado a entradas de estoque ou vendas' }
        }
        await FuncionarioRepository.delete(numero)
        return { sucesso: true, mensagem: 'Funcionário excluído com sucesso', funcionarioDeletado: funcionario }
    }

    validarNome(valor) {
        if (typeof valor !== 'string' || !valor.trim()) throw { status: 400, mensagem: 'Nome é obrigatório' }
        const nome = valor.trim()
        if (nome.length > 100) throw { status: 400, mensagem: 'Nome deve ter no máximo 100 caracteres' }
        return nome
    }

    validarSenha(valor) {
        if (typeof valor !== 'string' || valor.trim().length < 8) {
            throw { status: 400, mensagem: 'Senha deve ter no mínimo 8 caracteres' }
        }
        if (Buffer.byteLength(valor.trim(), 'utf8') > 72) throw { status: 400, mensagem: 'Senha deve ter no máximo 72 bytes em UTF-8' }
        return valor.trim()
    }

    normalizarTelefone(valor) {
        return validarTelefone(valor)
    }
}

module.exports = new FuncionarioService()
