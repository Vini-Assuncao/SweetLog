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

function validarEmail(valor) {
    if (typeof valor !== 'string' || !valor.trim()) {
        throw { status: 400, mensagem: 'E-mail é obrigatório' }
    }
    const email = valor.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        throw { status: 400, mensagem: 'E-mail inválido. Informe um endereço de e-mail válido' }
    }
    return email
}

module.exports = { validarCnpj, validarEmail }
