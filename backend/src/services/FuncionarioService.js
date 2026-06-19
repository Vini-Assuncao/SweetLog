const FuncionarioRepository = require('../repositories/FuncionarioRepository')

class FuncionarioService {
    async listar() {
        const funcionarios = FuncionarioRepository.selectAll()

        return {
            sucesso: true,
            funcionarios: funcionarios
        }
    }

    async buscarPorId(id) {
        const funcionario = await FuncionarioRepository.selectById(id)
        if (!funcionario) {
            throw new Error("Funcionário não encontrado")
        }

        return {
            sucesso: true,
            funcionarios: funcionario
        }
    }

    async cadastrar(clienteData) {
        const { numero_matricula, senha, nome, telefone, cargo } = clienteData

        if (!numero_matricula || !senha || !nome || !cargo) {
            throw { status: 400, mensagem: "Número da matrícula, senha, nome e cargo são obrigarórios" }
        }

        if (isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número da matrícula deve ser um número positivo" }
        }

        if (senha.trim().length < 8 ) {
            throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
        }

        const numeros_telefone = telefone.replace(/\D/g, '')
        if (!/^\d{11}$/.test(numeros)) {
            throw { status: 400, mensagem: 'Telefone inválido' }
        }

        const cliente = {
            numero_matricula,
            senha: senha.trim,
            nome: nome.trim(),
            telefone: numeros_telefone.replace( /^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'),
            cargo
        }
    }

    async atualizar(id, clienteData) {
        if (!id || isNaN(id)) {
            throw { status: 400, mensagem: "ID inválido" };
        }

        const existe = await ProdutoRepository.selectById(id);
        if (!existe) {
            throw { status: 404, mensagem: "Produto não encontrado" };
        }

        const atualizado = {}
        const { numero_matricula, senha, nome, telefone, cargo } = clienteData

        if (numero_matricula !== undefined) {
            if (!Number(numero_matricula) || numero_matricula < 0) {
                throw { status: 400, mensagem: "Número da matrícula deve ser um número positivo" }
            } atualizado.numero_matricula = numero_matricula
        }
        if (nome !== undefined) atualizado.nome = nome.trim()
        if (senha !== undefined) {
            if (senha.trim().lenght < 8) {
                throw { status: 400, mensagem: "Senha deve ter no mínimo 8 caracteres" }
            } atualizado.senha = senha.trim()
        }
        if (telefone !== undefined) {
            const numeros_telefone = telefone.replace(/\D/g, '')
            if (!/^\d{11}$/.test(numeros)) {
                throw { status: 400, mensagem: 'Telefone inválido' }
            } atualizado.telefone = numeros_telefone.replace( /^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3')
        }
        if (cargo !== undefined) atualizado.cargo = cargo

        await FuncionarioRepository.set(id, atualizado)

        return {
            sucesso: true,
            mensagem: "Funcionário cadastrado com sucesso"
        }
    }

    async deletar(id) {
        const funcionario = await FuncionarioRepository.selectById(id)
        if (!funcionario) {
            throw new Error("Funcionário não encontrado")
        }

        return {
            sucesso: true,
            mensagem: "Funcionário deletado com sucesso",
            deletado: funcionario
        }
    }
}

module.exports = new FuncionarioService()