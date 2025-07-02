import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface FinancialInsightsProps {
  data: {
    receitas: number;
    despesas: number;
    saldo: number;
    metasAtingidas: number;
    totalMetas: number;
    economiaRecomendada: number;
  };
}

export function FinancialInsights({ data }: FinancialInsightsProps) {
  const { receitas, despesas, saldo, metasAtingidas, totalMetas, economiaRecomendada } = data;
  
  const taxaEconomia = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
  const progressoMetas = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;
  
  const insights = [];

  // Insight sobre saldo
  if (saldo > 0) {
    insights.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Saldo Positivo',
      message: `Parabéns! Você tem um saldo positivo de ${formatCurrency(saldo)} neste período.`,
      action: 'Continue assim e considere investir o excedente.'
    });
  } else if (saldo < 0) {
    insights.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Atenção ao Saldo',
      message: `Você está gastando ${formatCurrency(Math.abs(saldo))} a mais do que ganha.`,
      action: 'Revise seus gastos e identifique onde pode economizar.'
    });
  }

  // Insight sobre taxa de economia
  if (taxaEconomia >= 20) {
    insights.push({
      type: 'success',
      icon: TrendingUp,
      title: 'Excelente Taxa de Economia',
      message: `Você está economizando ${taxaEconomia.toFixed(1)}% da sua renda.`,
      action: 'Considere aumentar seus investimentos ou criar uma reserva de emergência.'
    });
  } else if (taxaEconomia >= 10) {
    insights.push({
      type: 'info',
      icon: Target,
      title: 'Boa Taxa de Economia',
      message: `Você está economizando ${taxaEconomia.toFixed(1)}% da sua renda.`,
      action: 'Tente aumentar para 20% se possível.'
    });
  } else if (taxaEconomia > 0) {
    insights.push({
      type: 'warning',
      icon: TrendingDown,
      title: 'Taxa de Economia Baixa',
      message: `Você está economizando apenas ${taxaEconomia.toFixed(1)}% da sua renda.`,
      action: 'Tente economizar pelo menos 10% da sua renda mensal.'
    });
  }

  // Insight sobre metas
  if (totalMetas > 0) {
    if (progressoMetas >= 80) {
      insights.push({
        type: 'success',
        icon: Target,
        title: 'Metas em Dia',
        message: `${metasAtingidas} de ${totalMetas} metas atingidas (${progressoMetas.toFixed(1)}%).`,
        action: 'Continue focado para atingir todas as suas metas!'
      });
    } else if (progressoMetas >= 50) {
      insights.push({
        type: 'info',
        icon: Target,
        title: 'Progresso nas Metas',
        message: `${metasAtingidas} de ${totalMetas} metas atingidas (${progressoMetas.toFixed(1)}%).`,
        action: 'Você está no caminho certo, mantenha o foco!'
      });
    } else {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Metas Precisam de Atenção',
        message: `Apenas ${metasAtingidas} de ${totalMetas} metas atingidas (${progressoMetas.toFixed(1)}%).`,
        action: 'Revise suas metas e ajuste seu planejamento financeiro.'
      });
    }
  }

  // Insight sobre economia recomendada
  if (economiaRecomendada > 0) {
    insights.push({
      type: 'info',
      icon: DollarSign,
      title: 'Oportunidade de Economia',
      message: `Você pode economizar até ${formatCurrency(economiaRecomendada)} otimizando seus gastos.`,
      action: 'Analise suas categorias de maior gasto para identificar oportunidades.'
    });
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Insights Financeiros</h2>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div key={index} className={`rounded-lg border p-4 ${getInsightColor(insight.type)}`}>
              <div className="flex items-start space-x-3">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm mt-1">{insight.message}</p>
                  <p className="text-sm mt-2 font-medium">{insight.action}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}