import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Target,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Bell,
  Clock,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { DatabaseService } from '../lib/database';
import { AuthService } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/utils';

interface DashboardData {
  lancamentos: any[];
  categorias: any[];
  contas: any[];
  metas: any[];
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

function StatCard({ title, value, icon: Icon, trend, color, subtitle, loading = false, alert = false }: any) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 ${alert ? 'ring-2 ring-red-200 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {alert && (
            <div className="flex items-center space-x-1 mt-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600">Atenção necessária</span>
            </div>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          alert ? 'bg-red-100' :
          trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <Icon className={`w-7 h-7 ${
            alert ? 'text-red-600' :
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, color, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 text-left group w-full relative"
    >
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
          {badge}
        </div>
      )}
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

function AlertCard({ title, message, type, action }: any) {
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icons = {
    warning: AlertCircle,
    danger: AlertCircle,
    info: Bell
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-lg border p-4 ${colors[type]}`}>
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm mt-1">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium underline mt-2 hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData>({
    lancamentos: [],
    categorias: [],
    contas: [],
    metas: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setRefreshing(true);
      
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

      const [lancamentos, categorias, contas, metas] = await Promise.all([
        DatabaseService.getLancamentos({ dataInicio, dataFim }),
        DatabaseService.getCategorias(),
        DatabaseService.getContas(),
        DatabaseService.getMetas()
      ]);

      setData({ lancamentos, categorias, contas, metas });
      
      // Gerar alertas
      generateAlerts({ lancamentos, categorias, contas, metas });
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateAlerts = (data: DashboardData) => {
    const newAlerts: any[] = [];
    
    // Alertas de cartão de crédito próximo do limite
    data.contas.forEach(conta => {
      if (conta.tipo === 'CARTAO_CREDITO' && conta.limite_credito) {
        const utilizacao = (conta.saldo_atual / conta.limite_credito) * 100;
        if (utilizacao > 80) {
          newAlerts.push({
            type: 'warning',
            title: 'Limite do cartão próximo',
            message: `${conta.nome} está com ${utilizacao.toFixed(1)}% do limite utilizado`,
            action: {
              label: 'Ver conta',
              onClick: () => onNavigate?.('contas')
            }
          });
        }
      }
    });

    // Alertas de lançamentos pendentes
    const pendentes = data.lancamentos.filter(l => l.status === 'PENDENTE');
    if (pendentes.length > 0) {
      newAlerts.push({
        type: 'info',
        title: `${pendentes.length} lançamento${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''}`,
        message: 'Você tem transações aguardando confirmação',
        action: {
          label: 'Revisar',
          onClick: () => onNavigate?.('lancamentos')
        }
      });
    }

    // Alertas de metas próximas do vencimento
    const hoje = new Date();
    const metasVencendo = data.metas.filter(meta => {
      const dataFim = new Date(meta.data_fim);
      const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diasRestantes <= 7 && diasRestantes > 0 && meta.status === 'ATIVA';
    });

    if (metasVencendo.length > 0) {
      newAlerts.push({
        type: 'warning',
        title: 'Metas próximas do vencimento',
        message: `${metasVencendo.length} meta${metasVencendo.length > 1 ? 's' : ''} vence${metasVencendo.length > 1 ? 'm' : ''} em breve`,
        action: {
          label: 'Ver metas',
          onClick: () => onNavigate?.('metas')
        }
      });
    }

    setAlerts(newAlerts);
  };

  const handleQuickAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

  const handleManualRefresh = () => {
    loadDashboardData();
  };

  const resumoFinanceiro = useMemo(() => {
    const receitas = data.lancamentos
      .filter(l => l.tipo === 'RECEITA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const despesas = data.lancamentos
      .filter(l => l.tipo === 'DESPESA' && l.status === 'CONFIRMADO')
      .reduce((sum, l) => sum + l.valor, 0);
      
    const saldo = receitas - despesas;
    
    return { receitas, despesas, saldo };
  }, [data.lancamentos]);

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

  const ultimosLancamentos = useMemo(() => {
    return data.lancamentos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 5);
  }, [data.lancamentos]);

  const metasProximas = useMemo(() => {
    const hoje = new Date();
    return data.metas
      .filter(m => m.status === 'ATIVA' && new Date(m.data_fim) > hoje)
      .sort((a, b) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())
      .slice(0, 3);
  }, [data.metas]);

  const saldoTotalContas = useMemo(() => {
    return data.contas.reduce((sum, conta) => sum + conta.saldo_atual, 0);
  }, [data.contas]);

  const pendentesCount = useMemo(() => {
    return data.lancamentos.filter(l => l.status === 'PENDENTE').length;
  }, [data.lancamentos]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'quarter': return 'Últimos 3 meses';
      case 'year': return 'Este ano';
      default: return 'Este mês';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral das suas finanças pessoais</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          
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
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Alertas Importantes</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, index) => (
              <AlertCard key={index} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Resumo Financeiro</h2>
          <span className="text-sm text-gray-500">{getTimeRangeLabel()}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Saldo do Período"
            value={formatCurrency(resumoFinanceiro.saldo)}
            icon={DollarSign}
            color={resumoFinanceiro.saldo >= 0 ? 'text-green-600' : 'text-red-600'}
            trend={resumoFinanceiro.saldo >= 0 ? 'up' : 'down'}
            subtitle={`${data.lancamentos.length} transações`}
            loading={loading}
            alert={resumoFinanceiro.saldo < 0}
          />
          <StatCard
            title="Receitas"
            value={formatCurrency(resumoFinanceiro.receitas)}
            icon={TrendingUp}
            color="text-green-600"
            trend="up"
            subtitle="Entradas do período"
            loading={loading}
          />
          <StatCard
            title="Despesas"
            value={formatCurrency(resumoFinanceiro.despesas)}
            icon={TrendingDown}
            color="text-red-600"
            trend="down"
            subtitle="Saídas do período"
            loading={loading}
          />
          <StatCard
            title="Saldo Total"
            value={formatCurrency(saldoTotalContas)}
            icon={CreditCard}
            color={saldoTotalContas >= 0 ? 'text-blue-600' : 'text-red-600'}
            subtitle={`${data.contas.length} contas`}
            loading={loading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Novo Lançamento"
            description="Adicionar receita ou despesa"
            icon={DollarSign}
            color="bg-blue-600"
            onClick={() => handleQuickAction('lancamentos')}
          />
          <QuickActionCard
            title="Nova Meta"
            description="Definir objetivo financeiro"
            icon={Target}
            color="bg-green-600"
            onClick={() => handleQuickAction('metas')}
          />
          <QuickActionCard
            title="Nova Conta"
            description="Adicionar conta bancária"
            icon={CreditCard}
            color="bg-purple-600"
            onClick={() => handleQuickAction('contas')}
          />
          <QuickActionCard
            title="Revisar Pendentes"
            description="Confirmar transações"
            icon={Clock}
            color="bg-orange-600"
            onClick={() => handleQuickAction('lancamentos')}
            badge={pendentesCount > 0 ? pendentesCount : null}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Gráfico de Despesas por Categoria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Despesas por Categoria</h2>
            </div>
            <span className="text-sm text-gray-500">{getTimeRangeLabel()}</span>
          </div>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dadosGraficoPizza.length > 0 ? (
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
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
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

        {/* Últimos Lançamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Últimos Lançamentos</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          ) : ultimosLancamentos.length > 0 ? (
            <div className="space-y-4">
              {ultimosLancamentos.map((lancamento) => {
                const categoria = data.categorias.find(c => c.id === lancamento.categoria_id);
                return (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: categoria?.cor + '20' }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoria?.cor }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">{lancamento.descricao}</p>
                          {lancamento.status === 'PENDENTE' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pendente
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(lancamento.data)} • {categoria?.nome}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold flex-shrink-0 ${
                      lancamento.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lancamento.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(lancamento.valor)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">Comece adicionando suas primeiras transações!</p>
            </div>
          )}
        </div>
      </div>

      {/* Metas e Contas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Metas Próximas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Target className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Metas em Andamento</h2>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              ))}
            </div>
          ) : metasProximas.length > 0 ? (
            <div className="space-y-4">
              {metasProximas.map((meta) => {
                const progress = meta.valor_meta > 0 ? (meta.valor_atual / meta.valor_meta) * 100 : 0;
                const isCompleted = progress >= 100;
                
                return (
                  <div key={meta.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{meta.nome}</h3>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-sm text-gray-500">{progress.toFixed(1)}%</span>
                      )}
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{formatCurrency(meta.valor_atual)}</span>
                      <span>{formatCurrency(meta.valor_meta)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma meta ativa</p>
              <p className="text-sm mt-1">Defina seus objetivos financeiros!</p>
            </div>
          )}
        </div>

        {/* Resumo das Contas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Suas Contas</h2>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          ) : data.contas.length > 0 ? (
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
                    onClick={() => handleQuickAction('contas')}
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
              <p className="text-sm mt-1">Adicione suas contas bancárias!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}