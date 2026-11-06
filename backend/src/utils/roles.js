const CARGOS = Object.freeze({
    ADMINISTRADOR: 'Administrador',
    RH: 'RH',
    ADMINISTRATIVO: 'Administrativo',
    LOGISTICA: 'Logística',
    COMPRAS: 'Compras',
    ALMOXARIFADO: 'Almoxarifado'
})

const TODOS_OS_CARGOS = Object.freeze(Object.values(CARGOS))

module.exports = { CARGOS, TODOS_OS_CARGOS }
