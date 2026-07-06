import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, History, Search, 
  ChevronDown, FileText, Table as TableIcon, CalendarDays, AlertCircle,
  PackagePlus, ShoppingCart, AlertTriangle, Edit3, Archive, 
  ChevronLeft, ChevronRight
} from "lucide-react";
import iconeLogo from "../../assets/icons/logobase.png"; 
import { gerarTemplateRelatorio } from "../../utils/geradorPdf";

const CONFIG_MOV = {
  ENTRADA: { cor: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bordaLateral: "border-l-4 border-emerald-500", icone: PackagePlus, label: "Nova Entrada" },
  VENDA: { cor: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", bordaLateral: "border-l-4 border-blue-500", icone: ShoppingCart, label: "Venda (PDV)" },
  PERDA: { cor: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", bordaLateral: "border-l-4 border-red-500", icone: AlertTriangle, label: "Descarte/Avaria" },
  EDICAO: { cor: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", bordaLateral: "border-l-4 border-amber-500", icone: Edit3, label: "Edição de Produto" },
  ARQUIVAMENTO: { cor: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", bordaLateral: "border-l-4 border-slate-500", icone: Archive, label: "Arquivamento" }
};

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'SEMANA_PASSADA', label: 'Semana Passada' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
  { id: 'TUDO', label: 'Todo o Período' }
];

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const parseDataSpring = (dataRef) => {
    if (!dataRef) return null;
    if (Array.isArray(dataRef)) {
        const [y, m, d, h = 0, min = 0, s = 0] = dataRef;
        return new Date(y, m - 1, d, h, min, s);
    }
    if (typeof dataRef === 'string') {
        return new Date(dataRef.replace(' ', 'T'));
    }
    return new Date(dataRef);
};

const formatarDataHora = (dataRef) => {
  const d = parseDataSpring(dataRef);
  return !d || isNaN(d.getTime()) ? "-" : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function RelatorioMovimentacoes() {
  const navigate = useNavigate();
  
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [req, setReq] = useState({ loading: true, erro: null });
  const [filtros, setFiltros] = useState({ busca: "", tipo: "TODOS", periodo: "ESTE_MES" });
  const [paginacao, setPaginaAtual] = useState({ paginaAtual: 0, totalPaginas: 0, totalElementos: 0 });
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false); 
  const [unidade, setUnidade] = useState({});

  const usuario = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  const headersPadrao = useMemo(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${usuario.token || ""}`,
    "id-operador": String(usuario.id || usuario.idFuncionario || 1)
  }), [usuario]);

  useEffect(() => {
    const fetchUnidade = async () => {
      if (!usuario.token) return;
      try {
        const res = await fetch(`/api/unidades/dados-negocio`, { headers: headersPadrao });
        if (res.ok) setUnidade(await res.json());
      } catch (e) { 
        setUnidade({});
      }
    };
    fetchUnidade();
  }, [usuario, headersPadrao]);

  const obterIdUnidadeSeguro = useCallback(() => {
    if (unidade && (unidade.id || unidade.idUnidade)) return unidade.id || unidade.idUnidade;
    if (usuario && (usuario.unidadeId || usuario.idUnidade)) return usuario.unidadeId || usuario.idUnidade;
    if (usuario && usuario.unidade && (usuario.unidade.id || usuario.unidade.idUnidade)) return usuario.unidade.id || usuario.unidade.idUnidade;
    return 1;
  }, [unidade, usuario]);

  const carregarMovimentacoes = useCallback(async (paginaRequisitada = 0) => {
    setReq({ loading: true, erro: null });

    try {
      const uId = obterIdUnidadeSeguro();
      const url = `/api/estoque/movimentacoes?unidadeId=${uId}&periodo=${filtros.periodo}&page=${paginaRequisitada}&size=50`;
      
      const res = await fetch(url, { headers: headersPadrao });
      
      if (!res.ok) {
        throw new Error("Não foi possível carregar as movimentações. Verifique sua conexão com o servidor.");
      }
      
      const data = await res.json();
      
      let conteudo = [];
      if (data && Array.isArray(data.content)) {
          conteudo = data.content;
          setPaginaAtual({
              paginaAtual: data.number || 0,
              totalPaginas: data.totalPages || 1,
              totalElementos: data.totalElements || 0
          });
      } else if (Array.isArray(data)) {
          conteudo = data;
          setPaginaAtual({ paginaAtual: 0, totalPaginas: 1, totalElementos: data.length });
      } else if (data && data.data && Array.isArray(data.data.content)) {
          conteudo = data.data.content;
          setPaginaAtual({
            paginaAtual: data.data.number || 0,
            totalPaginas: data.data.totalPages || 1,
            totalElementos: data.data.totalElements || 0
        });
      }

      setMovimentacoes(conteudo);
    } catch (error) {
      setReq({ loading: false, erro: error.message });
      setMovimentacoes([]); 
    } finally {
      setReq(prev => ({ ...prev, loading: false }));
    }
  }, [filtros.periodo, headersPadrao, obterIdUnidadeSeguro]);

  useEffect(() => {
    if (!usuario.token) {
        setReq({ loading: false, erro: "Usuário não autenticado." });
        return;
    }
    carregarMovimentacoes(0);
  }, [carregarMovimentacoes, usuario.token]);

  const dadosFiltrados = useMemo(() => {
    const termo = filtros.busca.toLowerCase();
    return movimentacoes.filter(m => {
      const textoBase = `${m.produtoNome || ""} ${m.idProduto || ""} ${m.id || ""} ${m.observacao || ""}`.toLowerCase();
      const matchTexto = textoBase.includes(termo);
      const matchTipo = filtros.tipo === "TODOS" || String(m.tipoMovimentacao).toUpperCase() === filtros.tipo;
      return matchTexto && matchTipo;
    });
  }, [movimentacoes, filtros]);

  const atualizarFiltro = (campo, valor) => {
      setFiltros(prev => ({ ...prev, [campo]: valor }));
      if (campo === 'periodo') carregarMovimentacoes(0); 
  };

  const exportarCSV = () => {
    setShowExportMenu(false);
    const cabecalho = "\uFEFFData;Produto;ID;Tipo;Quantidade/Ação;Saldo Final;Detalhes/Motivo\n";
    const linhas = dadosFiltrados.map(m => {
      const d = parseDataSpring(m.dataMovimentacao);
      const dataStr = d ? d.toLocaleDateString('pt-BR') : "-";
      const tipo = CONFIG_MOV[String(m.tipoMovimentacao).toUpperCase()]?.label || m.tipoMovimentacao || "Outros"; 
      const qtde = m.quantidade !== undefined && m.quantidade !== null ? m.quantidade : "-"; 
      return `"${dataStr}";"${formatarTitleCase(m.produtoNome)}";"${m.idProduto || m.id || ''}";"${tipo}";"${qtde}";"${m.saldoFinal || '-'}";"${m.observacao || ''}"`;
    }).join("\n");

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Movimentacoes_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleExportarPDF = () => {
    setShowExportMenu(false);
    if (typeof gerarTemplateRelatorio !== "function") return;

    const tituloRelatorio = "RELATÓRIO DE MOVIMENTAÇÃO DE ESTOQUE";
    const labelPeriodo = `Período: ${OPCOES_PERIODO.find(o => o.id === filtros.periodo)?.label || filtros.periodo}`;
    const titulosTabela = ["Data/Hora", "Produto", "Movimentação", "Detalhes/Qtd", "Saldo Final"];
    
    const linhasTabela = dadosFiltrados.length > 0 
      ? dadosFiltrados.map(mov => {
          const cfg = CONFIG_MOV[String(mov.tipoMovimentacao).toUpperCase()] || { label: mov.tipoMovimentacao || "Outros" };
          const isPositivo = mov.quantidade > 0;
          const isInformativo = mov.quantidade === 0 || mov.quantidade === undefined || mov.quantidade === null;
          const qtdeStr = isInformativo ? '-' : isPositivo ? `+${mov.quantidade}` : mov.quantidade;
          const corQtde = isInformativo ? '#4b5563' : isPositivo ? '#10b981' : '#ef4444';

          return `
            <tr>
              <td>${formatarDataHora(mov.dataMovimentacao)}</td>
              <td><strong>${formatarTitleCase(mov.produtoNome)}</strong><br/><span style="font-size:9px;color:#9CA3AF">CÓD: ${mov.idProduto || mov.id || "N/A"}</span></td>
              <td style="text-align: center;">${cfg.label.toUpperCase()}</td>
              <td><strong style="color: ${corQtde};">${qtdeStr}</strong> ${mov.observacao ? `<span style="color:#6B7280;font-size:9px;"> • ${mov.observacao}</span>` : ''}</td>
              <td style="text-align: right;font-weight: bold;">${mov.saldoFinal !== undefined && mov.saldoFinal !== null ? mov.saldoFinal : '-'}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #6B7280; font-style: italic;">Nenhum registro encontrado para o período.</td></tr>`;

    gerarTemplateRelatorio({
      tituloRelatorio,
      periodo: labelPeriodo,
      resumoHtml: "",
      titulosTabela,
      linhasTabela,
      usuario,
      dadosNegocio: unidade,
      logoUrl: window.location.origin + iconeLogo 
    });
  };

  useEffect(() => {
    const fecharModais = (e) => {
      if (!e.target.closest('.modal-container')) {
        setShowPeriodoModal(false);
        setShowExportMenu(false);
      }
    };
    document.addEventListener("click", fecharModais);
    return () => document.removeEventListener("click", fecharModais);
  }, []);

  return (
    <div className="w-full h-full font-sans flex flex-col bg-transparent gap-6 p-4 animate-in fade-in duration-500 overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95 bg-transparent"
          >
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--bg-sidebar)' }} />
          </button>

          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-[26px] font-black italic uppercase tracking-tighter leading-none text-[var(--bg-sidebar)]">
              Relatório de Movimentação
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs md:text-sm font-medium tracking-wide opacity-60 text-[var(--text-main)]">
                Gestão e Rastreabilidade de Estoque (ERP)
              </p>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-auto modal-container">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={req.loading || dadosFiltrados.length === 0}
            className="w-full md:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-sidebar)' }}
          >
            Exportar <ChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
          </button>
          
          {showExportMenu && (
            <div className="absolute top-[110%] right-0 w-full md:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)]">
                <FileText size={16} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
              </button>
              <button onClick={exportarCSV} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
                <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[20px] p-4 flex flex-col xl:flex-row gap-4 shrink-0 shadow-sm w-full">
        <div className="flex w-full xl:w-auto gap-4 flex-col sm:flex-row">
          <div className="relative w-full sm:w-52 modal-container">
            <button 
              onClick={() => setShowPeriodoModal(!showPeriodoModal)}
              className="flex justify-between items-center w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-transparent transition-colors hover:border-[var(--bg-sidebar)] outline-none"
            >
              <div className="flex items-center gap-2">
                <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} />
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">
                  {OPCOES_PERIODO.find(o => o.id === filtros.periodo)?.label}
                </span>
              </div>
              <ChevronDown size={14} className={`opacity-40 transition-transform ${showPeriodoModal ? "rotate-180" : ""}`} />
            </button>

            {showPeriodoModal && (
              <div className="absolute top-[110%] left-0 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {OPCOES_PERIODO.map(op => (
                  <button
                    key={op.id}
                    onClick={() => {
                      atualizarFiltro("periodo", op.id);
                      setShowPeriodoModal(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                      filtros.periodo === op.id 
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

          <div className="relative w-full sm:w-72 xl:w-80">
            <input 
              type="text" 
              placeholder="Pesquisar produto ou ID..." 
              value={filtros.busca}
              onChange={(e) => atualizarFiltro("busca", e.target.value)}
              className="w-full h-full min-h-[44px] pl-10 pr-4 bg-transparent border border-[var(--border-color)] rounded-xl outline-none text-xs font-bold focus:border-[var(--bg-sidebar)] text-[var(--text-main)] transition-colors"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)]" />
          </div>
        </div>

        <div className="flex p-1 rounded-xl w-full xl:w-auto overflow-x-auto scrollbar-hide border border-[var(--border-color)]">
            <button 
              onClick={() => atualizarFiltro("tipo", "TODOS")}
              className={`px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${filtros.tipo === 'TODOS' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)] hover:opacity-100'}`}
            >
              Todos
            </button>
            {Object.keys(CONFIG_MOV).map(key => {
              const IconeTab = CONFIG_MOV[key].icone;
              return (
                <button 
                  key={key}
                  onClick={() => atualizarFiltro("tipo", key)}
                  className={`px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${filtros.tipo === key ? `${CONFIG_MOV[key].cor} ${CONFIG_MOV[key].bg} border ${CONFIG_MOV[key].border} shadow-sm` : 'opacity-40 text-[var(--text-main)] hover:opacity-100 border border-transparent'}`}
                >
                  <IconeTab size={14} /> {CONFIG_MOV[key].label}
                </button>
              );
            })}
        </div>
      </section>

      <main className="flex-1 min-h-0 w-full bg-transparent md:bg-[var(--bg-card)] md:border md:border-[var(--border-color)] rounded-[20px] overflow-hidden relative flex flex-col md:shadow-sm">
        {req.loading && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <History className="animate-pulse mb-4" size={40} style={{ color: 'var(--bg-sidebar)' }} />
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 text-[var(--text-main)]">Consultando...</p>
          </div>
        )}

        {!req.loading && req.erro && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-70 p-10 text-[var(--text-main)] text-center bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none">
            <AlertCircle size={40} className="mb-4 text-orange-500" />
            <p className="text-sm font-bold max-w-md">{req.erro}</p>
          </div>
        )}

        {!req.loading && !req.erro && dadosFiltrados.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-[var(--text-main)] text-center bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none">
            <History size={40} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Nenhum registro para este período.</p>
          </div>
        )}

        {!req.loading && !req.erro && dadosFiltrados.length > 0 && (
          <>
            <div className="hidden md:block flex-1 w-full overflow-y-auto custom-slim-scroll">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm backdrop-blur-sm">
                  <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                    <th className="px-6 py-5">Data/Hora</th>
                    <th className="px-6 py-5">Produto</th>
                    <th className="px-6 py-5 text-center">Movimentação</th>
                    <th className="px-6 py-5">Detalhes/Qtd</th>
                    <th className="px-6 py-5 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {dadosFiltrados.map((mov, index) => {
                    const chave = String(mov.tipoMovimentacao).toUpperCase();
                    const cfg = CONFIG_MOV[chave] || { bg: "bg-gray-500/10", cor: "text-gray-500", border: "border-gray-500/20", bordaLateral: "border-l-4 border-gray-500", label: mov.tipoMovimentacao || "Outros", icone: History };
                    const Icone = cfg.icone;
                    const isPositivo = mov.quantidade > 0;
                    const isInformativo = mov.quantidade === 0 || mov.quantidade === undefined || mov.quantidade === null;

                    return (
                      <tr key={mov.id || index} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap group">
                        <td className={`px-6 py-5 opacity-60 tabular-nums text-xs ${cfg.bordaLateral}`}>
                          {formatarDataHora(mov.dataMovimentacao)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold opacity-90">{formatarTitleCase(mov.produtoNome)}</span>
                            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-0.5">CÓD: {mov.idProduto || mov.id || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${cfg.bg} ${cfg.cor} ${cfg.border}`}>
                            <Icone size={12} strokeWidth={3} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className={`tabular-nums text-sm font-black ${isInformativo ? 'text-[var(--text-main)] opacity-50' : isPositivo ? 'text-green-500' : 'text-red-500'}`}>
                              {isInformativo ? '-' : isPositivo ? `+${mov.quantidade}` : mov.quantidade}
                            </span>
                            {mov.observacao && <span className="text-xs font-medium opacity-60 truncate max-w-[200px]" title={mov.observacao}>• {mov.observacao}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right tabular-nums text-sm opacity-90">
                           {mov.saldoFinal !== undefined && mov.saldoFinal !== null ? <>{mov.saldoFinal} <span className="text-[10px] font-black opacity-40 uppercase tracking-widest ml-1">un</span></> : <span className="opacity-30">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex md:hidden flex-col gap-3 w-full overflow-y-auto custom-slim-scroll flex-1 min-h-0 px-1 py-2">
              {dadosFiltrados.map((mov, index) => {
                const chave = String(mov.tipoMovimentacao).toUpperCase();
                const cfg = CONFIG_MOV[chave] || { bg: "bg-gray-500/10", cor: "text-gray-500", border: "border-gray-500/20", bordaLateral: "border-l-4 border-gray-500", label: mov.tipoMovimentacao || "Outros", icone: History };
                const Icone = cfg.icone;
                const isPositivo = mov.quantidade > 0;
                const isInformativo = mov.quantidade === 0 || mov.quantidade === undefined || mov.quantidade === null;

                return (
                  <div key={mov.id || index} className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm overflow-hidden ${cfg.bordaLateral}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-[var(--text-main)] truncate">{formatarTitleCase(mov.produtoNome)}</span>
                        <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">CÓD: {mov.idProduto || mov.id || "N/A"}</span>
                      </div>
                      <span className={`shrink-0 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm ${cfg.bg} ${cfg.cor} ${cfg.border}`}>
                        <Icone size={10} strokeWidth={3} /> {cfg.label}
                      </span>
                    </div>

                    {mov.observacao && (
                      <div className="bg-black/5 dark:bg-white/5 rounded-lg p-2 px-3 border border-[var(--border-color)]">
                        <p className="text-[11px] font-medium opacity-70 text-[var(--text-main)] leading-tight line-clamp-2">
                          {mov.observacao}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-end pt-2 border-t border-[var(--border-color)]">
                       <span className="text-[11px] font-bold opacity-60 text-[var(--text-main)] tabular-nums">{formatarDataHora(mov.dataMovimentacao)}</span>
                       
                       <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest">QTD:</span>
                            <span className={`tabular-nums text-sm font-black ${isInformativo ? 'text-[var(--text-main)] opacity-50' : isPositivo ? 'text-green-500' : 'text-red-500'}`}>
                              {isInformativo ? '-' : isPositivo ? `+${mov.quantidade}` : mov.quantidade}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-main)] opacity-70 mt-0.5">
                            Saldo: {mov.saldoFinal !== undefined && mov.saldoFinal !== null ? mov.saldoFinal : '-'}
                          </span>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {paginacao.totalPaginas > 1 && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] mt-auto shrink-0 z-10">
                <span className="text-xs font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">
                  Página {paginacao.paginaAtual + 1} de {paginacao.totalPaginas}
                </span>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => carregarMovimentacoes(paginacao.paginaAtual - 1)}
                    disabled={paginacao.paginaAtual === 0 || req.loading}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[var(--text-main)] outline-none"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => carregarMovimentacoes(paginacao.paginaAtual + 1)}
                    disabled={paginacao.paginaAtual === paginacao.totalPaginas - 1 || req.loading}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[var(--text-main)] outline-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}