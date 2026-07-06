import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, Package, Wallet, Users, 
  ChevronDown, ArrowRight, ClipboardCheck, HeartHandshake,
  CalendarDays // [ALTERAÇÃO]: Importado CalendarDays para a Agenda (Building2 removido)
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function Relatorios() { 
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [cardExpandido, setCardExpandido] = useState(null);

  const formatarNome = (nome) => {
    if (!nome) return "";
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  };

  useEffect(() => {
    try {
      const usuarioStr = localStorage.getItem("usuario"); 
      if (usuarioStr) {
        const user = JSON.parse(usuarioStr);
        const nomeBruto = user.nomeRegistro || user.nome || "Usuário";
        setUsuarioNome(formatarNome(nomeBruto.split(" ")[0]));
      }
    } catch (error) {
      console.error("Erro ao ler usuário do localStorage", error);
    }
  }, []);

  const corTextoPrincipal = isDarkMode ? "text-white" : "text-gray-900";
  const corTextoSecundario = isDarkMode ? "text-white/50" : "text-gray-500";
  const corCard = isDarkMode ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-200";
  const corLinhaDivisora = isDarkMode ? "bg-white/10" : "bg-gray-100";

  const modulos = [
    {
      id: 'vendas',
      titulo: 'Relatório de Vendas',
      descricao: 'Análise detalhada de faturamento, categorias e pagamentos.',
      rota: '/relatorios/vendas', 
      corHex: '#DC2626', bgClaro: 'bg-red-50', bgEscuro: 'bg-red-500/10', icone: ShoppingCart,
      subRelatorios: [
        { nome: 'Consulta Geral de Vendas', id: 'consulta_vendas' },
        { nome: 'Ranking de Produtos', id: 'produtos_vendidos' },
        { nome: 'Vendas por Vendedor', id: 'vendas_vendedor' },
        { nome: 'Vendas por Tipo de Pagamento', id: 'vendas_pagamento' }
      ]
    },
    {
      id: 'estoque',
      titulo: 'Relatório de Estoque',
      descricao: 'Controle de movimentações, perdas e gestão de inventário.',
      rota: '/relatorios/estoque', 
      corHex: '#F97316', bgClaro: 'bg-orange-50', bgEscuro: 'bg-orange-500/10', icone: Package,
      subRelatorios: [
        { nome: 'Posição Atual do Estoque', id: 'movimentacao_estoque' },
        { nome: 'Posição em Datas Passadas', id: 'estoque_retroativo' },
        { nome: 'Relatório de Descartes (Percas)', id: 'percas' },
        { nome: 'Relatório de Entradas', id: 'entrada' }
      ]
    },
    {
      id: 'clientes',
      titulo: 'Gestão de Clientes',
      descricao: 'Análise de comportamento, retenção e histórico.',
      rota: '/relatorios/clientes', 
      corHex: '#D946EF', bgClaro: 'bg-fuchsia-50', bgEscuro: 'bg-fuchsia-500/10', icone: HeartHandshake,
      subRelatorios: [
        { nome: 'Top Clientes (Curva ABC)', id: 'top_clientes' },
        { nome: 'Clientes Inativos (Retenção)', id: 'inativos' },
        { nome: 'Aniversariantes do Mês', id: 'aniversariantes' }
      ]
    },
    {
      id: 'avaliacoes',
      titulo: 'Avaliações Físicas',
      descricao: 'Métricas de evolução, composição corporal e anamneses.',
      rota: '/relatorios/avaliacoes', 
      corHex: '#EA580C', bgClaro: 'bg-orange-50', bgEscuro: 'bg-orange-500/10', icone: ClipboardCheck,
      subRelatorios: [
        { nome: 'Histórico de Avaliações', id: 'historico' },
        { nome: 'Ranking de Evolução', id: 'evolucao' },
        { nome: 'Mapeamento de Restrições (Anamnese)', id: 'restricoes' } 
      ]
    },
    {
      id: 'financeiro',
      titulo: 'Relatório Financeiro',
      descricao: 'Auditoria de caixa, recebimentos e despesas.',
      rota: '/relatorios/financeiro', 
      corHex: '#10B981', bgClaro: 'bg-emerald-50', bgEscuro: 'bg-emerald-500/10', icone: Wallet,
      subRelatorios: [
        { nome: 'Fluxo de Entradas (Caixas)', id: 'caixas' },
        { nome: 'Inadimplência (A Receber)', id: 'contas-receber' },
        { nome: 'Contas a Pagar / Despesas', id: 'contas-pagar' },
        { nome: 'DRE (Demonstrativo de Resultado)', id: 'dre' }
      ]
    },
    {
      id: 'equipe',
      titulo: 'Desempenho da Equipe',
      descricao: 'Métricas de vendedoras, comissões e alcance de metas.',
      rota: '/relatorios/desempenho', 
      corHex: '#3B82F6', bgClaro: 'bg-blue-50', bgEscuro: 'bg-blue-500/10', icone: Users,
      subRelatorios: [
        { nome: 'Vendas por funcionária', id: 'vendas_equipe' },
        { nome: 'Ranking de vendedores', id: 'ranking' },
        { nome: 'Metas vs realizado', id: 'metas' },
        { nome: 'Comissão', id: 'comissao' }
      ]
    },
    // [ALTERAÇÃO]: Módulo "Unidade" removido e substituído por "Agenda"
    {
      id: 'agenda',
      titulo: 'Gestão de Agenda',
      descricao: 'Análise de agendamentos, serviços mais procurados e faltas.',
      rota: '/relatorios/agenda', 
      corHex: '#8B5CF6', bgClaro: 'bg-purple-50', bgEscuro: 'bg-purple-500/10', icone: CalendarDays,
      subRelatorios: [
        { nome: 'Visão Geral de Agendamentos', id: 'geral_agenda' },
        { nome: 'Serviços Mais Agendados', id: 'servicos_agendados' },
        { nome: 'Taxa de Cancelamentos / Faltas', id: 'taxa_faltas' }
      ]
    }
  ];

  const handleToggleCard = (id) => setCardExpandido(cardExpandido === id ? null : id);

  const handleAcessarRelatorio = (mod, sub) => {
    const destino = sub.rotaEspecial ? sub.rotaEspecial : mod.rota;
    navigate(destino, { state: { abaAtiva: sub.id } });
  };

  return (
    <div className="flex flex-col w-full h-full font-sans animate-in fade-in duration-500 transition-colors overflow-y-auto custom-slim-scroll overflow-x-hidden bg-transparent pl-4 pr-4 lg:pr-12">
      <div className="mb-8 mt-4 w-full shrink-0">
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${corTextoPrincipal}`}>
          Que bom ter você aqui, {usuarioNome}
        </h1>
        <p className={`text-[10px] sm:text-[11px] mt-2 font-bold uppercase tracking-widest ${corTextoSecundario}`}>
          Selecione um departamento para visualizar relatórios detalhados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-start pb-10">
        {modulos.map((mod) => {
          const isExpanded = cardExpandido === mod.id;
          return (
            <div 
              key={mod.id}
              className={`group relative flex flex-col rounded-[24px] border transition-all duration-300 overflow-hidden cursor-pointer ${corCard} ${isExpanded ? 'shadow-2xl scale-[1.02]' : 'shadow-sm hover:shadow-xl hover:scale-[1.02]'}`}
              style={{ borderLeftWidth: '4px', borderLeftColor: mod.corHex }}
            >
              <div 
                className={`p-6 flex justify-between items-start transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                onClick={() => handleToggleCard(mod.id)}
              >
                <div className="flex flex-col gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${isExpanded ? 'rotate-6 scale-110' : ''} ${isDarkMode ? mod.bgEscuro : mod.bgClaro}`} style={{ color: mod.corHex }}>
                    <mod.icone size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black mb-1 uppercase tracking-tight ${corTextoPrincipal}`}>{mod.titulo}</h2>
                    <p className={`text-xs sm:text-sm font-bold leading-relaxed opacity-70 ${corTextoSecundario}`}>{mod.descricao}</p>
                  </div>
                </div>
                <div className={`p-2 rounded-full transition-colors duration-300 ${isExpanded ? (isDarkMode ? 'bg-white/10' : 'bg-gray-100') : ''}`}>
                    <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 opacity-100' : 'opacity-40'}`} style={{ color: isExpanded ? mod.corHex : 'inherit' }} />
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className={`h-px w-full mb-4 ${corLinhaDivisora}`} />
                  <ul className="space-y-2">
                    {mod.subRelatorios.map((sub) => (
                      <li key={sub.id}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleAcessarRelatorio(mod, sub);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors group/item ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full transition-transform group-hover/item:scale-150" style={{ backgroundColor: mod.corHex }} />
                            <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? 'text-gray-300 group-hover/item:text-white' : 'text-gray-600 group-hover/item:text-gray-900'}`}>{sub.nome}</span>
                          </div>
                          <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300" style={{ color: mod.corHex }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}