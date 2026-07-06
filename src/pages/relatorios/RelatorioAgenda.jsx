import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  CalendarDays, CalendarCheck, CalendarX, Briefcase, ListIcon, 
  PieChart as PieChartIcon, FileText, Table as TableIcon,
  ChevronDown, RefreshCw, Box, Filter
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

import { gerarTemplateRelatorio } from "../../utils/geradorPdf";
import logoImage from "../../assets/icons/logobase.png"; 

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'SEMANA_PASSADA', label: 'Semana Passada' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' }
];

const MODULO_AGENDA = {
  subs: [
    { id: 'geral_agenda', nome: 'Visão Geral', icone: CalendarDays },
    { id: 'servicos_agendados', nome: 'Serviços Mais Agendados', icone: Briefcase },
    { id: 'taxa_faltas', nome: 'Taxa de Faltas/Cancelamentos', icone: CalendarX }
  ]
};

const formatarMoeda = (v = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatarDataHora = (ds) => {
  if (!ds) return "-";
  const d = new Date(ds);
  return isNaN(d.getTime()) ? ds : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

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
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
};

export default function RelatorioAgenda() {
  const location = useLocation();
  const menuFiltroRef = useRef(null);
  const menuExportarRef = useRef(null);

  const [usuario, setUsuario] = useState({});
  const [unidade, setUnidade] = useState({});
  const [uiState, setUiState] = useState({
    showExportMenu: false,
    showFilterMenu: false,
    modoVisao: "tabela",
    periodo: "ESTE_MES",
    subRelatorio: location.state?.abaAtiva || MODULO_AGENDA.subs[0].id
  });
  
  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [], resumo: { totalAgendamentos: 0, receitaConcluida: 0, taxaFaltas: 0 }});
  const CORES_GRAFICO = ['var(--bg-sidebar)', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
    try {
      const u = JSON.parse(localStorage.getItem("usuario")) || {};
      setUsuario(u);
    } catch { setUsuario({}); }
  }, []);

  useEffect(() => {
    const fetchUnidade = async () => {
      try {
        const id = usuario.unidadeId || usuario.idUnidade || 1;
        const res = await fetch(`/api/unidades/${id}`, {
          headers: { "Authorization": `Bearer ${usuario.token || ""}` }
        });
        if (res.ok) setUnidade(await res.json());
      } catch (e) { console.error(e); }
    };
    if (usuario.token) fetchUnidade();
  }, [usuario]);

  const setFiltro = useCallback((k, v) => setUiState(prev => ({ ...prev, [k]: v })), []);

  const fetchData = useCallback(async () => {
    setReq({ loading: true, erro: null });
    try {
      const idUnidade = usuario.unidadeId || usuario.idUnidade || 1;
      const { inicio, fim } = calcularPeriodoDatas(uiState.periodo);

      const headers = { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${usuario.token || ""}`
      };

      const endpoint = `/api/agendamentos/unidade/${idUnidade}?inicio=${inicio}&fim=${fim}`;
      const r = await fetch(endpoint, { headers });
      
      if (!r.ok) throw new Error("Erro de comunicação com o servidor.");
      const d = await r.json();
      const listaRaw = Array.isArray(d) ? d : (d.content || []);

      let totalAgendamentos = listaRaw.length;
      let receitaConcluida = 0;
      let faltasECancelamentos = 0;

      listaRaw.forEach(ag => {
          const status = (ag.status || "").toUpperCase();
          if (status === 'CONCLUIDO') {
              receitaConcluida += Number(ag.valorTotal || ag.valor || 0); 
          }
          if (status.includes('CANCELADO') || status === 'FALTOU') {
              faltasECancelamentos++;
          }
      });

      const taxaFaltas = totalAgendamentos > 0 ? ((faltasECancelamentos / totalAgendamentos) * 100).toFixed(1) : 0;

      if (uiState.subRelatorio === 'geral_agenda') {
        const processados = listaRaw.map(ag => ({
            id: ag.id,
            dataHora: ag.dataHoraInicio,
            cliente: ag.nomeCliente || "Não Informado",
            profissional: ag.profissional || "Não Informado",
            servico: ag.nomeServico || "Serviço Padrão",
            status: (ag.status || "AGENDADO").toUpperCase(),
            valor: Number(ag.valorTotal || ag.valor || 0)
        }));
        
        setDados({ 
            tabela: processados.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)), 
            resumo: { totalAgendamentos, receitaConcluida, taxaFaltas } 
        });
      } 
      else if (uiState.subRelatorio === 'servicos_agendados') {
        const agrupado = listaRaw.reduce((acc, ag) => {
            const servico = ag.nomeServico || "Não Especificado";
            const status = (ag.status || "").toUpperCase();
            
            if (!acc[servico]) acc[servico] = { nome: servico, qtd: 0, receita: 0 };
            acc[servico].qtd++;
            
            if (status === 'CONCLUIDO') {
                acc[servico].receita += Number(ag.valorTotal || ag.valor || 0);
            }
            return acc;
        }, {});

        setDados({ 
          tabela: Object.values(agrupado).sort((a, b) => b.qtd - a.qtd), 
          resumo: { totalAgendamentos, receitaConcluida, taxaFaltas }
        });
      }
      else if (uiState.subRelatorio === 'taxa_faltas') {
        const apenasFaltas = listaRaw.filter(ag => {
            const status = (ag.status || "").toUpperCase();
            return status.includes('CANCELADO') || status === 'FALTOU';
        }).map(ag => ({
            id: ag.id,
            dataHora: ag.dataHoraInicio,
            cliente: ag.nomeCliente || "Não Informado",
            servico: ag.nomeServico || "Não Informado",
            status: (ag.status || "").toUpperCase()
        }));

        setDados({ 
          tabela: apenasFaltas.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)), 
          resumo: { totalAgendamentos, receitaConcluida, taxaFaltas }
        });
      }
      
      setReq({ loading: false, erro: null });
    } catch (e) {
      setReq({ loading: false, erro: "Falha ao carregar dados do servidor." });
    }
  }, [uiState.subRelatorio, uiState.periodo, usuario]);

  useEffect(() => { 
    if(usuario.token || usuario.id) fetchData(); 
  }, [fetchData, usuario]);

  const exportarExcel = () => {
    let csvString = "\uFEFF"; 

    if (uiState.subRelatorio === 'geral_agenda') {
      csvString += "Data/Hora;Cliente;Profissional;Serviço;Status;Valor\n";
      dados.tabela.forEach(item => {
        csvString += `"${formatarDataHora(item.dataHora)}";"${formatarTitleCase(item.cliente)}";"${formatarTitleCase(item.profissional)}";"${formatarTitleCase(item.servico)}";"${item.status}";"${formatarMoeda(item.valor)}"\n`;
      });
    } else if (uiState.subRelatorio === 'servicos_agendados') {
      csvString += "Serviço;Quantidade de Agendamentos;Receita Gerada\n";
      dados.tabela.forEach(item => {
        csvString += `"${formatarTitleCase(item.nome)}";"${item.qtd}";"${formatarMoeda(item.receita)}"\n`;
      });
    } else if (uiState.subRelatorio === 'taxa_faltas') {
      csvString += "Data/Hora;Cliente;Serviço;Status\n";
      dados.tabela.forEach(item => {
        csvString += `"${formatarDataHora(item.dataHora)}";"${formatarTitleCase(item.cliente)}";"${formatarTitleCase(item.servico)}";"${item.status}"\n`;
      });
    }

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Agenda_${new Date().getTime()}.csv`;
    link.click();
    setFiltro('showExportMenu', false);
  };

  const handleExportarPDF = () => {
    setFiltro('showExportMenu', false);

    const subAtiva = MODULO_AGENDA.subs.find(s => s.id === uiState.subRelatorio);
    const tituloRelatorio = `RELATÓRIO DE AGENDA - ${subAtiva?.nome.toUpperCase() || "GERAL"}`;
    const labelPeriodo = `Período: ${OPCOES_PERIODO.find(o => o.id === uiState.periodo)?.label}`;

    let titulosTabela = [];
    
    if (uiState.subRelatorio === 'geral_agenda') {
      titulosTabela = ["Data/Hora", "Cliente", "Profissional", "Serviço", "Status", "Valor"];
    } else if (uiState.subRelatorio === 'servicos_agendados') {
      titulosTabela = ["Serviço", "Qtd Agendamentos", "Receita Gerada"];
    } else {
      titulosTabela = ["Data/Hora", "Cliente", "Serviço", "Status"];
    }

    const linhasTabela = dados.tabela.length > 0 
      ? dados.tabela.map(v => {
          if (uiState.subRelatorio === 'geral_agenda') {
            return `
              <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarDataHora(v.dataHora)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.cliente)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.profissional)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.servico)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: center;">${v.status}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700;">${formatarMoeda(v.valor)}</td>
              </tr>
            `;
          } else if (uiState.subRelatorio === 'servicos_agendados') {
            return `
              <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.nome)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">${v.qtd} agend.</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #10B981;">${formatarMoeda(v.receita)}</td>
              </tr>
            `;
          } else {
            return `
              <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarDataHora(v.dataHora)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.cliente)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${formatarTitleCase(v.servico)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; color: #DC2626; font-weight: 700;">${v.status}</td>
              </tr>
            `;
          }
        }).join("")
      : `<tr><td colspan="${titulosTabela.length}" style="text-align: center; padding: 20px; color: #6B7280; font-style: italic;">Nenhum registro encontrado para este período.</td></tr>`;

    const resumoHtml = `
      <div style="display: flex; gap: 40px; font-size: 10px; color: #111827; border: 1px solid #E5E7EB; padding: 15px; border-radius: 12px;">
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Total Agendado</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${dados.resumo.totalAgendamentos} <span style="font-size: 10pt; font-weight: 500; color: #6B7280;">reg.</span></div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Receita Efetivada</div>
          <div style="font-size: 15pt; font-weight: 900; color: #10B981;">${formatarMoeda(dados.resumo.receitaConcluida)}</div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563;">Taxa de Faltas</div>
          <div style="font-size: 15pt; font-weight: 900; color: ${dados.resumo.taxaFaltas > 15 ? '#DC2626' : '#111827'};">${dados.resumo.taxaFaltas}%</div>
        </div>
      </div>
    `;

    gerarTemplateRelatorio({
      tituloRelatorio,
      periodo: labelPeriodo,
      resumoHtml,
      titulosTabela: titulosTabela.map(t => `<th style="text-align: left; padding: 12px 8px; background: #F3F4F6; font-size: 12px;">${t}</th>`).join(""),
      linhasTabela,
      usuario,
      dadosNegocio: unidade,
      logoUrl: window.location.origin + logoImage 
    });
  };

  const chartData = useMemo(() => {
    if (uiState.subRelatorio === 'geral_agenda') {
       const groups = dados.tabela.reduce((acc, curr) => {
          const s = curr.status || "DESCONHECIDO";
          acc[s] = (acc[s] || 0) + 1;
          return acc;
       }, {});
       return Object.entries(groups).map(([nome, qtd]) => ({ nome, qtd }));
    }
    if (uiState.subRelatorio === 'taxa_faltas') {
        const groups = dados.tabela.reduce((acc, curr) => {
           const s = curr.status || "FALTA";
           acc[s] = (acc[s] || 0) + 1;
           return acc;
        }, {});
        return Object.entries(groups).map(([nome, qtd]) => ({ nome, qtd }));
    }
    return [...dados.tabela].slice(0, 10);
  }, [dados.tabela, uiState.subRelatorio]);

  const corStatus = (status) => {
      if (status === 'CONCLUIDO') return 'bg-green-500/10 text-green-500 border-green-500/20 dark:text-green-400';
      if (status.includes('CANCELADO')) return 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400';
      if (status === 'AGENDADO' || status === 'PENDENTE_APROVACAO_FINANCEIRA') return 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:text-blue-400';
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20 dark:text-gray-400';
  };

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className="flex flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6">
        <div className="flex items-center gap-4 w-full lg:w-[350px] shrink-0">
          <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              <CalendarDays className="w-8 h-8" style={{ color: 'var(--bg-sidebar)' }} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap text-[var(--bg-sidebar)]">
              Relatório de Agenda
            </h1>
            <p className="text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)] whitespace-nowrap">
              Controle de horários e serviços prestados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative w-full lg:w-auto mt-4 lg:mt-0 justify-end">
          <div className="relative w-full sm:w-auto" ref={menuExportarRef}>
            <button 
              onClick={() => setFiltro('showExportMenu', !uiState.showExportMenu)}
              disabled={req.loading}
              className="w-full lg:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              Exportar <ChevronDown size={14} className={`transition-transform ${uiState.showExportMenu ? "rotate-180" : ""}`} />
            </button>
            
            {uiState.showExportMenu && (
              <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)]">
                  <FileText size={16} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
                </button>
                <button onClick={exportarExcel} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
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
            className="w-full xl:w-auto flex items-center justify-between gap-3 px-5 py-3 border border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-[var(--text-main)]"
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} />
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
                  className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors ${uiState.periodo === op.id ? 'bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)]' : 'text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto custom-slim-scroll w-full xl:w-auto pb-2 xl:pb-0">
          {MODULO_AGENDA.subs.map(s => (
            <button 
              key={s.id} onClick={() => setFiltro('subRelatorio', s.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap shrink-0"
              style={{
                backgroundColor: uiState.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'transparent',
                borderColor: uiState.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'var(--border-color)',
                color: uiState.subRelatorio === s.id ? '#FFF' : 'var(--text-main)',
                opacity: uiState.subRelatorio === s.id ? 1 : 0.6
              }}
            >
              <s.icone size={16} /> {s.nome}
            </button>
          ))}
        </nav>

        <div className="flex bg-transparent p-1 rounded-xl border border-[var(--border-color)] w-full xl:w-auto justify-center sm:justify-start shrink-0">
          <button onClick={() => setFiltro('modoVisao', 'tabela')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all ${uiState.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <ListIcon size={16} /> <span className="text-xs font-black uppercase">Lista</span>
          </button>
          <button onClick={() => setFiltro('modoVisao', 'grafico')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all ${uiState.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <PieChartIcon size={16} /> <span className="text-xs font-black uppercase">Gráfico</span>
          </button>
        </div>
      </section>

      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 w-full">
            {[
              { label: 'Total de Agendamentos', valor: dados.resumo.totalAgendamentos, suf: 'reg.' },
              { label: 'Receita Concluída', valor: formatarMoeda(dados.resumo.receitaConcluida), suf: '' },
              { label: 'Taxa Faltas/Canc.', valor: dados.resumo.taxaFaltas, suf: '%' }
            ].map((card, idx) => (
                <div key={idx} className="py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] bg-[var(--bg-card)] border-[var(--border-color)]">
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className={`text-2xl font-black tracking-tight ${idx === 1 ? 'text-emerald-500 dark:text-emerald-400' : (idx === 2 && card.valor > 15 ? 'text-red-500' : 'text-[var(--text-main)]')}`}>
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
                <p className="text-xs font-black uppercase tracking-widest text-center">Nenhum dado retornado para este filtro.</p>
            </div>
        )}

        {uiState.modoVisao === 'grafico' && !req.loading && dados.tabela.length > 0 && (
          <div className="flex-1 p-4 md:p-8 flex flex-col w-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {uiState.subRelatorio === 'geral_agenda' || uiState.subRelatorio === 'taxa_faltas' ? (
                <PieChart>
                  <Pie data={chartData} innerRadius="40%" outerRadius="80%" paddingAngle={8} dataKey="qtd" stroke="none" style={{ outline: 'none' }}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip 
                    cursor={false} 
                    content={({ active, payload }) => {
                        if (!active || !payload) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
                            <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">Status: {d.nome}</p>
                            <p className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>Volume: {d.qtd} agend.</p>
                          </div>
                        )
                    }}
                  />
                </PieChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 50 }}>
                  <XAxis 
                    dataKey="nome" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 700 }} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                    height={100}
                    tickFormatter={(val) => val.length > 25 ? `${val.substring(0, 25)}...` : val}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    content={({ active, payload }) => {
                        if (!active || !payload) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
                            <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">{d.nome}</p>
                            <p className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>Volume: {d.qtd} agend.</p>
                            <p className="text-xs font-bold tabular-nums text-emerald-500 mt-1">Receita: {formatarMoeda(d.receita)}</p>
                          </div>
                        )
                    }}
                  />
                  <Bar dataKey="qtd" fill="var(--bg-sidebar)" radius={[8, 8, 0, 0]} maxBarSize={50} style={{ outline: 'none' }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {uiState.modoVisao === 'tabela' && !req.loading && dados.tabela.length > 0 && (
          <div className="flex-1 overflow-x-auto custom-slim-scroll w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-0 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                  {uiState.subRelatorio === 'geral_agenda' ? (
                    <><th className="px-6 py-5">Data/Hora</th><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Profissional</th><th className="px-6 py-5">Serviço</th><th className="px-6 py-5 text-center">Status</th><th className="px-6 py-5 text-right">Valor</th></>
                  ) : uiState.subRelatorio === 'servicos_agendados' ? (
                    <><th className="px-6 py-5">Serviço Requisitado</th><th className="px-6 py-5 text-center">Agendamentos Totais</th><th className="px-6 py-5 text-right">Receita Gerada</th></>
                  ) : (
                    <><th className="px-6 py-5">Data/Hora</th><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Serviço Requisitado</th><th className="px-6 py-5 text-center">Status da Falha</th></>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dados.tabela.map((v, i) => (
                  <tr key={v.id || i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                    {uiState.subRelatorio === 'geral_agenda' ? (
                      <>
                        <td className="px-6 py-5 opacity-70 tabular-nums">{formatarDataHora(v.dataHora)}</td>
                        <td className="px-6 py-5">{formatarTitleCase(v.cliente)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.profissional)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.servico)}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${corStatus(v.status)}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{formatarMoeda(v.valor)}</td>
                      </>
                    ) : uiState.subRelatorio === 'servicos_agendados' ? (
                      <>
                        <td className="px-6 py-5">{formatarTitleCase(v.nome)}</td>
                        <td className="px-6 py-5 text-center tabular-nums opacity-80">{v.qtd} <span className="text-xs opacity-50">agend.</span></td>
                        <td className="px-6 py-5 text-right font-black tabular-nums text-emerald-500 dark:text-emerald-400">{formatarMoeda(v.receita)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-5 opacity-70 tabular-nums">{formatarDataHora(v.dataHora)}</td>
                        <td className="px-6 py-5">{formatarTitleCase(v.cliente)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.servico)}</td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${corStatus(v.status)}`}>
                            {v.status}
                          </span>
                        </td>
                      </>
                    )}
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