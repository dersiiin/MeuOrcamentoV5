import { DatabaseService } from './database';
import { supabase } from './supabase';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

const config: AzureOpenAIConfig = {
  endpoint: "https://reconheceai-chat-resource.cognitiveservices.azure.com/",
  apiKey: "9uMxhg6a9u1Qrk1ttVAAG51XnCSJ1yUim86DczJkMl9nzjpqazUyJQQJ99BFACHYHv6XJ3w3AAAAACOGeSL5",
  deploymentName: "gpt-4.1-mini",
  apiVersion: "2024-12-01-preview"
};

export class AzureOpenAIService {
  private static systemPrompt = `
Você é um assistente financeiro inteligente especializado em gestão de finanças pessoais.
Seu objetivo é ajudar usuários a entender e gerenciar suas finanças.
Responda de forma clara, objetiva e educativa, baseando-se nos dados fornecidos no contexto.
Mantenha um tom amigável e profissional.
Sempre que usar dados para responder, mencione isso (ex: "Consultando seus dados...", "De acordo com seus lançamentos...").
Se não houver dados no contexto para responder, informe ao usuário de forma clara.
Limite suas respostas a tópicos relacionados a finanças pessoais.
`;

  /**
   * Função privada e centralizada para fazer a chamada final à API da OpenAI.
   * @param userPrompt O prompt completo, já com contexto, a ser enviado.
   */
  private static async _callOpenAI(userPrompt: string): Promise<string> {
    try {
      const url = `${config.endpoint}openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800,
          temperature: 0.2,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error) {
      console.error('Erro ao chamar Azure OpenAI:', error);
      throw new Error('Erro ao processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Função principal do chat. Orquestra a busca de dados e a chamada à IA.
   * Analisa a mensagem do usuário, busca dados relevantes no banco se necessário,
   * e então chama a IA com o contexto para gerar uma resposta.
   * @param userMessage A mensagem original do usuário.
   */
  static async getChatResponse(userMessage: string): Promise<string> {
    const lowerCaseMessage = userMessage.toLowerCase();
    let contextPrompt = 'O usuário não pediu dados financeiros específicos.';
    let currency = 'BRL'; // Moeda Padrão

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('moeda')
          .eq('id', user.id)
          .single();
        if (profile?.moeda) {
          currency = profile.moeda;
        }
      }

      const expenseKeywords = ['gasto', 'gastei', 'gastos', 'despesa', 'despesas'];
      const balanceKeywords = ['saldo', 'saldos', 'conta', 'contas'];
      const summaryKeywords = ['resumo', 'visão geral', 'geral', 'total'];
      const goalKeywords = ['meta', 'metas', 'objetivo', 'objetivos'];
      
      if (expenseKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const data = await DatabaseService.getGastosPorCategoria(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          new Date().toISOString()
        );
        contextPrompt = `Dados de gastos do usuário para este mês (agrupados por categoria):\n${JSON.stringify(data, null, 2)}`;
      } else if (balanceKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const contas = await DatabaseService.getContas();
        contextPrompt = `Dados de saldo das contas do usuário:\n${JSON.stringify(contas.map(c => ({ nome: c.nome, saldo_atual: c.saldo_atual })), null, 2)}`;
      } else if (summaryKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const resumo = await DatabaseService.getResumoFinanceiro(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            new Date().toISOString()
        );
        contextPrompt = `Dados de resumo financeiro do usuário para o mês atual:\n${JSON.stringify(resumo, null, 2)}`;
      } else if (goalKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        const metas = await DatabaseService.getMetas();
        contextPrompt = `Dados sobre as metas financeiras do usuário:\n${JSON.stringify(metas.map(m => ({ nome: m.nome, valor_meta: m.valor_meta, valor_atual: m.valor_atual, status: m.status })), null, 2)}`;
      }
    } catch (error) {
      console.error('Erro ao buscar contexto para IA:', error);
      contextPrompt = 'Ocorreu um erro ao tentar buscar os dados financeiros para responder a esta pergunta. Informe o usuário sobre o erro.';
    }
    
    // Modificado: O prompt final agora contém instruções de estilo mais explícitas.
    const finalPrompt = `
      **Instrução de Formatação e Estilo de Resposta:**
      ---
      A moeda do usuário é ${currency}.
      1. **Formatação de Moeda:** Sempre que apresentar um valor monetário (receitas, despesas, saldos), formate-o usando "R$" (se a moeda for BRL) ANTES do número. Exemplo: "um total de R$ 50,00 em receitas".
      2. **Clareza:** Evite frases ambíguas como "10 receitas". Em vez disso, diga "um total de R$ 10,00 de receitas" ou "suas receitas totalizaram R$ 10,00".
      3. **Jamais use o termo genérico "unidades monetárias".**
      ---

      **Contexto Financeiro Fornecido:**
      ---
      ${contextPrompt}
      ---
      
      Com base no contexto e nas instruções de formatação e estilo acima, responda à seguinte pergunta do usuário de forma clara, amigável e objetiva:
      
      **Pergunta do Usuário:** "${userMessage}"
    `;
    
    return this._callOpenAI(finalPrompt);
  }

  // As funções abaixo agora usam o helper _callOpenAI para consistência.
  static async categorizarDespesa(descricao: string, categorias: string[]): Promise<string> {
    const prompt = `
Baseado na descrição "${descricao}", qual das seguintes categorias melhor se adequa?
Categorias disponíveis: ${categorias.join(', ')}
Responda apenas com o nome da categoria mais apropriada.
`;
    return (await this._callOpenAI(prompt)).trim();
  }

  static async analisarGastos(dadosFinanceiros: any): Promise<string> {
    const prompt = `
Analise os seguintes dados financeiros e forneça insights:
- Receitas totais: R$ ${dadosFinanceiros.receitas}
- Despesas totais: R$ ${dadosFinanceiros.despesas}
- Saldo: R$ ${dadosFinanceiros.saldo}
- Principais categorias de gastos: ${dadosFinanceiros.categorias?.join(', ') || 'Não informado'}
Forneça uma análise concisa com sugestões de melhoria.
`;
    return this._callOpenAI(prompt);
  }

  static async preverGastos(historicoGastos: number[]): Promise<string> {
    const media = historicoGastos.reduce((a, b) => a + b, 0) / historicoGastos.length;
    const prompt = `
Baseado no histórico de gastos mensais: ${historicoGastos.map(g => `R$ ${g}`).join(', ')}
Média mensal: R$ ${media.toFixed(2)}
Forneça uma previsão para o próximo mês e sugestões para otimização dos gastos.
`;
    return this._callOpenAI(prompt);
  }
}