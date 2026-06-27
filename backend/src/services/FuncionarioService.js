const FuncionarioRepository = require('../repositories/FuncionarioRepository')

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
        const { numero_matricula, senha, nome, telefone, cargo } = funcionarioData

        if (!numero_matricula || !senha || !nome || !cargo) {
            throw { status: 400, mensagem: "Número da matrícula, senha, nome e cargo são obrigarórios" }
        }

        if (isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número da matrícula deve ser um número positivo" }
        }

        if (senha.trim().length < 8 ) {
            throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
        }

        let numeros_telefone = null
        if (telefone) {
            numeros_telefone = telefone.replace(/\D/g, '')
            if (!/^\d{11}$/.test(numeros_telefone)) {
                throw { status: 400, mensagem: 'Telefone inválido' }
            }
        }

        const funcionario = {
            numero_matricula: Number(numero_matricula),
            senha: senha.trim(),
            nome: nome.trim(),
            telefone: numeros_telefone,
            cargo
        }

        await FuncionarioRepository.insert(funcionario)

        return {
            sucesso: true,
            mensagem: "Funcionário cadastrado com sucesso",
            funcionario: funcionario
        }
    }

    async atualizar(numero_matricula, funcionarioData) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const existe = await FuncionarioRepository.selectById(numero_matricula);
        if (!existe) {
            throw { status: 404, mensagem: "Funcionário não encontrado" };
        }

        const atualizado = {}
        const { senha, nome, telefone, cargo } = funcionarioData

        if (nome !== undefined) {
            if (nome === null || nome.trim() === '') {
                throw { status: 400, mensagem: "Nome não pode ser vazio" }
            }
            atualizado.nome = nome.trim()
        }
        if (senha !== undefined) {
            if (senha === null || senha.trim() === '') {
                throw { status: 400, mensagem: "Senha não pode ser vazia" }
            }
            if (senha.trim().length < 8) {
                throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
            } atualizado.senha = senha.trim()
        }
        if (telefone !== undefined ) {
            if (telefone === null || telefone === '') {
                atualizado.telefone = null
            }
            else {
                const numeros_telefone = telefone.replace(/\D/g, '')
                if (!/^\d{11}$/.test(numeros_telefone)) {
                    throw { status: 400, mensagem: 'Telefone inválido' }
                } atualizado.telefone = numeros_telefone
            }
        }
        if (cargo !== undefined) {
            if (cargo === null || cargo.trim() === '') {
                throw { status: 400, mensagem: "Cargo não pode ser vazio" }
            }
            atualizado.cargo = cargo
        }

        if (Object.keys(atualizado).length == 0) {
            throw { status: 400, mensagem: "Nenhum dado a atualizar" }
        }

        await FuncionarioRepository.set(numero_matricula, atualizado)

        return {
            sucesso: true,
            mensagem: "Funcionário atualizado com sucesso",
            novoFuncionario: await FuncionarioRepository.selectById(numero_matricula)
        }
    }

    async deletar(numero_matricula) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const funcionario = await FuncionarioRepository.selectById(numero_matricula)
        if (!funcionario) {
            throw { status: 404, mensagem: "Funcionário não encontrado" }
        }

        await FuncionarioRepository.delete(numero_matricula)

        return {
            sucesso: true,
            mensagem: "Funcionário deletado com sucesso",
            funcionarioDeletado: funcionario
        }
    }
}

module.exports = new FuncionarioService()