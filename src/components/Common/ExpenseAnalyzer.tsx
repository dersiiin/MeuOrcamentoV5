import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface ExpenseAnalyzerProps {
  lancamentos: any[];
  categorias: any[];
  periodo: 'month' | 'quarter' | 'year';
}

export function ExpenseAnalyzer({ lancamentos, categorias, periodo }: ExpenseAnalyzerProps) {
  const analise = useMemo(() => {
    const despesas = lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
    
    if (totalDespesas === 0) return null;

    // Agrupar por categoria
    const porCategoria = despesas.reduce((acc, lancamento) => {
      const categoria = categorias.find(c => c.id === lancamento.categoria_id);
      const nomeCategoria = categoria?.nome || 'Sem categoria';
      
      if (!acc[nomeCategoria]) {
        acc[nomeCategoria] = {
          nome: nomeCategoria,
          valor: 0,
          cor: categoria?.cor || '#6B7280',
          transacoes: 0
        };
      }
      
      acc[nomeCategoria].valor += lancamento.valor;
      acc[nomeCategoria].transacoes += 1;
      return acc;
    }, {} as Record<string, any>);

    const categoriasSorted = Object.values(porCategoria)
      .sort((a: any, b: any) => b.valor - a.valor);

    // Análises
    const maiorCategoria = categoriasSorted[0];
    const menorCategoria = categoriasSorted[categoriasSorted.length - 1];
    const mediaTransacao = totalDespesas / despesas.length;
    
    // Categorias que representam mais de 30% do total
    const categoriasAltas = categoriasSorted.filter((cat: any) => 
      (cat.valor / totalDespesas) * 100 > 30
    );

    // Transações acima da média
    const transacoesAltas = despesas.filter(l => l.valor > mediaTransacao * 2);

    return {
      totalDespesas,
      categoriasSorted,
      maiorCategoria,
      menorCategoria,
      mediaTransacao,
      categoriasAltas,
      transacoesAltas,
      totalTransacoes: despesas.length
    };
  }, [lancamentos, categorias]);

  if (!analise) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <PieChart className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Análise de Gastos</h2>
        </div>
        <div className="text-center text-gray-500 py-8">
          <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma despesa encontrada para análise</p>
        </div>
      </div>
    );
  }

  const getPeriodoLabel = () => {
    switch (periodo) {
      case 'quarter': return 'trimestre';
      case 'year': return 'ano';
      default: return 'mês';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <PieChart className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900">Análise de Gastos</h2>
      </div>

      <div className="space-y-6">
        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(analise.totalDespesas)}</div>
            <div className="text-sm text-gray-600">Total gasto no {getPeriodoLabel()}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analise.totalTransacoes}</div>
            <div className="text-sm text-gray-600">Transações realizadas</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(analise.mediaTransacao)}</div>
            <div className="text-sm text-gray-600">Valor médio por transação</div>
          </div>
        </div>

        {/* Top 3 Categorias */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Principais Categorias</h3>
          <div className="space-y-3">
            {analise.categoriasSorted.slice(0, 3).map((categoria: any, index: number) => {
              const porcentagem = (categoria.valor / analise.totalDespesas) * 100;
              return (
                <div key={categoria.nome} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: categoria.cor }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{categoria.nome}</p>
                      <p className="text-sm text-gray-600">{categoria.transacoes} transações</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(categoria.valor)}</p>
                    <p className="text-sm text-gray-600">{porcentagem.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas e Insights */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Insights</h3>
          
          {/* Categoria dominante */}
          {analise.maiorCategoria && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Maior gasto: {analise.maiorCategoria.nome}
                </p>
                <p className="text-sm text-blue-700">
                  Representa {((analise.maiorCategoria.valor / analise.totalDespesas) * 100).toFixed(1)}% 
                  dos seus gastos ({formatCurrency(analise.maiorCategoria.valor)})
                </p>
              </div>
            </div>
          )}

          {/* Categorias com alto impacto */}
          {analise.categoriasAltas.length > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Categorias de alto impacto
                </p>
                <p className="text-sm text-yellow-700">
                  {analise.categoriasAltas.length} categoria{analise.categoriasAltas.length > 1 ? 's' : ''} 
                  representa{analise.categoriasAltas.length === 1 ? '' : 'm'} mais de 30% dos gastos
                </p>
              </div>
            </div>
          )}

          {/* Transações altas */}
          {analise.transacoesAltas.length > 0 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Transações acima da média
                </p>
                <p className="text-sm text-red-700">
                  {analise.transacoesAltas.length} transação{analise.transacoesAltas.length > 1 ? 'ões' : ''} 
                  com valor muito acima da média. Revise se são necessárias.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}