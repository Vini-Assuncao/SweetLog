function validarCnpj(valor) {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw { status: 400, mensagem: 'CNPJ do fabricante é obrigatório' }
    }
    const numeros = String(valor).replace(/\D/g, '')
    if (!/^\d{14}$/.test(numeros) || /^(\d)\1{13}$/.test(numeros)) {
        throw { status: 400, mensagem: 'CNPJ do fabricante deve conter 14 dígitos válidos' }
    }

    const calcularDigito = (base, pesos) => {
        const soma = [...base].reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0)
        const resto = soma % 11
        return resto < 2 ? 0 : 11 - resto
    }
    const primeiro = calcularDigito(numeros.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    const segundo = calcularDigito(numeros.slice(0, 12) + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    if (numeros.slice(-2) !== `${primeiro}${segundo}`) {
        throw { status: 400, mensagem: 'CNPJ do fabricante inválido: dígitos verificadores incorretos' }
    }
    return numeros
}

function normalizarTelefone(valor) {
    if (valor === undefined || valor === null || valor === '') return null
    const numeros = String(valor).replace(/\D/g, '')
    if (!/^[1-9]{2}\d{8,9}$/.test(numeros) || /^([0-9])\1+$/.test(numeros)) {
        throw { status: 400, mensagem: 'Telefone inválido. Informe DDD e número com 10 ou 11 dígitos' }
    }
    return numeros
}

module.exports = { validarCnpj, normalizarTelefone }
