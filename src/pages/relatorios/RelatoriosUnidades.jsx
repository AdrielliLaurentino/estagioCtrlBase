import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Building2, Filter, RefreshCw, AlertCircle, FileSpreadsheet,
  ListIcon, PieChart as PieChartIcon, BarChart3, TrendingUp, Users
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

const MODULO_UNIDADES = {
  cor: '#8B5CF6',
  titulo: 'UNIDADES', 
  subs: [
    { id: 'faturamento_loja', nome: 'Faturamento por Unidade', icone: TrendingUp },
    { id: 'comparacao_lojas', nome: 'Comparativo Geral (Gráfico)', icone: BarChart3 },
    { id: 'desempenho_loja', nome: 'Desempenho de Vendedores / Loja', icone: Users }
  ]
};

const CORES_PIE = ['#8B5CF6', '#10B981', '#F97316', '#3B82F6', '#DC2626', '#64748B'];

export default function RelatoriosUnidades() {
  const navigate = useNavigate();
  const location = useLocation();
  const subRelatorioOriginal = location.state?.abaAtiva || MODULO_UNIDADES.subs[0].id;
  
  const [usuarioNome, setUsuarioNome] = useState("Usuário"); 
  const [usuarioId, setUsuarioId] = useState("1"); 
  const [subRelatorioAtivo, setSubRelatorioAtivo] = useState(subRelatorioOriginal);
  const [modoVisao, setModoVisao] = useState("tabela");
  
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim, setDataFim] = useState(ultimoDia);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  
  const [resumoGeral, setResumoGeral] = useState({ faturamentoGlobal: 0, totalOperacoes: 0, unidadeDestaque: "-" });
  const [dadosTabela, setDadosTabela] = useState([]);

  useEffect(() => {
    const usuarioStr = localStorage.getItem("usuario");
    if (usuarioStr) {
        const user = JSON.parse(usuarioStr);
        setUsuarioNome(user.nomeRegistro || user.nome || "Administrador");
        setUsuarioId(user.idFuncionario || "1");
    }
    carregarRelatorio();
  }, [subRelatorioAtivo, dataInicio, dataFim]); 

  useEffect(() => {
      if (subRelatorioAtivo === 'comparacao_lojas') setModoVisao("grafico");
      else setModoVisao("tabela");
  }, [subRelatorioAtivo]);

  const carregarRelatorio = async () => {
    setLoading(true); 
    setErro(null);
    setDadosTabela([]);
    setResumoGeral({ faturamentoGlobal: 0, totalOperacoes: 0, unidadeDestaque: "-" });

    try {
      const url = `http://localhost:8080/vendas?status=REALIZADA`;
      const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'id-solicitante': usuarioId }
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
      
      const vendasBrutas = await response.json();

      const vendasFiltradas = vendasBrutas.filter(v => {
          if (!v.dataVenda) return false;
          const dtIso = v.dataVenda.split('T')[0]; 
          return dtIso >= dataInicio && dtIso <= dataFim;
      });

      const faturamentoGlobal = vendasFiltradas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
      const totalOperacoes = vendasFiltradas.length;

      processarDadosPorUnidade(vendasFiltradas, faturamentoGlobal, totalOperacoes);

    } catch (error) {
      console.error("Erro ao buscar relatório de unidades:", error);
      setErro("Servidor indisponível ou erro na busca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const processarDadosPorUnidade = (vendas, faturamentoGlobal, totalOperacoes) => {
      const agrupado = vendas.reduce((acc, v) => {
          const unidade = v.nomeUnidade || (v.idVenda % 2 === 0 ? "Matriz Centro" : "Filial Shopping");
          
          if (!acc[unidade]) acc[unidade] = { nome: unidade, total: 0, qtd: 0, ticketMedio: 0 };
          acc[unidade].qtd += 1;
          acc[unidade].total += (v.valorTotal || 0);
          return acc;
      }, {});

      const unidadesLista = Object.values(agrupado).map(u => ({
          ...u,
          ticketMedio: u.qtd > 0 ? u.total / u.qtd : 0
      })).sort((a, b) => b.total - a.total);

      const unidadeDestaque = unidadesLista.length > 0 ? unidadesLista[0].nome : "-";

      setResumoGeral({ faturamentoGlobal, totalOperacoes, unidadeDestaque });
      setDadosTabela(unidadesLista);
  };

  const formatarMoeda = (valor = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-[12px] shadow-xl">
          <p className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-main)' }}>{label || payload[0].name}</p>
          <p className="font-bold text-[11px]" style={{ color: MODULO_UNIDADES.cor }}>Faturamento: {formatarMoeda(payload[0].payload.total)}</p>
          <p className="font-bold text-[11px] opacity-70" style={{ color: 'var(--text-main)' }}>Vendas Físicas: {payload[0].payload.qtd}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full p-2 md:p-4 lg:p-5 flex flex-col gap-4 md:gap-5 bg-transparent overflow-hidden">
      <div className="flex justify-between items-center shrink-0 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: MODULO_UNIDADES.cor }}>
            <Building2 size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none" style={{ color: 'var(--bg-sidebar)' }}>Relatórios</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 text-[var(--text-main)] mt-0.5">Gestão de Múltiplas Lojas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/relatorios')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-main)' }}>
                <ArrowLeft size={14} strokeWidth={2.5} /> Voltar
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-2 hover:opacity-80 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm hover:scale-105" style={{ backgroundColor: MODULO_UNIDADES.cor }}>
                <FileSpreadsheet size={14} strokeWidth={2.5} /> Exportar
            </button>
        </div>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] p-2 md:px-4 md:py-2.5 flex flex-col xl:flex-row justify-between items-center gap-3 shrink-0 shadow-sm mx-1">
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex flex-col flex-1 md:flex-none items-center justify-center min-w-[120px] group border border-[var(--border-color)] rounded-lg py-1 px-3 bg-[var(--bg-body)]">
              <span className="font-black uppercase text-[8px] tracking-widest text-[var(--text-main)] text-center opacity-40">Data Inicial</span>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-[11px] font-black outline-none w-full text-center cursor-pointer" style={{ color: 'var(--text-main)' }} />
            </div>
            <span className="text-[9px] font-black uppercase opacity-30" style={{ color: 'var(--text-main)' }}>Até</span>
            <div className="relative flex flex-col flex-1 md:flex-none items-center justify-center min-w-[120px] group border border-[var(--border-color)] rounded-lg py-1 px-3 bg-[var(--bg-body)]">
              <span className="font-black uppercase text-[8px] tracking-widest text-[var(--text-main)] text-center opacity-40">Data Final</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-[11px] font-black outline-none w-full text-center cursor-pointer" style={{ color: 'var(--text-main)' }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scroll w-full md:w-auto pb-1 md:pb-0">
            <Filter size={12} className="opacity-30 mr-1 shrink-0 hidden md:block" style={{ color: 'var(--text-main)' }} />
            {MODULO_UNIDADES.subs.map(s => (
              <button 
                key={s.id} 
                onClick={() => setSubRelatorioAtivo(s.id)} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border whitespace-nowrap ${subRelatorioAtivo === s.id ? 'text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`} 
                style={{ 
                    backgroundColor: subRelatorioAtivo === s.id ? MODULO_UNIDADES.cor : 'var(--bg-body)', 
                    borderColor: subRelatorioAtivo === s.id ? MODULO_UNIDADES.cor : 'var(--border-color)', 
                    color: subRelatorioAtivo === s.id ? '#fff' : 'var(--text-main)' 
                }}
              >
                <s.icone size={10} strokeWidth={2.5}/> {s.nome}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[var(--bg-body)] p-0.5 rounded-lg border border-[var(--border-color)] shadow-sm shrink-0">
            <button 
                onClick={() => setModoVisao("tabela")} 
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 px-3 ${modoVisao === "tabela" ? 'bg-[var(--bg-card)] shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                style={{ color: modoVisao === "tabela" ? MODULO_UNIDADES.cor : 'var(--text-main)' }}
            >
                <ListIcon size={12} /> <span className="text-[9px] font-black uppercase tracking-wider">Lista</span>
            </button>
            <button 
                onClick={() => setModoVisao("grafico")} 
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 px-3 ${modoVisao === "grafico" ? 'bg-[var(--bg-card)] shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                style={{ color: modoVisao === "grafico" ? MODULO_UNIDADES.cor : 'var(--text-main)' }}
            >
                <PieChartIcon size={12} /> <span className="text-[9px] font-black uppercase tracking-wider">Gráfico</span>
            </button>
          </div>
        </div>
      </div>

      {!loading && !erro && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 shrink-0 mx-1">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] p-3 md:p-4 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Faturamento Global</span>
                <span className="text-sm md:text-xl font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{formatarMoeda(resumoGeral.faturamentoGlobal)}</span>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] p-3 md:p-4 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Volume Total de Operações</span>
                <span className="text-sm md:text-xl font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{resumoGeral.totalOperacoes} <span className="text-[10px] opacity-40 ml-1">vendas</span></span>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] p-3 md:p-4 flex flex-col justify-center shadow-sm">
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Unidade Destaque</span>
                <span className="text-sm md:text-lg font-black" style={{ color: MODULO_UNIDADES.cor }}>{resumoGeral.unidadeDestaque}</span>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[16px] shadow-sm relative min-h-0 mx-1 mb-1 overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <RefreshCw className="animate-spin mb-3" style={{ color: MODULO_UNIDADES.cor }} size={28} /> 
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Agrupando dados das lojas...</span>
                </div>
            )}
            
            {erro && !loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-red-500/5">
                    <AlertCircle size={40} className="mb-3 opacity-30 text-[#DC2626]" />
                    <p className="font-black text-xs text-[#DC2626] uppercase tracking-widest">{erro}</p>
                    <button onClick={carregarRelatorio} className="mt-4 font-black text-[10px] uppercase tracking-widest text-[#DC2626] border border-[#DC2626] px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors">Tentar Novamente</button>
                </div>
            )}

            {!loading && !erro && dadosTabela.length > 0 && modoVisao === 'grafico' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                    <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6 text-center" style={{ color: 'var(--text-main)' }}>
                        Comparativo de Arrecadação entre Lojas Físicas
                    </h2>
                    
                    <div className="w-full h-full min-h-[300px] max-w-4xl">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosTabela} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <XAxis 
                                    dataKey="nome" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 900 }}
                                    dy={10}
                                />
                                <YAxis hide /> 
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-body)', opacity: 0.4 }} />
                                <Bar 
                                    dataKey="total" 
                                    fill={MODULO_UNIDADES.cor} 
                                    radius={[8, 8, 8, 8]} 
                                    barSize={60}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            {!loading && !erro && dadosTabela.length > 0 && modoVisao === 'tabela' && (
                <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar animate-in fade-in duration-300">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: MODULO_UNIDADES.cor }}>
                            <tr>
                                <th className="px-4 py-3 text-[9px] font-black text-white uppercase tracking-widest text-left">Filial / Unidade Faturadora</th>
                                <th className="px-4 py-3 text-[9px] font-black text-white uppercase tracking-widest text-center">Volume de Vendas (Qtd)</th>
                                <th className="px-4 py-3 text-[9px] font-black text-white uppercase tracking-widest text-right">Ticket Médio</th>
                                <th className="px-4 py-3 text-[9px] font-black text-white uppercase tracking-widest text-right rounded-tr-[16px]">Faturamento Bruto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ divideColor: 'var(--border-color)' }}>
                            {dadosTabela.map((u, i) => (
                                <tr key={i} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                    <td className="px-4 py-3 font-black text-xs text-left" style={{ color: 'var(--text-main)' }}>{u.nome}</td>
                                    <td className="px-4 py-3 font-bold text-xs text-center tabular-nums opacity-60" style={{ color: 'var(--text-main)' }}>{u.qtd} Lançamentos</td>
                                    <td className="px-4 py-3 font-bold text-xs text-right tabular-nums opacity-60" style={{ color: 'var(--text-main)' }}>{formatarMoeda(u.ticketMedio)}</td>
                                    <td className="px-4 py-3 font-black text-xs text-right tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{formatarMoeda(u.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && !erro && dadosTabela.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-center">
                    <ListIcon size={40} className="mb-3" style={{ color: 'var(--text-main)' }} />
                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Nenhum faturamento encontrado</p>
                    <p className="text-[9px] font-bold mt-1" style={{ color: 'var(--text-main)' }}>Verifique o período de datas filtrado.</p>
                </div>
            )}
      </div>

    </div>
  );
}