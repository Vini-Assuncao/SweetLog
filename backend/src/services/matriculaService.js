const MatriculaRepository = require('../repositories/MatriculaRepository')
const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const { validarId } = require('../utils/validacao')

const setoresPermitidos = ['Administrador', 'RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado']

class MatriculaService {
    async listar() {
        const matriculas = await MatriculaRepository.selectAll()
        return { sucesso: true, matriculas, total: matriculas.length }
    }

    async buscarPorId(id) {
        const numero = validarId(id, 'Número de matrícula')
        const matricula = await MatriculaRepository.selectById(numero)
        if (!matricula) throw { status: 404, mensagem: 'Matrícula não encontrada' }
        return { sucesso: true, matricula }
    }

    async cadastrar(dados) {
        const numero = validarId(dados.numero_matricula, 'Número de matrícula')
        const setor = this.validarSetor(dados.setor)
        if (await MatriculaRepository.selectById(numero)) {
            throw { status: 409, mensagem: 'Número de matrícula já cadastrado' }
        }
        await MatriculaRepository.insert({ numero_matricula: numero, setor })
        return {
            sucesso: true,
            mensagem: 'Matrícula cadastrada com sucesso',
            matricula: await MatriculaRepository.selectById(numero)
        }
    }

    async atualizar(id, dados) {
        const numero = validarId(id, 'Número de matrícula')
        const existente = await MatriculaRepository.selectById(numero)
        if (!existente) throw { status: 404, mensagem: 'Matrícula não encontrada' }
        if (dados.setor === undefined) throw { status: 400, mensagem: 'Nenhum dado a atualizar' }

        const setor = this.validarSetor(dados.setor)
        await MatriculaRepository.set(numero, { setor })
        return {
            sucesso: true,
            mensagem: 'Matrícula atualizada com sucesso',
            novaMatricula: await MatriculaRepository.selectById(numero)
        }
    }

    async deletar(id) {
        const numero = validarId(id, 'Número de matrícula')
        const matricula = await MatriculaRepository.selectById(numero)
        if (!matricula) throw { status: 404, mensagem: 'Matrícula não encontrada' }
        if (await FuncionarioRepository.selectById(numero)) {
            throw { status: 409, mensagem: 'Existe um funcionário vinculado a esta matrícula' }
        }
        await MatriculaRepository.delete(numero)
        return { sucesso: true, mensagem: 'Matrícula excluída com sucesso', matriculaDeletada: matricula }
    }

    validarSetor(valor) {
        if (typeof valor !== 'string') throw { status: 400, mensagem: 'Setor inválido' }
        const setor = setoresPermitidos.find(opcao => opcao.toLowerCase() === valor.trim().toLowerCase())
        if (!setor) throw { status: 400, mensagem: 'Setor inválido' }
        return setor
    }
}

module.exports = new MatriculaService()
