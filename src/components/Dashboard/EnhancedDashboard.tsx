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
  Percent
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard Inteligente</h1>
          <p className="text-gray-600 mt-2">Visão completa e insights das suas finanças</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="month">Este mês</option>
          <option value="quarter">Últimos 3 meses</option>
          <option value="year">Este ano</option>
        </select>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map((kpi, index) => {
          const IconComponent = getIconComponent(kpi.icon || 'DollarSign');
          
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{kpi.label}</p>
                  <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  {kpi.change !== undefined && (
                    <div className="flex items-center space-x-1 mt-2">
                      {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {kpi.trend === 'stable' && <div className="w-4 h-4" />}
                      <span className={`text-xs ${
                        kpi.trend === 'up' ? 'text-green-600' : 
                        kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {kpi.trend === 'up' ? 'Positivo' : 
                         kpi.trend === 'down' ? 'Atenção' : 'Estável'}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  kpi.trend === 'up' ? 'bg-green-50' : 
                  kpi.trend === 'down' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <IconComponent className={`w-7 h-7 ${
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Insights Inteligentes</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resumoFinanceiro.taxaPoupanca >= 20 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Excelente Poupança!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Você está poupando {resumoFinanceiro.taxaPoupanca.toFixed(1)}% da sua renda. Continue assim!
              </p>
            </div>
          )}
          
          {resumoFinanceiro.taxaPoupanca < 10 && resumoFinanceiro.receitas > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Oportunidade de Melhoria</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Sua taxa de poupança está em {resumoFinanceiro.taxaPoupanca.toFixed(1)}%. Tente economizar mais!
              </p>
            </div>
          )}
          
          {resumoFinanceiro.gastoDiarioMedio > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Gasto Diário</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Você gasta em média {formatCurrency(resumoFinanceiro.gastoDiarioMedio)} por dia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
          
          {dadosGraficoPizza.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoPizza}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
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
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                {dadosGraficoPizza.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="text-gray-700 truncate">{item.nome}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-gray-900">{formatCurrency(item.valor)}</div>
                      <div className="text-gray-500">{item.porcentagem.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma despesa encontrada neste período</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumo das Contas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo das Contas</h3>
          
          {data.contas.length > 0 ? (
            <div className="space-y-3">
              {data.contas.slice(0, 5).map((conta) => {
                const isCartaoCredito = conta.tipo === 'CARTAO_CREDITO';
                const utilizacao = isCartaoCredito && conta.limite_credito 
                  ? (Math.abs(conta.saldo_atual) / conta.limite_credito) * 100 
                  : 0;
                const alertaLimite = utilizacao > 80;
                
                return (
                  <div key={conta.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors ${alertaLimite ? 'bg-red-50 border border-red-200' : ''}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alertaLimite ? 'bg-red-100' : 'bg-blue-50'}`}>
                        <CreditCard className={`w-5 h-5 ${alertaLimite ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{conta.nome}</p>
                          {alertaLimite && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {conta.tipo}
                          {isCartaoCredito && conta.limite_credito && (
                            <span className="ml-2">• {utilizacao.toFixed(1)}% usado</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(conta.saldo_atual)}
                      </p>
                      {isCartaoCredito && conta.limite_credito && (
                        <p className="text-xs text-gray-500">
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
            <div className="text-center text-gray-500 py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma conta cadastrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}