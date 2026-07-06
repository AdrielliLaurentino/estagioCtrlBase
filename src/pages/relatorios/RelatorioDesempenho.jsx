import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Users, CheckCircle2, XCircle, ListIcon, PieChart as PieChartIcon, 
  CalendarDays, FileText, Table as TableIcon, ChevronDown, RefreshCw, Briefcase, ArrowLeft,
  Filter, Box
} from "lucide-react";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from "recharts";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";
import { gerarTemplateRelatorio } from "../../utils/geradorPdf";
import logoImage from "../../assets/icons/logobase.png"; 

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'SEMANA_PASSADA', label: 'Semana Passada' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
];

const CORES_GRAFICO = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', 'var(--bg-sidebar)'];

const calcularPeriodoDatas = (periodoId) => {
  const hoje = new Date();
  let inicio = new Date(hoje);
  let fim = new Date(hoje);

  inicio.setHours(0, 0, 0, 0);
  fim.setHours(23, 59, 59, 999);

  const diaSemana = hoje.getDay();

  switch (periodoId) {
    case 'ONTEM':
      inicio.setDate(hoje.getDate() - 1);
      fim.setDate(hoje.getDate() - 1);
      break;
    case 'ESTA_SEMANA':
      inicio.setDate(hoje.getDate() - diaSemana);
      break;
    case 'SEMANA_PASSADA':
      inicio.setDate(hoje.getDate() - diaSemana - 7);
      fim.setDate(hoje.getDate() - diaSemana - 1);
      break;
    case 'ESTE_MES':
      inicio.setDate(1);
      break;
    case 'MES_PASSADO':
      inicio.setMonth(hoje.getMonth() - 1, 1);
      fim.setMonth(hoje.getMonth(), 0);
      break;
    default: 
      break;
  }
  
  return { inicio, fim };
};

const formatarData = (dataStr) => {
  if (!dataStr) return "-";
  const d = new Date(dataStr);
  return isNaN(d.getTime()) ? dataStr : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function RelatorioDesempenho() {
  const navigate = useNavigate();
  const menuFiltroRef = useRef(null);
  const menuExportarRef = useRef(null);

  const { user } = useAuth();
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId || 1;
  const idOperador = user?.idFuncionario || user?.id || 1;

  const [unidade, setUnidade] = useState({});
  const [todasTarefasRaw, setTodasTarefasRaw] = useState([]);

  const [uiState, setUiState] = useState({
    showExportMenu: false,
    showFilterMenu: false,
    modoVisao: "tabela",
    periodo: "ESTE_MES"
  });
  
  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [], resumo: { total: 0, concluidas: 0, pendentes: 0, taxa: 0 }});

  useEffect(() => {
    const handleClickFora = (event) => {
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(event.target)) {
        setUiState(prev => ({ ...prev, showFilterMenu: false }));
      }
      if (menuExportarRef.current && !menuExportarRef.current.contains(event.target)) {
        setUiState(prev => ({ ...prev, showExportMenu: false }));
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    const fetchUnidade = async () => {
      try {
        const res = await apiFetch(`/unidades/dados-negocio`, {
          headers: { "id-operador": String(idOperador) }
        });
        if (res.ok) setUnidade(await res.json());
      } catch (e) { 
        console.warn("Rota de dados do negócio bloqueada. Ignorando fallback visual."); 
      }
    };
    if (idOperador) fetchUnidade();
  }, [idOperador]);

  const setFiltro = useCallback((k, v) => setUiState(prev => ({ ...prev, [k]: v })), []);

  const processarDadosNoFrontend = useCallback((tarefasBase, periodoSelecionado) => {
    const { inicio, fim } = calcularPeriodoDatas(periodoSelecionado);
    
    const listaFiltrada = tarefasBase.filter(t => {
       const dataTarefa = new Date(t.dataPrevista || t.data || t.dataCriacao);
       if (isNaN(dataTarefa.getTime())) return true;
       return dataTarefa >= inicio && dataTarefa <= fim;
    });

    const concluidas = listaFiltrada.filter(t => t.status === 'CONCLUIDA').length;
    const pendentes = listaFiltrada.length - concluidas;
    const taxa = listaFiltrada.length > 0 ? ((concluidas / listaFiltrada.length) * 100).toFixed(1) : 0;

    setDados({ 
      tabela: listaFiltrada.sort((a, b) => new Date(b.dataPrevista) - new Date(a.dataPrevista)), 
      resumo: { total: listaFiltrada.length, concluidas, pendentes, taxa } 
    });
  }, []);

  const fetchData = useCallback(async () => {
    setReq({ loading: true, erro: null });
    try {
      let response = await apiFetch(`/tarefas-diarias/unidade/${idUnidadeAtual}?size=500`, {
        headers: { "id-operador": String(idOperador) }
      });
      
      if (response.status === 403 || response.status === 404) {
         response = await apiFetch(`/tarefas-diarias?size=500`, {
            headers: { "id-operador": String(idOperador) }
         });
      }

      if (!response.ok) {
         if (response.status === 403) throw new Error("Acesso restrito ao painel de tarefas.");
         throw new Error("Não foi possível conectar com os serviços de tarefas.");
      }
      
      const resData = await response.json();
      const listaRaw = Array.isArray(resData) ? resData : (resData.content || []);
      
      setTodasTarefasRaw(listaRaw);
      processarDadosNoFrontend(listaRaw, uiState.periodo);
      
      setReq({ loading: false, erro: null });

    } catch (erro) {
      setDados({ tabela: [], resumo: { total: 0, concluidas: 0, pendentes: 0, taxa: 0 }});
      setReq({ loading: false, erro: erro.message });
    }
  }, [idUnidadeAtual, idOperador, uiState.periodo, processarDadosNoFrontend]);

  useEffect(() => { 
    if (idOperador) fetchData(); 
  }, [fetchData, idOperador]);

  useEffect(() => {
    if (todasTarefasRaw.length > 0) {
      processarDadosNoFrontend(todasTarefasRaw, uiState.periodo);
    }
  }, [uiState.periodo, todasTarefasRaw, processarDadosNoFrontend]);

  const exportarExcel = () => {
    setFiltro('showExportMenu', false);
    
    const cabecalhos = ["Data", "Responsável", "Tarefa", "Status"];
    const linhas = dados.tabela.map(item => [
      formatarData(item.dataPrevista || item.data),
      item.nomeFuncionarioAtribuido || item.responsavel || "Não Atribuído",
      item.nomeTarefa || item.descricao || "Sem Descrição",
      item.status === 'CONCLUIDA' ? 'Concluída' : 'Pendente'
    ]);

    const csvContent = [
      cabecalhos.join(";"),
      ...linhas.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Desempenho_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleExportarPDF = () => {
    setFiltro('showExportMenu', false);

    const periodoLabel = OPCOES_PERIODO.find(o => o.id === uiState.periodo)?.label || uiState.periodo;
    const titulosTabela = ["Data", "Responsável", "Tarefa", "Status"];
    
    const linhasTabela = dados.tabela.length > 0 
      ? dados.tabela.map(v => `
          <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarData(v.dataPrevista || v.data)}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${v.nomeFuncionarioAtribuido || v.responsavel || "Não Atribuído"}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${v.nomeTarefa || v.descricao || "Sem Descrição"}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: center; font-weight: bold; color: ${v.status === 'CONCLUIDA' ? '#10B981' : '#EF4444'};">
               ${v.status === 'CONCLUIDA' ? 'Concluída' : 'Pendente'}
            </td>
          </tr>`).join("")
      : `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #6B7280; font-style: italic;">Nenhuma tarefa encontrada neste período.</td></tr>`;

    const resumoHtml = `
      <div style="display: flex; gap: 40px; font-size: 10px; color: #111827; border: 1px solid #E5E7EB; padding: 15px; border-radius: 12px;">
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Total de Tarefas</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${dados.resumo.total} <span style="font-size: 10pt; font-weight: 500; color: #6B7280;">reg.</span></div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Concluídas</div>
          <div style="font-size: 15pt; font-weight: 900; color: #10B981;">${dados.resumo.concluidas}</div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Taxa de Entrega</div>
          <div style="font-size: 15pt; font-weight: 900; color: ${dados.resumo.taxa < 50 ? '#DC2626' : '#111827'};">${dados.resumo.taxa}%</div>
        </div>
      </div>
    `;

    gerarTemplateRelatorio({
      tituloRelatorio: "RELATÓRIO DE DESEMPENHO",
      periodo: `Período: ${periodoLabel}`,
      resumoHtml,
      titulosTabela: titulosTabela.map(t => `<th style="text-align: left; padding: 12px 8px; background: #F3F4F6; font-size: 12px;">${t}</th>`).join(""),
      linhasTabela,
      usuario: user,
      dadosNegocio: unidade,
      logoUrl: window.location.origin + logoImage
    });
  };

  const chartDataStatus = useMemo(() => [
    { name: 'Concluídas', value: dados.resumo.concluidas, color: '#10B981' },
    { name: 'Pendentes', value: dados.resumo.pendentes, color: '#EF4444' }
  ], [dados.resumo]);

  const corStatus = (status) => {
    if (status === 'CONCLUIDA') return 'bg-green-500/10 text-green-500 border-green-500/20 dark:text-green-400';
    return 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400';
  };

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className="flex flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6">
        <div className="flex items-center gap-4 w-full lg:w-[450px] shrink-0">
          <button 
            onClick={() => navigate('/relatorios')} 
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95 outline-none"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)] opacity-70" />
          </button>
          <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              <Briefcase className="w-8 h-8" style={{ color: 'var(--bg-sidebar)' }} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap text-[var(--bg-sidebar)]">
              Desempenho da Equipa
            </h1>
            <p className="text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)] whitespace-nowrap">
              Acompanhamento de produtividade e tarefas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative w-full lg:w-auto mt-4 lg:mt-0 justify-end">
          <div className="relative w-full sm:w-auto" ref={menuExportarRef}>
            <button 
              onClick={() => setFiltro('showExportMenu', !uiState.showExportMenu)}
              disabled={req.loading || req.erro}
              className="w-full lg:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              Exportar <ChevronDown size={14} className={`transition-transform ${uiState.showExportMenu ? "rotate-180" : ""}`} />
            </button>
            
            {uiState.showExportMenu && (
              <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)] outline-none">
                  <FileText size={16} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
                </button>
                <button onClick={exportarExcel} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)] outline-none">
                  <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] p-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shrink-0 shadow-sm">
        <div className="relative w-full xl:w-auto shrink-0" ref={menuFiltroRef}>
          <button 
            onClick={() => setFiltro('showFilterMenu', !uiState.showFilterMenu)}
            disabled={req.loading || req.erro}
            className="w-full xl:w-auto flex items-center justify-between gap-3 px-5 py-3 border border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-[var(--text-main)] outline-none disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: 'var(--bg-sidebar)' }} />
              <span className="text-xs font-black uppercase tracking-widest">
                {OPCOES_PERIODO.find(op => op.id === uiState.periodo)?.label}
              </span>
            </div>
            <ChevronDown size={14} className="opacity-50" />
          </button>

          {uiState.showFilterMenu && (
            <div className="absolute left-0 top-14 w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {OPCOES_PERIODO.map(op => (
                <button
                  key={op.id}
                  onClick={() => {
                    setFiltro('periodo', op.id);
                    setFiltro('showFilterMenu', false);
                  }}
                  className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors outline-none ${uiState.periodo === op.id ? 'bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)]' : 'text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex bg-transparent p-1 rounded-xl border border-[var(--border-color)] w-full xl:w-auto justify-center sm:justify-start shrink-0">
          <button onClick={() => setFiltro('modoVisao', 'tabela')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all outline-none ${uiState.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <ListIcon size={16} /> <span className="text-xs font-black uppercase">Lista</span>
          </button>
          <button onClick={() => setFiltro('modoVisao', 'grafico')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all outline-none ${uiState.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <PieChartIcon size={16} /> <span className="text-xs font-black uppercase">Gráfico</span>
          </button>
        </div>
      </section>

      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 w-full">
            {[
              { label: 'Total de Tarefas', valor: dados.resumo.total, suf: 'reg.' },
              { label: 'Concluídas', valor: dados.resumo.concluidas, suf: 'reg.' },
              { label: 'Pendentes', valor: dados.resumo.pendentes, suf: 'reg.' },
              { label: 'Taxa de Entrega', valor: dados.resumo.taxa, suf: '%' }
            ].map((card, idx) => (
                <div key={idx} className="py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] bg-[var(--bg-card)] border-[var(--border-color)]">
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className={`text-2xl font-black tracking-tight ${idx === 1 ? 'text-emerald-500 dark:text-emerald-400' : (idx === 2 && card.valor > 0 ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-main)]')}`}>
                      {card.valor} {card.suf && <span className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">{card.suf}</span>}
                    </p>
                </div>
            ))}
        </section>
      )}

      <main className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] overflow-hidden relative flex flex-col shadow-sm min-h-[400px]">
        
        {req.loading && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin mb-4" size={40} style={{ color: 'var(--bg-sidebar)' }} />
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 text-[var(--text-main)]">Sincronizando...</p>
          </div>
        )}

        {!req.loading && !req.erro && dados.tabela.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-[var(--text-main)]">
                <Box size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Nenhuma tarefa corresponde a este filtro.</p>
            </div>
        )}

        {!req.loading && req.erro && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-70 p-10">
                <XCircle size={40} className="mb-4 text-red-500 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-red-500">{req.erro}</p>
            </div>
        )}

        {uiState.modoVisao === 'grafico' && !req.loading && !req.erro && dados.tabela.length > 0 && (
          <div className="flex-1 p-4 md:p-8 flex flex-col w-full min-h-[400px] items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={chartDataStatus} innerRadius="40%" outerRadius="80%" paddingAngle={8} dataKey="value" stroke="none" style={{ outline: 'none' }}>
                    {chartDataStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip 
                    cursor={false} 
                    content={({ active, payload }) => {
                        if (!active || !payload) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
                            <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">Status: {d.name}</p>
                            <p className="text-sm font-black tabular-nums" style={{ color: d.color }}>Volume: {d.value} tarefas</p>
                          </div>
                        )
                    }}
                  />
                </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {uiState.modoVisao === 'tabela' && !req.loading && !req.erro && dados.tabela.length > 0 && (
          <div className="flex-1 overflow-x-auto custom-slim-scroll w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-0 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                  <th className="px-6 py-5">Data Prevista</th>
                  <th className="px-6 py-5">Responsável</th>
                  <th className="px-6 py-5">Tarefa / Instrução</th>
                  <th className="px-6 py-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dados.tabela.map((v, i) => (
                  <tr key={v.id || i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                    <td className="px-6 py-5 opacity-70 tabular-nums">{formatarData(v.dataPrevista || v.data)}</td>
                    <td className="px-6 py-5">{v.nomeFuncionarioAtribuido || v.responsavel || "Não Atribuído"}</td>
                    <td className="px-6 py-5 opacity-70">{v.nomeTarefa || v.descricao || "Sem Descrição"}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${corStatus(v.status)}`}>
                        {v.status === 'CONCLUIDA' ? 'Concluída' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}