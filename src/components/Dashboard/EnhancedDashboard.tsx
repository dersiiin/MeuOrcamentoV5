import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  Target,
  CreditCard,
  AlertCircle,
  Calendar,
  Zap,
  Wallet,
  TrendingUp as Growth,
  Percent,
  Plus,
  ArrowLeftRight,
  BarChart3,
  Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { DatabaseService } from '../../lib/database';
import { AuthService } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CHART_COLORS } from '../../constants';
import type { DashboardData, FinancialSummary, KPI } from '../../types';

interface EnhancedDashboardProps {
  onNavigate?: (page: string) => void;
}

export function EnhancedDashboard({ onNavigate }: EnhancedDashboardProps) {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    lancamentos: [],
    categorias: [],
    contas: [],
    metas: [],
    orcamentos: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const hoje = new Date();
      let dataInicio: string;
      
      switch (timeRange) {
        case 'quarter':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().split('T')[0];
          break;
        case 'year':
          dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      }
      
      const dataFim = hoje.toISOString().split('T')[0];

      const [lancamentos, categorias, contas, metas, orcamentos] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getMetas(),
        DatabaseService.getOrcamentos(hoje.getFullYear(), hoje.getMonth() + 1)
      ]);

      setData({ 
        kpis: calculateKPIs({ lancamentos, categorias, contas, metas, orcamentos }),
        lancamentos, 
        categorias, 
        contas, 
        metas, 
        orcamentos 
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (dashboardData: Omit<DashboardData, 'kpis'>): KPI[] => {
    const { lancamentos, contas } = dashboardData;
    
    const receitas = lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    
    // Calcular gasto diário médio
    const diasNoMes = new Date().getDate();
    const gastoDiarioMedio = despesas / diasNoMes;
    
    // Calcular patrimônio líquido
    const patrimonioLiquido = contas.reduce((sum, conta) => {
      if (conta.tipo === 'CARTAO_CREDITO') {
        return sum - Math.abs(conta.saldo_atual); // Cartão é dívida
      }
      return sum + conta.saldo_atual;
    }, 0);

    return [
      {
        label: 'Saldo do Período',
        value: formatCurrency(saldo),
        change: saldo >= 0 ? 0 : -1,
        trend: saldo >= 0 ? 'up' : 'down',
        color: saldo >= 0 ? 'text-green-600' : 'text-red-600',
        icon: 'DollarSign'
      },
      {
        label: 'Taxa de Poupança',
        value: `${taxaPoupanca.toFixed(1)}%`,
        change: taxaPoupanca >= 20 ? 1 : taxaPoupanca >= 10 ? 0 : -1,
        trend: taxaPoupanca >= 20 ? 'up' : taxaPoupanca >= 10 ? 'stable' : 'down',
        color: taxaPoupanca >= 20 ? 'text-green-600' : taxaPoupanca >= 10 ? 'text-yellow-600' : 'text-red-600',
        icon: 'Percent'
      },
      {
        label: 'Gasto Diário Médio',
        value: formatCurrency(gastoDiarioMedio),
        change: 0,
        trend: 'stable',
        color: 'text-blue-600',
        icon: 'Calendar'
      },
      {
        label: 'Patrimônio Líquido',
        value: formatCurrency(patrimonioLiquido),
        change: patrimonioLiquido >= 0 ? 1 : -1,
        trend: patrimonioLiquido >= 0 ? 'up' : 'down',
        color: patrimonioLiquido >= 0 ? 'text-green-600' : 'text-red-600',
        icon: 'Wallet'
      }
    ];
  };

  const resumoFinanceiro = useMemo((): FinancialSummary => {
    const receitas = data.lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    
    const diasNoMes = new Date().getDate();
    const gastoDiarioMedio = despesas / diasNoMes;
    
    const patrimonioLiquido = data.contas.reduce((sum, conta) => {
      if (conta.tipo === 'CARTAO_CREDITO') {
        return sum - Math.abs(conta.saldo_atual);
      }
      return sum + conta.saldo_atual;
    }, 0);
    
    return {
      receitas,
      despesas,
      saldo,
      taxaPoupanca,
      gastoDiarioMedio,
      patrimonioLiquido
    };
  }, [data.lancamentos, data.contas]);

  const dadosGraficoPizza = useMemo(() => {
    const despesas = data.lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO');
    const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
    
    if (totalDespesas === 0) return [];
    
    const grupos = despesas.reduce((acc, lancamento) => {
      const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
      if (!categoria) return acc;
      
      if (!acc[categoria.id]) {
        acc[categoria.id] = {
          nome: categoria.nome,
          valor: 0,
          cor: categoria.cor,
        };
      }
      
      acc[categoria.id].valor += lancamento.valor;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; cor: string }>);
    
    return Object.values(grupos)
      .map(grupo => ({
        ...grupo,
        porcentagem: (grupo.valor / totalDespesas) * 100,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [data.lancamentos, data.categorias]);

  const getIconComponent = (iconName: string) => {
    const icons = {
      DollarSign,
      Percent,
      Calendar,
      Wallet,
      TrendingUp: Growth,
      TrendingDown,
      Target,
      CreditCard
    };
    return icons[iconName as keyof typeof icons] || DollarSign;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">Dashboard Inteligente</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Visão completa e insights das suas finanças</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="month">Este mês</option>
          <option value="quarter">Últimos 3 meses</option>
          <option value="year">Este ano</option>
        </select>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚡ Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <button
            onClick={() => onNavigate?.('lancamentos')}
            className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group"
          >
            <Plus className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center">Novo Lançamento</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('transferencias')}
            className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 group"
          >
            <ArrowLeftRight className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300 text-center">Transferência</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('relatorios')}
            className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all duration-200 group"
          >
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300 text-center">Relatórios</span>
          </button>
          
          <button
            onClick={() => onNavigate?.('metas')}
            className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl transition-all duration-200 group"
          >
            <Target className="w-6 h-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300 text-center">Metas</span>
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {data.kpis.map((kpi, index) => {
          const IconComponent = getIconComponent(kpi.icon || 'DollarSign');
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{kpi.label}</p>
                  <p className={`text-2xl lg:text-3xl font-bold ${kpi.color} dark:${kpi.color.replace('text-', 'text-')}`}>{kpi.value}</p>
                  {kpi.change !== undefined && (
                    <div className="flex items-center space-x-1 mt-2">
                      {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {kpi.trend === 'stable' && <div className="w-4 h-4" />}
                      <span className={`text-xs ${
                        kpi.trend === 'up' ? 'text-green-600' : 
                        kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {kpi.trend === 'up' ? 'Positivo' : 
                         kpi.trend === 'down' ? 'Atenção' : 'Estável'}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center ${
                  kpi.trend === 'up' ? 'bg-green-50 dark:bg-green-900/20' : 
                  kpi.trend === 'down' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <IconComponent className={`w-6 h-6 lg:w-7 lg:h-7 ${
                    kpi.trend === 'up' ? 'text-green-600' : 
                    kpi.trend === 'down' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights Financeiros */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Insights Inteligentes</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumoFinanceiro.taxaPoupanca >= 20 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-300">Excelente Poupança!</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Você está poupando {resumoFinanceiro.taxaPoupanca.toFixed(1)}% da sua renda. Continue assim!
              </p>
            </div>
          )}
          
          {resumoFinanceiro.taxaPoupanca < 10 && resumoFinanceiro.receitas > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-300">Oportunidade de Melhoria</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Sua taxa de poupança está em {resumoFinanceiro.taxaPoupanca.toFixed(1)}%. Tente economizar mais!
              </p>
            </div>
          )}
          
          {resumoFinanceiro.gastoDiarioMedio > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-300">Gasto Diário</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Você gasta em média {formatCurrency(resumoFinanceiro.gastoDiarioMedio)} por dia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Despesas por Categoria</h3>
          
          {dadosGraficoPizza.length > 0 ? (
            <div className="w-full">
              {/* Container do gráfico com altura responsiva */}
              <div className="h-48 sm:h-64 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGraficoPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="valor"
                    >
                      {dadosGraficoPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Categoria: ${label}`}
                      contentStyle={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Lista de categorias com scroll controlado */}
              <div className="w-full">
                <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-2 pr-2">
                  {dadosGraficoPizza.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.cor }}
                        />
                        <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                          {item.nome}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.valor)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.porcentagem.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Nenhuma despesa encontrada neste período</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumo das Contas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resumo das Contas</h3>
            <button
              onClick={() => onNavigate?.('contas')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>Ver todas</span>
            </button>
          </div>
          
          {data.contas.length > 0 ? (
            <div className="space-y-3">
              {data.contas.slice(0, 5).map((conta) => {
                const isCartaoCredito = conta.tipo === 'CARTAO_CREDITO';
                const utilizacao = isCartaoCredito && conta.limite_credito 
                  ? (Math.abs(conta.saldo_atual) / conta.limite_credito) * 100 
                  : 0;
                const alertaLimite = utilizacao > 80;
                
                return (
                  <div key={conta.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${alertaLimite ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : ''}`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center ${alertaLimite ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <CreditCard className={`w-4 h-4 lg:w-5 lg:h-5 ${alertaLimite ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{conta.nome}</p>
                          {alertaLimite && (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {conta.tipo}
                          {isCartaoCredito && conta.limite_credito && (
                            <span className="ml-2">• {utilizacao.toFixed(1)}% usado</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold ${
                        conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(conta.saldo_atual)}
                      </p>
                      {isCartaoCredito && conta.limite_credito && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Limite: {formatCurrency(conta.limite_credito)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {data.contas.length > 5 && (
                <div className="text-center pt-2">
                  <button 
                    onClick={() => onNavigate?.('contas')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Ver todas as contas ({data.contas.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>Nenhuma conta cadastrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}