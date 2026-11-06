function validarId(id, campo = 'ID') {
    const texto = typeof id === 'number' ? String(id) : String(id ?? '').trim()
    if (!/^\d+$/.test(texto)) throw { status: 400, mensagem: `${campo} inválido` }
    const numero = Number(texto)
    if (!Number.isSafeInteger(numero) || numero <= 0 || numero > 2147483647) {
        throw { status: 400, mensagem: `${campo} inválido` }
    }
    return numero
}

function validarData(data, campo = 'Data', obrigatoria = true) {
    if ((data === undefined || data === null || data === '') && !obrigatoria) return null
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        throw { status: 400, mensagem: `${campo} inválida. Use o formato YYYY-MM-DD` }
    }

    const [ano, mes, dia] = data.split('-').map(Number)
    const dataValidada = new Date(Date.UTC(ano, mes - 1, dia))
    if (
        dataValidada.getUTCFullYear() !== ano ||
        dataValidada.getUTCMonth() !== mes - 1 ||
        dataValidada.getUTCDate() !== dia
    ) {
        throw { status: 400, mensagem: `${campo} inválida` }
    }
    return data
}

function normalizarBooleano(valor, campo = 'Campo') {
    if (valor === true || valor === 1) return true
    if (valor === false || valor === 0) return false

    const texto = String(valor ?? '').trim().toLowerCase()
    if (['1', 'true', 'sim', 'yes', 'on'].includes(texto)) return true
    if (['0', 'false', 'não', 'nao', 'no', 'off'].includes(texto)) return false

    throw { status: 400, mensagem: `${campo} deve ser true ou false` }
}

function opcionalTexto(valor) {
    if (valor === undefined) return undefined
    if (valor === null) return null
    const texto = String(valor).trim()
    return texto === '' ? null : texto
}

module.exports = {
    validarId,
    validarData,
    normalizarBooleano,
    opcionalTexto
}
