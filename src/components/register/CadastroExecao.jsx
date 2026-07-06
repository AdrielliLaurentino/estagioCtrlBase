import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  RefreshCw, AlertCircle, FileText, Table as TableIcon,
  Activity, TrendingDown, HeartPulse, ClipboardCheck, ChevronDown, 
  CalendarDays, Box, ArrowLeft, Search, Calendar, User, Target
} from "lucide-react";

import iconeLogo from "../../assets/icons/logo.png"; 
import { gerarTemplateRelatorio } from "../../utils/geradorPdf";

const API_BASE = "/api";

const MODULO_AVALIACAO = {
  subs: [
    { id: 'historico', nome: 'Histórico de Avaliações', icone: Activity },
    { id: 'evolucao', nome: 'Ranking de Evolução', icone: TrendingDown },
    { id: 'restricoes', nome: 'Mapeamento de Restrições', icone: HeartPulse }
  ]
};

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'SEMANA_PASSADA', label: 'Semana Passada' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
  { id: 'CUSTOM', label: 'Personalizado' }
];

const formatarDecimal = (valor = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

const formatarDataSegura = (dataRaw) => {
  if (!dataRaw) return "-";
  try {
    if (Array.isArray(dataRaw)) return `${String(dataRaw[2]).padStart(2, '0')}/${String(dataRaw[1]).padStart(2, '0')}/${dataRaw[0]}`;
    const dataStr = String(dataRaw);
    if (dataStr.includes('/')) return dataStr;
    if (dataStr.includes('-')) {
        const partes = dataStr.split('T')[0].split('-');
        if (partes.length >= 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    const d = new Date(dataRaw);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
    return "-";
  } catch (e) { return "-"; }
};

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getIsoDate = (d) => {
    if (!d || isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RelatoriosAvaliacao() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [usuario, setUsuario] = useState({}); 
  const [dadosNegocio, setDadosNegocio] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const [termoBuscaAluno, setTermoBuscaAluno] = useState("");
  
  const [filtros, setFiltros] = useState(() => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
      subRelatorio: location.state?.abaAtiva || MODULO_AVALIACAO.subs[0].id,
      modoVisao: "tabela",
      periodoId: 'ESTE_MES',
      dataInicio: getIsoDate(primeiroDiaMes),
      dataFim: getIsoDate(ultimoDiaMes)
    };
  });

  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [] });

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario")) || {};
      setUsuario(u);
    } catch { setUsuario({}); }
  }, []);

  useEffect(() => {
     const fetchDadosEmpresa = async () => {
         try {
             if (!usuario || !usuario.token) return;
             const res = await fetch(`${API_BASE}/unidades/dados-negocio`, {
                 headers: { "Authorization": `Bearer ${usuario.token}` }
             });
             if (res.ok) setDadosNegocio(await res.json());
         } catch (e) {
             console.error(e);
         }
     };
     fetchDadosEmpresa();
  }, [usuario]);

  const aplicarPeriodoRapido = useCallback((idPeriodo) => {
    const hoje = new Date();
    let dInicio = new Date();
    let dFim = new Date();

    switch (idPeriodo) {
      case 'HOJE': 
        break;
      case 'ONTEM':
        dInicio.setDate(hoje.getDate() - 1);
        dFim.setDate(hoje.getDate() - 1);
        break;
      case 'ESTA_SEMANA':
        dInicio.setDate(hoje.getDate() - hoje.getDay()); 
        dFim.setDate(dInicio.getDate() + 6);
        break;
      case 'SEMANA_PASSADA':
        dInicio.setDate(hoje.getDate() - hoje.getDay() - 7);
        dFim.setDate(dInicio.getDate() + 6);
        break;
      case 'ESTE_MES':
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'MES_PASSADO':
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case 'CUSTOM':
        setFiltros(prev => ({ ...prev, periodoId: idPeriodo }));
        return;
      default: return;
    }

    setFiltros(prev => ({ 
      ...prev, 
      periodoId: idPeriodo, 
      dataInicio: getIsoDate(dInicio),
      dataFim: getIsoDate(dFim)
    }));
  }, []);

  useEffect(() => {
      if (filtros.subRelatorio === 'historico') setFiltros(prev => ({ ...prev, modoVisao: "tabela" }));
  }, [filtros.subRelatorio]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (!e.target.closest('.modal-container-export')) setShowExportMenu(false);
      if (!e.target.closest('.modal-container-periodo')) setShowPeriodoModal(false);
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const isPendingBackend = filtros.subRelatorio === 'evolucao' || filtros.subRelatorio === 'restricoes';

  const fetchData = useCallback(async () => {
    if (isPendingBackend) {
        setDados({ tabela: [] });
        return;
    }

    setReq({ loading: true, erro: null });
    
    try {
      const headers = { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${usuario.token || ""}`,
        "id-solicitante": String(usuario.id || usuario.idFuncionario || 1),
        "id-operador": String(usuario.id || usuario.idFuncionario || 1)
      };

      const dataInicioIso = `${filtros.dataInicio}T00:00:00`;
      const dataFimIso = `${filtros.dataFim}T23:59:59`;
      const idUnidade = usuario.idUnidade || usuario.unidadeId || 1;

      const resClientes = await fetch(`${API_BASE}/clientes`, { headers });
      const clientes = resClientes.ok ? await resClientes.json() : [];

      const promisesAvaliacoes = clientes.map(c => 
        fetch(`${API_BASE}/avaliacoes/cliente/${c.idCliente}`, { headers })
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );

      const [resAgendadas, ...resultadosAvaliacoes] = await Promise.all([
        fetch(`${API_BASE}/agendamentos/unidade/${idUnidade}?inicio=${dataInicioIso}&fim=${dataFimIso}`, { headers }),
        ...promisesAvaliacoes
      ]);

      const listaRealizadas = resultadosAvaliacoes.flat();
      const dataBrutaAgendadas = resAgendadas.ok ? await resAgendadas.json() : [];
      const listaAgendadas = Array.isArray(dataBrutaAgendadas) ? dataBrutaAgendadas : (dataBrutaAgendadas.content || []);

      const realizadasFiltradas = listaRealizadas.filter(av => {
          const dataAv = av.dataAvaliacao;
          if (!dataAv) return false;
          const dtIso = typeof dataAv === 'string' ? dataAv.split('T')[0] : (Array.isArray(dataAv) ? `${dataAv[0]}-${String(dataAv[1]).padStart(2,'0')}-${String(dataAv[2]).padStart(2,'0')}` : "");
          return dtIso >= filtros.dataInicio && dtIso <= filtros.dataFim;
      });

      const formatadosRealizadas = realizadasFiltradas.map(av => {
          const gordura = parseFloat(av.percentualGordura || 0);
          const agendamento = listaAgendadas.find(a => a.nomeCliente === (av.nomeCliente || av.cliente?.nomeCompleto));
          return {
              id: av.idAvaliacao,
              data: av.dataAvaliacao,
              cliente: av.nomeCliente || "Não Informado",
              avaliador: av.nomeAvaliador || "Sistema",
              professorAgendado: agendamento?.profissional || "N/A",
              peso: av.peso || 0,
              gordura: gordura,
              massaMagra: av.massaMagra || 0,
              objetivo: av.objetivoPrincipal || "Não Informado",
              statusRegistro: "REALIZADA"
          };
      });

      const formatadosAgendadas = listaAgendadas
        .filter(ag => (ag.nomeServico || "").toLowerCase().includes("avalia") && ag.status !== "CANCELADO" && ag.status !== "CONCLUIDO")
        .map(ag => ({
            id: ag.id || ag.idAgendamento,
            data: ag.dataHoraInicio,
            cliente: ag.nomeCliente || "Não Informado",
            avaliador: "A Definir",
            professorAgendado: ag.profissional || "N/A",
            peso: 0,
            gordura: 0,
            massaMagra: 0,
            objetivo: "Avaliação Agendada",
            statusRegistro: "AGENDADA"
        }));

      const tabelaConsolidada = [...formatadosRealizadas, ...formatadosAgendadas].sort((a, b) => new Date(b.data) - new Date(a.data));

      setDados({ tabela: tabelaConsolidada });
      setReq({ loading: false, erro: null });

    } catch (error) {
      setReq({ loading: false, erro: error.message || "Servidor indisponível ou falha na busca." });
    }
  }, [filtros.dataInicio, filtros.dataFim, isPendingBackend, usuario]);

  useEffect(() => { 
    if(usuario.token || usuario.id) fetchData(); 
  }, [fetchData, usuario]);

  const dadosFiltrados = useMemo(() => {
      return dados.tabela.filter(av => {
          if (termoBuscaAluno && !av.cliente.toLowerCase().includes(termoBuscaAluno.toLowerCase())) return false;
          return true;
      });
  }, [dados.tabela, termoBuscaAluno]);

  const resumoFiltrado = useMemo(() => {
      let somaGordura = 0;
      let countGordura = 0;
      dadosFiltrados.forEach(av => {
          if (av.statusRegistro === 'REALIZADA' && av.gordura > 0) {
              somaGordura += av.gordura;
              countGordura++;
          }
      });
      return {
          totalAvaliacoes: dadosFiltrados.length,
          mediaGordura: countGordura > 0 ? (somaGordura / countGordura) : 0,
          totalRestricoes: 0 
      };
  }, [dadosFiltrados]);

  const exportarCSV = () => {
    let csv = "\uFEFFData;Status;Cliente;Professor Agendado;Registrado Por;Objetivo;Peso (kg);Massa Magra (kg);Gordura (%)\n";
    dadosFiltrados.forEach(av => {
      csv += `"${formatarDataSegura(av.data)}";"${av.statusRegistro}";"${formatarTitleCase(av.cliente)}";"${formatarTitleCase(av.professorAgendado)}";"${formatarTitleCase(av.avaliador)}";"${formatarTitleCase(av.objetivo)}";"${formatarDecimal(av.peso)}";"${formatarDecimal(av.massaMagra)}";"${formatarDecimal(av.gordura)}"\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Relatorio_Avaliacoes_${new Date().getTime()}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const handleExportarPDF = () => {
    setShowExportMenu(false);

    const subAtiva = MODULO_AVALIACAO.subs.find(s => s.id === filtros.subRelatorio);
    const tituloRelatorio = `RELATÓRIO DE AVALIAÇÕES - ${subAtiva?.nome.toUpperCase() || "GERAL"}`;
    const periodoExtenso = `${filtros.dataInicio.split('-').reverse().join('/')} até ${filtros.dataFim.split('-').reverse().join('/')}`;
    const labelPeriodo = `Período: ${periodoExtenso}`;
    const titulosTabela = ["Data", "Aluno", "Prof. Agendado", "Avaliador", "Objetivo"];
    const linhasTabela = dadosFiltrados.length > 0 ? dadosFiltrados.map(av => `
      <tr>
        <td>${formatarDataSegura(av.data)}</td>
        <td>${formatarTitleCase(av.cliente)}</td>
        <td>${formatarTitleCase(av.professorAgendado)}</td>
        <td>${formatarTitleCase(av.avaliador)}</td>
        <td>${formatarTitleCase(av.objetivo)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum registo encontrado no período selecionado.</td></tr>`;

    const resumoHtml = `
      <div style="display: flex; gap: 40px; font-size: 10px; color: #111827;">
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Total de Registros</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${resumoFiltrado.totalAvaliacoes} <span style="font-size: 10pt; font-weight: 500; color: #6B7280;">reg.</span></div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Média de Gordura</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${formatarDecimal(resumoFiltrado.mediaGordura)}%</div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Anamneses com Restrição</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">-</div>
        </div>
      </div>
    `;

    gerarTemplateRelatorio({
      tituloRelatorio,
      periodo: labelPeriodo,
      resumoHtml,
      titulosTabela,
      linhasTabela,
      usuario,
      dadosNegocio,
      logoUrl: window.location.origin + iconeLogo 
    });
  };

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-4 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 mt-4 mb-2 gap-6 w-full">
        
        {/* Título */}
        <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
          <button onClick={() => navigate(-1)} className="hover:-translate-x-1 transition-transform outline-none shrink-0" title="Voltar">
            <ArrowLeft size={28} style={{ color: 'var(--bg-sidebar)' }} />
          </button>
          
          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8" style={{ color: 'var(--bg-sidebar)' }} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap text-[var(--bg-sidebar)]">
              Relatórios
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1 text-[var(--text-main)] whitespace-nowrap">
              Gestão de Avaliações
            </p>
          </div>
        </div>

        {/* Pesquisa*/}
        <div className="flex-1 w-full lg:max-w-md xl:max-w-xl relative mx-auto">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 transition-opacity text-[var(--text-main)]" />
            <input 
              type="text" 
              placeholder="Pesquisar por aluno..." 
              value={termoBuscaAluno}
              onChange={(e) => setTermoBuscaAluno(e.target.value)}
              className="w-full pl-10 pr-6 py-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-bold text-[var(--text-main)] shadow-sm transition-colors focus:border-[var(--bg-sidebar)] outline-none placeholder:opacity-40" 
            />
        </div>

        {/* Botões de Filtro e Ação */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0 justify-end modal-container-periodo modal-container-export">
            
            {filtros.periodoId === 'CUSTOM' && (
                <div className={`flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] shadow-sm animate-in fade-in ${isPendingBackend ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex flex-col flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Início</span>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltro('dataInicio', e.target.value)} className="bg-transparent w-full text-[10px] font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
                    </div>
                    <span className="text-[10px] font-black uppercase opacity-30 text-[var(--text-main)]">ATÉ</span>
                    <div className="flex flex-col flex-1 border-l border-[var(--border-color)] pl-3">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Fim</span>
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltro('dataFim', e.target.value)} className="bg-transparent w-full text-[10px] font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
                    </div>
                </div>
            )}

            <div className={`relative w-full sm:w-auto ${isPendingBackend ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <button 
                  onClick={() => setShowPeriodoModal(!showPeriodoModal)}
                  className="w-full sm:w-[160px] h-[40px] px-4 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl flex justify-between items-center transition-colors hover:border-[var(--bg-sidebar)] shadow-sm outline-none"
                >
                  <div className="flex items-center gap-2 truncate">
                      <CalendarDays size={14} style={{ color: 'var(--bg-sidebar)' }} className="shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] truncate">
                        {OPCOES_PERIODO.find(o => o.id === filtros.periodoId)?.label || "PERÍODO"}
                      </span>
                  </div>
                  <ChevronDown size={14} className={`opacity-40 shrink-0 transition-transform ${showPeriodoModal ? "rotate-180" : ""}`} style={{ color: 'var(--text-main)' }} />
                </button>

                {showPeriodoModal && (
                <div className="absolute top-[110%] right-0 lg:left-0 lg:right-auto w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {OPCOES_PERIODO.map(op => (
                    <button
                        key={op.id}
                        onClick={() => {
                          aplicarPeriodoRapido(op.id);
                          setShowPeriodoModal(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors outline-none border-b border-[var(--border-color)] last:border-0 ${
                        filtros.periodoId === op.id 
                            ? 'bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)]' 
                            : 'text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        {op.label}
                    </button>
                    ))}
                </div>
                )}
            </div>

            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={req.loading || isPendingBackend}
                className="w-full sm:w-[160px] h-[40px] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-sidebar)' }}
              >
                Exportar <ChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-[110%] w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)] outline-none">
                    <FileText size={14} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
                  </button>
                  <button onClick={exportarCSV} className="w-full flex items-center gap-3 px-5 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)] outline-none">
                    <TableIcon size={14} style={{ color: '#10B981' }} /> Baixar Excel
                  </button>
                </div>
              )}
            </div>
        </div>
      </header>

      {/* TABS E CONTEÚDO */}
      <div className="flex flex-col flex-1 min-h-0 w-full">
        
        {/* TABS */}
        <nav className="flex gap-1 overflow-x-auto no-scrollbar pt-2 px-2 sm:px-6 z-10 shrink-0">
          {MODULO_AVALIACAO.subs.map(s => (
            <button
              key={s.id} 
              onClick={() => setFiltro('subRelatorio', s.id)}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-t-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap outline-none relative translate-y-[1px] ${
                filtros.subRelatorio === s.id 
                ? "shadow-sm border-t border-x z-20 bg-[var(--bg-card)]" 
                : "bg-black/5 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100 border-t border-x"
              }`}
              style={{
                borderColor: filtros.subRelatorio === s.id ? 'var(--border-color)' : 'transparent',
                color: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'var(--text-main)'
              }}
            >
              <s.icone size={14} /> {s.nome}
            </button>
          ))}
        </nav>

        {/* CONTAINER PRINCIPAL */}
        <main 
          className="flex-1 bg-[var(--bg-card)] border-x border-b rounded-b-[24px] rounded-tr-[24px] overflow-hidden flex flex-col shadow-sm relative z-0"
          style={{ borderTop: '3px solid var(--bg-sidebar)', borderColor: 'var(--border-color)' }}
        >
          {req.loading && (
            <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin mb-4" size={40} style={{ color: 'var(--bg-sidebar)' }} />
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 text-[var(--text-main)]">Sincronizando Dados...</p>
            </div>
          )}

          {req.erro && !req.loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-card)]">
                  <AlertCircle size={48} className="mb-4 opacity-50 text-[var(--text-main)]" />
                  <p className="font-black text-sm uppercase tracking-widest mb-4 text-[var(--text-main)]">{req.erro}</p>
                  <button onClick={fetchData} className="font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-lg transition-opacity hover:opacity-80 shadow-md border bg-[var(--bg-sidebar)] text-white border-[var(--border-color)] outline-none">
                      Tentar Novamente
                  </button>
              </div>
          )}

          {isPendingBackend ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-center animate-in fade-in">
                  <HeartPulse size={56} className="mb-4" style={{ color: 'var(--text-main)' }} />
                  <p className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Módulo em Desenvolvimento</p>
                  <p className="text-xs font-bold mt-2 max-w-lg leading-relaxed text-[var(--text-main)]">A visualização de Evolução Comparativa e Filtro de Restrições (Anamnese) requer a criação de rotas agregadas específicas no Backend.</p>
              </div>
          ) : (
            <div className="flex flex-col flex-1 p-4 lg:p-6 overflow-hidden">
                {/*DASHBOARD*/}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 w-full mb-6">
                    {[
                    { label: 'Total de Registros', valor: resumoFiltrado.totalAvaliacoes, suf: 'reg.' },
                    { label: 'Média de Gordura', valor: formatarDecimal(resumoFiltrado.mediaGordura), suf: '%' },
                    { label: 'Anamneses com Restrição', valor: '-', suf: '' }
                    ].map((card, idx) => (
                        <div key={idx} className={`py-5 px-4 border text-center flex flex-col justify-center gap-1 rounded-[16px] bg-[var(--bg-card)] border-[var(--border-color)] ${idx === 2 ? 'opacity-40' : ''}`}>
                            <h2 className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 text-[var(--text-main)]">{card.label}</h2>
                            <p className="text-lg font-black tracking-tight text-[var(--text-main)]">
                            {card.valor}{card.suf && card.suf !== '%' ? <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">{card.suf}</span> : card.suf}
                            </p>
                        </div>
                    ))}
                </div>

                {dadosFiltrados.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-[var(--text-main)]">
                        <Box size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-center">Nenhum dado encontrado para o filtro informado.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto custom-slim-scroll w-full border border-[var(--border-color)] rounded-[16px]">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                                <tr className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                                    <th className="px-6 py-4">Aluno / Cliente</th>
                                    <th className="px-6 py-4 text-center">Data</th>
                                    <th className="px-6 py-4">Professor (Agendado)</th>
                                    <th className="px-6 py-4">Registrado Por</th>
                                    <th className="px-6 py-4 text-center">Objetivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {dadosFiltrados.map((av, i) => (
                                    <tr 
                                      key={i} 
                                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-bold text-[var(--text-main)] whitespace-nowrap cursor-pointer" 
                                      onClick={() => navigate(av.statusRegistro === 'REALIZADA' ? `/avaliacoes/cliente/${av.id}` : '#')}
                                    >
                                        <td className="px-6 py-4 text-[var(--bg-sidebar)] font-black text-sm">{formatarTitleCase(av.cliente)}</td>
                                        <td className="px-6 py-4 opacity-80 tabular-nums text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Calendar size={12} className="opacity-40" />
                                                {formatarDataSegura(av.data)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 opacity-70">
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="opacity-40" />
                                                {formatarTitleCase(av.professorAgendado)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 opacity-70">
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={12} className="opacity-40" />
                                                {formatarTitleCase(av.avaliador)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1.5 rounded-lg border shadow-sm text-[9px] font-black uppercase tracking-wider bg-black/5 dark:bg-white/5 border-[var(--border-color)]">
                                                {av.objetivo}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}