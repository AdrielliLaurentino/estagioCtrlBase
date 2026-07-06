import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  RefreshCw, AlertCircle, FileText, Table as TableIcon,
  Activity, TrendingDown, HeartPulse, ClipboardCheck, ChevronDown, 
  CalendarDays, Box, ArrowLeft
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

export default function RelatoriosAvaliacao() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [usuario, setUsuario] = useState({}); 
  const [dadosNegocio, setDadosNegocio] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const { primeiroDia, ultimoDia } = useMemo(() => {
    const hoje = new Date();
    return {
      primeiroDia: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
      ultimoDia: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
    };
  }, []);

  const [filtros, setFiltros] = useState({
    subRelatorio: location.state?.abaAtiva || MODULO_AVALIACAO.subs[0].id,
    modoVisao: "tabela",
    dataInicio: primeiroDia,
    dataFim: ultimoDia
  });

  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ 
      tabela: [], 
      resumo: { totalAvaliacoes: 0, mediaGordura: 0, totalRestricoes: 0 }
  });

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
             console.error("Falha ao carregar dados da empresa.");
         }
     };
     fetchDadosEmpresa();
  }, [usuario]);

  const setFiltro = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
      if (filtros.subRelatorio === 'historico') setFiltro('modoVisao', "tabela");
  }, [filtros.subRelatorio]);

  const isPendingBackend = filtros.subRelatorio === 'evolucao' || filtros.subRelatorio === 'restricoes';

  const fetchData = useCallback(async () => {
    if (isPendingBackend) {
        setDados({ tabela: [], resumo: { totalAvaliacoes: 0, mediaGordura: 0, totalRestricoes: 0 }});
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

      let somaGordura = 0;
      let countGordura = 0;

      const formatadosRealizadas = realizadasFiltradas.map(av => {
          const gordura = parseFloat(av.percentualGordura || 0);
          if (gordura > 0) {
              somaGordura += gordura;
              countGordura++;
          }
          return {
              id: av.idAvaliacao,
              data: av.dataAvaliacao,
              cliente: av.nomeCliente || "Não Informado",
              avaliador: av.nomeAvaliador || "Sistema",
              peso: av.peso || 0,
              gordura: gordura,
              massaMagra: av.massaMagra || 0,
              objetivo: av.objetivoPrincipal || "Não Informado",
              statusRegistro: "REALIZADA"
          };
      });

      // MODIFICAÇÃO: A validação de agendamento agora usa `nomeServico` ao invés de propriedades aninhadas inexistentes.
      const formatadosAgendadas = listaAgendadas
        .filter(ag => (ag.nomeServico || "").toLowerCase().includes("avalia") && ag.status !== "CANCELADO")
        .map(ag => ({
            id: ag.id || ag.idAgendamento,
            data: ag.dataHoraInicio,
            cliente: ag.nomeCliente || "Não Informado",
            avaliador: ag.profissional || "A Definir",
            peso: 0,
            gordura: 0,
            massaMagra: 0,
            objetivo: "Avaliação Agendada",
            statusRegistro: "AGENDADA"
        }));

      const tabelaConsolidada = [...formatadosRealizadas, ...formatadosAgendadas].sort((a, b) => new Date(b.data) - new Date(a.data));

      setDados({
          tabela: tabelaConsolidada,
          resumo: {
              totalAvaliacoes: tabelaConsolidada.length,
              mediaGordura: countGordura > 0 ? (somaGordura / countGordura) : 0,
              totalRestricoes: 0 
          }
      });
      setReq({ loading: false, erro: null });

    } catch (error) {
      setReq({ loading: false, erro: error.message || "Servidor indisponível ou falha na busca." });
    }
  }, [filtros.dataInicio, filtros.dataFim, isPendingBackend, usuario]);

  useEffect(() => { 
    if(usuario.token || usuario.id) fetchData(); 
  }, [fetchData, usuario]);

  const exportarCSV = () => {
    let csv = "\uFEFFData;Status;Cliente;Avaliador;Objetivo;Peso (kg);Massa Magra (kg);Gordura (%)\n";
    dados.tabela.forEach(av => {
      csv += `"${formatarDataSegura(av.data)}";"${av.statusRegistro}";"${formatarTitleCase(av.cliente)}";"${formatarTitleCase(av.avaliador)}";"${formatarTitleCase(av.objetivo)}";"${formatarDecimal(av.peso)}";"${formatarDecimal(av.massaMagra)}";"${formatarDecimal(av.gordura)}"\n`;
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

    const titulosTabela = ["Data", "Status", "Cliente", "Avaliador", "Objetivo", "Peso", "M. Magra", "% Gordura"];

    const linhasTabela = dados.tabela.length > 0 ? dados.tabela.map(av => `
      <tr>
        <td>${formatarDataSegura(av.data)}</td>
        <td>${av.statusRegistro}</td>
        <td>${formatarTitleCase(av.cliente)}</td>
        <td>${formatarTitleCase(av.avaliador)}</td>
        <td>${formatarTitleCase(av.objetivo)}</td>
        <td class="right">${av.statusRegistro === 'REALIZADA' ? formatarDecimal(av.peso) : '-'}</td>
        <td class="right">${av.statusRegistro === 'REALIZADA' ? formatarDecimal(av.massaMagra) : '-'}</td>
        <td class="right" style="font-weight: 700;">${av.statusRegistro === 'REALIZADA' ? formatarDecimal(av.gordura) + '%' : '-'}</td>
      </tr>
    `).join("") : `<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum registo encontrado no período selecionado.</td></tr>`;

    const resumoHtml = `
      <div style="display: flex; gap: 40px; font-size: 10px; color: #111827;">
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Total de Registros</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${dados.resumo.totalAvaliacoes} <span style="font-size: 10pt; font-weight: 500; color: #6B7280;">reg.</span></div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Média de Gordura</div>
          <div style="font-size: 15pt; font-weight: 900; color: #111827;">${formatarDecimal(dados.resumo.mediaGordura)}%</div>
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
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className="flex flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6">
        <div className="flex items-center gap-3 w-full lg:w-[420px] shrink-0">
          <button onClick={() => navigate(-1)} className="hover:-translate-x-1 transition-transform outline-none shrink-0" title="Voltar">
            <ArrowLeft size={28} style={{ color: 'var(--bg-sidebar)' }} />
          </button>
          
          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8" style={{ color: 'var(--bg-sidebar)' }} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap text-[var(--bg-sidebar)]">
              Avaliações Físicas
            </h1>
            <p className="text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)] whitespace-nowrap">
              Evolução real começa com dados precisos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative w-full lg:w-auto mt-4 lg:mt-0 justify-end">
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={req.loading || isPendingBackend}
              className="w-full lg:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              Exportar <ChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)]">
                  <FileText size={16} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
                </button>
                <button onClick={exportarCSV} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
                  <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] p-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shrink-0 shadow-sm">
        
        <div className={`flex items-center gap-2 px-5 py-2 border border-[var(--border-color)] rounded-xl bg-transparent w-full xl:w-auto overflow-hidden transition-opacity ${isPendingBackend ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} className="shrink-0" />
          <div className="flex items-center gap-3 w-full">
            <div className="flex flex-col flex-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Início</span>
              <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltro('dataInicio', e.target.value)} className="bg-transparent w-full text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <span className="text-[10px] font-black uppercase opacity-30 text-[var(--text-main)]">ATÉ</span>
            <div className="flex flex-col flex-1 border-l border-[var(--border-color)] pl-3">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Fim</span>
              <input type="date" value={filtros.dataFim} onChange={(e) => setFiltro('dataFim', e.target.value)} className="bg-transparent w-full text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto custom-slim-scroll w-full xl:w-auto pb-2 xl:pb-0">
          {MODULO_AVALIACAO.subs.map(s => (
            <button 
              key={s.id} onClick={() => setFiltro('subRelatorio', s.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap shrink-0"
              style={{
                backgroundColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'transparent',
                borderColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'var(--border-color)',
                color: filtros.subRelatorio === s.id ? '#FFF' : 'var(--text-main)',
                opacity: filtros.subRelatorio === s.id ? 1 : 0.6
              }}
            >
              <s.icone size={16} /> {s.nome}
            </button>
          ))}
        </nav>
      </section>

      {!req.loading && !req.erro && filtros.subRelatorio === 'historico' && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 w-full">
            {[
              { label: 'Total de Registros', valor: dados.resumo.totalAvaliacoes, suf: 'reg.' },
              { label: 'Média de Gordura', valor: formatarDecimal(dados.resumo.mediaGordura), suf: '%' },
              { label: 'Anamneses com Restrição', valor: '-', suf: '' }
            ].map((card, idx) => (
                <div key={idx} className={`py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] bg-[var(--bg-card)] border-[var(--border-color)] ${idx === 2 ? 'opacity-40' : ''}`}>
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className="text-2xl font-black tracking-tight text-[var(--text-main)]">
                      {card.valor}{card.suf && card.suf !== '%' ? <span className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">{card.suf}</span> : card.suf}
                    </p>
                </div>
            ))}
        </section>
      )}

      <main className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] overflow-hidden relative flex flex-col shadow-sm min-h-[400px]">
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

        {!req.loading && !req.erro && isPendingBackend && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-center animate-in fade-in">
                <HeartPulse size={56} className="mb-4" style={{ color: 'var(--text-main)' }} />
                <p className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Módulo em Desenvolvimento</p>
                <p className="text-xs font-bold mt-2 max-w-lg leading-relaxed text-[var(--text-main)]">A visualização de Evolução Comparativa e Filtro de Restrições (Anamnese) requer a criação de rotas agregadas específicas no Backend.</p>
            </div>
        )}

        {!req.loading && !req.erro && dados.tabela.length === 0 && !isPendingBackend && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-[var(--text-main)]">
                <Box size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Nenhum dado encontrado para o período.</p>
            </div>
        )}

        {!req.loading && !req.erro && dados.tabela.length > 0 && filtros.modoVisao === 'tabela' && !isPendingBackend && (
          <div className="flex-1 overflow-x-auto custom-slim-scroll w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                    <th className="px-6 py-5">Data</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5">Aluno / Cliente</th>
                    <th className="px-6 py-5">Avaliador</th>
                    <th className="px-6 py-5">Foco / Objetivo</th>
                    <th className="px-6 py-5 text-right">Peso</th>
                    <th className="px-6 py-5 text-right">Massa Magra</th>
                    <th className="px-6 py-5 text-right">% Gordura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dados.tabela.map((av, i) => (
                    <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap cursor-pointer" onClick={() => navigate(av.statusRegistro === 'REALIZADA' ? `/avaliacoes/cliente/${av.id}` : '#')}>
                        <td className="px-6 py-5 opacity-60 tabular-nums text-xs">{formatarDataSegura(av.data)}</td>
                        <td className="px-6 py-5">
                            <span className={`px-3 py-1.5 rounded-lg border shadow-sm text-[10px] uppercase tracking-wider ${av.statusRegistro === 'REALIZADA' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'}`}>
                                {av.statusRegistro}
                            </span>
                        </td>
                        <td className="px-6 py-5">{formatarTitleCase(av.cliente)}</td>
                        <td className="px-6 py-5 opacity-80">{formatarTitleCase(av.avaliador)}</td>
                        <td className="px-6 py-5">
                            <span className="px-3 py-1.5 rounded-lg border shadow-sm text-[10px] uppercase tracking-wider bg-black/5 dark:bg-white/5 border-[var(--border-color)]">
                                {formatarTitleCase(av.objetivo)}
                            </span>
                        </td>
                        <td className="px-6 py-5 text-right opacity-80 tabular-nums">{av.statusRegistro === 'REALIZADA' ? `${formatarDecimal(av.peso)} kg` : '-'}</td>
                        <td className="px-6 py-5 text-right opacity-80 tabular-nums">{av.statusRegistro === 'REALIZADA' ? `${formatarDecimal(av.massaMagra)} kg` : '-'}</td>
                        <td className="px-6 py-5 text-right font-black tabular-nums" style={{ color: av.statusRegistro === 'REALIZADA' ? 'var(--bg-sidebar)' : 'var(--text-main)' }}>{av.statusRegistro === 'REALIZADA' ? `${formatarDecimal(av.gordura)}%` : '-'}</td>
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