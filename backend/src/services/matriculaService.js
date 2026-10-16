const MatriculaRepository = require('../repositories/MatriculaRepository')
const FuncionarioRepository = require('../repositories/FuncionarioRepository')

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

        if (!matricula) {
            throw { status: 404, mensagem: "Matrícula não encontrada" }
        }

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

    async atualizar(numero_matricula, matriculaData) {
        if (!numero_matricula || isNaN(numero_matricula) || numero_matricula <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" };
        }

        const matriculaExistente = await MatriculaRepository.selectById(numero_matricula);
        if (!matriculaExistente) {
            throw { status: 404, mensagem: "Matrícula não encontrada" };
        }

        const matriculaAtualizada = {}
        const { setor } = matriculaData

        if (setor !== undefined) {
            const setoresPermitidos = ['RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado']
            let setorValido = false
            setoresPermitidos.forEach(setorPermitido => {
                if (setorPermitido.toLowerCase() === setor.trim().toLowerCase()) {
                    matriculaAtualizada.setor = setorPermitido
                    setorValido = true
                }
            })
            if (!setorValido) {
                throw { status: 400, mensagem: "Setor inválido" }
            }
        }

        if (Object.keys(matriculaAtualizada).length == 0) {
            throw { status: 400, mensagem: "Nenhum dado a atualizar" }
        }
        
        await MatriculaRepository.set(numero_matricula, matriculaAtualizada)

        return {
            sucesso: true,
            mensagem: "Matrícula atualizada com sucesso",
            novaMatricula: await MatriculaRepository.selectById(numero_matricula)
        }
    }

    async deletar(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw { status: 400, mensagem: "Número de matrícula inválido" }
        }

        const matricula = await MatriculaRepository.selectById(id)
        if (!matricula) {
            throw { status: 400, mensagem: "Matrícula não encontrada" }
        }

        const funcionario = await FuncionarioRepository.selectById(id)
        if (funcionario) {
            throw { status: 404, mensagem: "Existe um funcionário dependente desta matrícula" }
        }

        await MatriculaRepository.delete(id)

        return {
            sucesso: true,
            mensagem: "Matrícula deletada com sucesso"
        }
    }
}

module.exports = new MatriculaService()