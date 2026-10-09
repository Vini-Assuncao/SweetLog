const MatriculaRepository = require('../repositories/MatriculaRepository')

class MatriculaService {
    async listar() {
        const matriculas = await MatriculaRepository.selectAll()

        return {
            sucesso: true,
            matriculas: matriculas,
            total: matriculas.length
        }
    }

    async buscarPorId(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" }
        }

        const matricula = await MatriculaRepository.selectById(id)

        return {
            sucesso: true,
            matricula
        }
    }

    async cadastrar(matriculaData) {
        let { numero_matricula, setor } = matriculaData

        if (!numero_matricula || !setor) {
            throw { status: 400, mensagem: "Número de matrícula e setor são obrigatórios" }
        }

        if (isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula deve ser um número positivo" }
        }

        const setoresPermitidos = ['RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado']
        let setorValido = false
        setoresPermitidos.forEach(setorPermitido => {
            if (setorPermitido.toLowerCase() === setor.trim().toLowerCase()) {
                setor = setorPermitido
                setorValido = true
            }
        })
        if (!setorValido) {
            throw { status: 400, mensagem: "Setor inválido" }
        }

        const matriculaExistente = await MatriculaRepository.selectById(numero_matricula)
        if (matriculaExistente) {
            throw { status: 400, mensagem: "Número de matrícula já cadastrado" }
        }

        const matricula = {
            numero_matricula,
            setor
        }

        await MatriculaRepository.insert(matricula)

        return {
            sucesso: true,
            matricula
        }
    }

    async deletar(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" }
        }

        const matricula = await MatriculaRepository.selectById(id)
        if (!matricula) {
            throw { status: 404, mensagem: "Matrícula não encontrada" }
        }

        await MatriculaRepository.delete(id)

        return {
            sucesso: true,
            mensagem: "Matrícula deletada com sucesso"
        }
    }
}

module.exports = new MatriculaService()