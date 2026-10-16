const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const MatriculaRepository = require('../repositories/MatriculaRepository')
const bcrypt = require('bcryptjs');

class FuncionarioService {
    async listar() {
        const funcionarios = await FuncionarioRepository.selectAll()

        return {
            sucesso: true,
            funcionarios: funcionarios,
            total: funcionarios.length
        }
    }

    async buscarPorId(numero_matricula) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const funcionario = await FuncionarioRepository.selectById(numero_matricula)
        if (!funcionario) {
            throw { status: 404, mensagem: "Funcionário não encontrado" }
        }

        return {
            sucesso: true,
            funcionario: funcionario
        }
    }

    async cadastrar(funcionarioData) {
        const { numero_matricula, senha, nome, telefone } = funcionarioData

        if (!numero_matricula || !senha || !nome) {
            throw { status: 400, mensagem: "Número da matrícula, senha e nome são obrigarórios" }
        }

        if (isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número da matrícula deve ser um número positivo" }
        }

        const matriculaExistente = await MatriculaRepository.selectById(numero_matricula)
        const funcionarioExistente = await FuncionarioRepository.selectById(numero_matricula)
        if (!matriculaExistente) {
            throw { status: 404, mensagem: "Número da matrícula não encontrado" }
        } else if (funcionarioExistente) {
            throw { status: 400, mensagem: "Funcionário já cadastrado" }
        }

        if (senha.trim().length < 8 ) {
            throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha.trim(), salt);

        let numeros_telefone = null
        if (telefone) {
            numeros_telefone = telefone.replace(/\D/g, '')
            if (!/^\d{11}$/.test(numeros_telefone)) {
                throw { status: 400, mensagem: 'Telefone inválido' }
            }
        }

        const funcionario = {
            numero_matricula: Number(numero_matricula),
            senha: senhaHash,
            nome: nome.trim(),
            telefone: numeros_telefone,
        }

        await FuncionarioRepository.insert(funcionario)

        return {
            sucesso: true,
            mensagem: "Funcionário cadastrado com sucesso",
            funcionario: await FuncionarioRepository.selectById(numero_matricula)
        }
    }

    async atualizar(numero_matricula, funcionarioData) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const funcionarioExistente = await FuncionarioRepository.selectById(numero_matricula);
        if (!funcionarioExistente) {
            throw { status: 404, mensagem: "Funcionário não encontrado" };
        }

        const funcionarioAtualizado = {}
        const { senha, nome, telefone } = funcionarioData

        if (nome !== undefined) {
            if (nome === null || nome.trim() === '') {
                throw { status: 400, mensagem: "Nome não pode ser vazio" }
            }
            funcionarioAtualizado.nome = nome.trim()
        }
        if (senha !== undefined) {
            if (senha === null || senha.trim() === '') {
                throw { status: 400, mensagem: "Senha não pode ser vazia" }
            }
            if (senha.trim().length < 8) {
                throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
            }
            
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha.trim(), salt);
            funcionarioAtualizado.senha = senhaHash
        }
        if (telefone !== undefined ) {
            if (telefone === null || telefone === '') {
                funcionarioAtualizado.telefone = null
            }
            else {
                const numeros_telefone = telefone.replace(/\D/g, '')
                if (!/^\d{11}$/.test(numeros_telefone)) {
                    throw { status: 400, mensagem: 'Telefone inválido' }
                }
                funcionarioAtualizado.telefone = numeros_telefone
            }
        }

        if (Object.keys(funcionarioAtualizado).length == 0) {
            throw { status: 400, mensagem: "Nenhum dado a atualizar" }
        }

        await FuncionarioRepository.set(numero_matricula, funcionarioAtualizado)

        return {
            sucesso: true,
            mensagem: "Funcionário atualizado com sucesso",
            novoFuncionario: await FuncionarioRepository.selectById(numero_matricula)
        }
    }

    async login(funcionarioData) {
        const { numero_matricula, senha } = funcionarioData;
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const funcionario = await FuncionarioRepository.selectSenha(numero_matricula)
        if (!funcionario) {
            throw { status: 404, mensagem: "Funcionário não encontrado" }
        }

        const senhaValida = await bcrypt.compare(senha, funcionario.senha)
        if (!senhaValida) {
            throw { status: 401, mensagem: "Senha incorreta" }
        }

        return {
            sucesso: true,
            mensagem: "Login realizado com sucesso",
            numero_matricula: numero_matricula
        }
    }

    async deletar(numero_matricula) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const funcionarioExistente = await FuncionarioRepository.selectById(numero_matricula)
        if (!funcionarioExistente) {
            throw { status: 404, mensagem: "Funcionário não encontrado" }
        }

        await FuncionarioRepository.delete(numero_matricula)

        return {
            sucesso: true,
            mensagem: "Funcionário deletado com sucesso",
            funcionarioDeletado: funcionarioExistente
        }
    }
}

module.exports = new FuncionarioService()