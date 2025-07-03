import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Eye, X } from 'lucide-react';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { AnomaliaDetectada, Lancamento, Categoria } from '../../types';

export function AnomaliaDetector() {
  const [anomalias, setAnomalias] = useState<AnomaliaDetectada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    detectarAnomalias();
  }, []);

  const detectarAnomalias = async () => {
    try {
      setLoading(true);
      
      // Buscar dados dos últimos 3 meses para análise
      const hoje = new Date();
      const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
      const dataFim = hoje.toISOString().split('T')[0];
      
      const [lancamentos, categorias] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias()
      ]);

      const anomaliasDetectadas = analisarAnomalias(lancamentos, categorias);
      setAnomalias(anomaliasDetectadas);
      
    } catch (error) {
      console.error('Erro ao detectar anomalias:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const analisarAnomalias = (lancamentos: Lancamento[], categorias: Categoria[]): AnomaliaDetectada[] => {
    const anomalias: AnomaliaDetectada[] = [];
    const despesas = lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    
    // Calcular médias por categoria
    const estatisticasPorCategoria = despesas.reduce((acc, lancamento) => {
      const categoria = categorias.find(c => c.id === lancamento.categoria_id);
      const nomeCategoria = categoria?.nome || 'Sem categoria';
      
      if (!acc[nomeCategoria]) {
        acc[nomeCategoria] = {
          valores: [],
          total: 0,
          count: 0
        };
      }
      
      acc[nomeCategoria].valores.push(lancamento.valor);
      acc[nomeCategoria].total += lancamento.valor;
      acc[nomeCategoria].count += 1;
      
      return acc;
    }, {} as Record<string, { valores: number[]; total: number; count: number }>);

    // Detectar gastos muito acima da média
    Object.entries(estatisticasPorCategoria).forEach(([categoria, stats]) => {
      if (stats.count < 3) return; // Precisa de pelo menos 3 transações para análise
      
      const media = stats.total / stats.count;
      const desvio = Math.sqrt(
        stats.valores.reduce((sum, valor) => sum + Math.pow(valor - media, 2), 0) / stats.count
      );
      
      // Detectar valores 2 desvios padrão acima da média
      stats.valores.forEach((valor, index) => {
        if (valor > media + (2 * desvio) && valor > media * 1.5) {
          const lancamento = despesas.find(l => {
            const cat = categorias.find(c => c.id === l.categoria_id);
            return (cat?.nome || 'Sem categoria') === categoria && l.valor === valor;
          });
          
          if (lancamento) {
            anomalias.push({
              id: `gasto-alto-${lancamento.id}`,
              tipo: 'GASTO_ALTO',
              descricao: `Gasto de ${formatCurrency(valor)} em ${categoria} está ${((valor / media - 1) * 100).toFixed(0)}% acima da média`,
              valor: valor,
              data: lancamento.data,
              categoria: categoria,
              severidade: valor > media * 2 ? 'ALTA' : 'MEDIA'
            });
          }
        }
      });
    });

    // Detectar frequência anormal de gastos
    const gastosUltimos7Dias = despesas.filter(l => {
      const dataLancamento = new Date(l.data);
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      return dataLancamento >= seteDiasAtras;
    });

    const gastosUltimos30Dias = despesas.filter(l => {
      const dataLancamento = new Date(l.data);
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      return dataLancamento >= trintaDiasAtras;
    });

    const frequenciaMedia = gastosUltimos30Dias.length / 30;
    const frequenciaRecente = gastosUltimos7Dias.length / 7;

    if (frequenciaRecente > frequenciaMedia * 2 && gastosUltimos7Dias.length > 5) {
      anomalias.push({
        id: 'frequencia-alta',
        tipo: 'FREQUENCIA_ANORMAL',
        descricao: `Frequência de gastos muito alta: ${gastosUltimos7Dias.length} transações nos últimos 7 dias`,
        valor: gastosUltimos7Dias.reduce((sum, l) => sum + l.valor, 0),
        data: new Date().toISOString().split('T')[0],
        categoria: 'Geral',
        severidade: frequenciaRecente > frequenciaMedia * 3 ? 'ALTA' : 'MEDIA'
      });
    }

    // Detectar categorias incomuns (gastos em categorias raramente usadas)
    const categoriasFrequencia = despesas.reduce((acc, lancamento) => {
      const categoria = categorias.find(c => c.id === lancamento.categoria_id);
      const nomeCategoria = categoria?.nome || 'Sem categoria';
      acc[nomeCategoria] = (acc[nomeCategoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoriasRaras = Object.entries(categoriasFrequencia)
      .filter(([_, freq]) => freq === 1)
      .map(([categoria]) => categoria);

    categoriasRaras.forEach(categoria => {
      const lancamento = despesas.find(l => {
        const cat = categorias.find(c => c.id === l.categoria_id);
        return (cat?.nome || 'Sem categoria') === categoria;
      });
      
      if (lancamento && lancamento.valor > 100) { // Apenas para valores significativos
        anomalias.push({
          id: `categoria-incomum-${lancamento.id}`,
          tipo: 'CATEGORIA_INCOMUM',
          descricao: `Gasto incomum em ${categoria}: ${formatCurrency(lancamento.valor)}`,
          valor: lancamento.valor,
          data: lancamento.data,
          categoria: categoria,
          severidade: 'BAIXA'
        });
      }
    });

    return anomalias.sort((a, b) => {
      const severidadeOrder = { 'ALTA': 3, 'MEDIA': 2, 'BAIXA': 1 };
      return severidadeOrder[b.severidade] - severidadeOrder[a.severidade];
    });
  };

  const getSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case 'ALTA':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIA':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'BAIXA':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeveridadeIcon = (severidade: string) => {
    switch (severidade) {
      case 'ALTA':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'MEDIA':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'BAIXA':
        return <Eye className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Detecção de Anomalias</h2>
        </div>
        <button
          onClick={detectarAnomalias}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          Atualizar Análise
        </button>
      </div>

      {anomalias.length > 0 ? (
        <div className="space-y-4">
          {anomalias.map((anomalia) => (
            <div
              key={anomalia.id}
              className={`rounded-lg border p-4 ${getSeveridadeColor(anomalia.severidade)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getSeveridadeIcon(anomalia.severidade)}
                  <div className="flex-1">
                    <h4 className="font-medium">{anomalia.descricao}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span>Categoria: {anomalia.categoria}</span>
                      <span>Data: {formatDate(anomalia.data)}</span>
                      <span>Valor: {formatCurrency(anomalia.valor)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    anomalia.severidade === 'ALTA' ? 'bg-red-100 text-red-800' :
                    anomalia.severidade === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {anomalia.severidade}
                  </span>
                  
                  <button
                    onClick={() => setShowDetails(showDetails === anomalia.id ? null : anomalia.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showDetails === anomalia.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm space-y-2">
                    <div><strong>Tipo:</strong> {anomalia.tipo}</div>
                    <div><strong>Severidade:</strong> {anomalia.severidade}</div>
                    <div><strong>Recomendação:</strong> 
                      {anomalia.tipo === 'GASTO_ALTO' && ' Verifique se este gasto era necessário e planejado.'}
                      {anomalia.tipo === 'FREQUENCIA_ANORMAL' && ' Considere revisar seus hábitos de consumo recentes.'}
                      {anomalia.tipo === 'CATEGORIA_INCOMUM' && ' Confirme se esta categoria está correta para este gasto.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma anomalia detectada</p>
          <p className="text-sm mt-1">Seus gastos estão dentro dos padrões normais!</p>
        </div>
      )}
    </div>
  );
}