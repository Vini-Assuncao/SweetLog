const pool = require('../config/database')
const AlertaRepository = require('./AlertaRepository')

class DashboardRepository {
    async selectResumo() {
        const [rows] = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM tbl_produtos) AS total_produtos,
                (SELECT COUNT(*) FROM tbl_estoques) AS total_lotes,
                (SELECT COALESCE(SUM(quantidade), 0) FROM tbl_estoques
                    WHERE quantidade > 0 AND data_validade >= CURDATE()) AS quantidade_disponivel,
                (SELECT COUNT(*) FROM tbl_estoques
                    WHERE quantidade > 0 AND data_validade >= CURDATE()) AS lotes_ativos,
                (SELECT COUNT(*) FROM tbl_estoques
                    WHERE quantidade > 0 AND data_validade < CURDATE()) AS lotes_vencidos,
                (SELECT COUNT(*) FROM tbl_estoques
                    WHERE quantidade > 0 AND DATEDIFF(data_validade, CURDATE()) BETWEEN 0 AND 7) AS lotes_vencendo_em_7_dias,
                (SELECT COUNT(*) FROM tbl_vendas WHERE data_pedido = CURDATE()) AS vendas_hoje,
                (SELECT COALESCE(SUM(vi.quantidade_venda_item * vi.preco_unitario), 0)
                    FROM tbl_vendas v
                    INNER JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
                    WHERE v.data_pedido = CURDATE()) AS faturamento_hoje
        `)
        const [estoquesBaixos] = await pool.query(`
            SELECT p.id_produto, p.nome,
                   COALESCE(SUM(CASE WHEN e.data_validade >= CURDATE() THEN e.quantidade ELSE 0 END), 0) AS quantidade_disponivel
            FROM tbl_produtos p
            INNER JOIN tbl_estoques e ON e.id_produto = p.id_produto
            GROUP BY p.id_produto
            HAVING quantidade_disponivel <= 20
            ORDER BY quantidade_disponivel ASC, p.nome ASC
            LIMIT 5
        `)
        const alertasRecentes = await AlertaRepository.selectAll({ ativo: true, limit: 5 })

        const resumo = rows[0]
        for (const campo of Object.keys(resumo)) {
            if (campo === 'faturamento_hoje') resumo[campo] = Number(resumo[campo] || 0)
            else resumo[campo] = Number(resumo[campo] || 0)
        }
        resumo.faturamento_hoje = Number(resumo.faturamento_hoje.toFixed(2))

        const produtosComEstoqueBaixo = estoquesBaixos.map(produto => ({
            ...produto,
            quantidade_disponivel: Number(produto.quantidade_disponivel || 0)
        }))

        return {
            resumo,
            estoques_baixos: produtosComEstoqueBaixo,
            alertas_recentes: alertasRecentes
        }
    }
}

module.exports = new DashboardRepository()
