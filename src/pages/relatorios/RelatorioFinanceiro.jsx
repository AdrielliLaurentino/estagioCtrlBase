import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Search, CalendarDays, ChevronDown, FileText, Table as TableIcon,
  TrendingUp, Inbox, BarChart2, AlertCircle, PieChart as PieChartIcon,
  ListIcon, Wallet, RefreshCw 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

import { gerarTemplateRelatorio } from "../../utils/geradorPdf";
import logoImage from "../../assets/icons/logobase.png";

const MODULO_FINANCEIRO = {
  subs: [
    { id: 'caixas', nome: 'Fluxo de Caixas', icone: Inbox },
    { id: 'contas_receber', nome: 'A Receber (Crediário)', icone: TrendingUp }
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

const CORES_GRAFICO = ['var(--bg-sidebar)', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

const formatarMoeda = (v = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatarData = (ds) => {
  if (!ds) return "-";
  const d = new Date(ds);
  return isNaN(d.getTime()) ? ds : d.toLocaleDateString('pt-BR');
};
const formatarTitleCase = (text) => {
  if (!text) return "";
  return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function RelatorioFinanceiro() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [usuario, setUsuario] = useState({});
  const [unidade, setUnidade] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filtros, setFiltros] = useState({
    subRelatorio: location.state?.abaAtiva || MODULO_FINANCEIRO.subs[0].id,
    modoVisao: "tabela",
    periodo: "ESTE_MES",
  });
  
  const [busca, setBusca] = useState("");
  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [], resumo: { entradas: 0, saidas: 0, saldo: 0 }});

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario")) || {};
      setUsuario(u);
    } catch { setUsuario({}); }
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
      } catch (e) { console.error("Unidade não identificada:", e); }
    };
    fetchUnidade();
  }, [usuario, headersPadrao]);

  const setFiltro = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }));

  const fetchData = useCallback(async () => {
    setReq({ loading: true, erro: null });
    try {
      const url = filtros.subRelatorio === 'caixas' 
        ? `/api/caixas/relatorio?periodo=${filtros.periodo}` 
        : `/api/contas-receber/relatorio?periodo=${filtros.periodo}`;

      const res = await fetch(url, { headers: headersPadrao });
      
      if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
             throw new Error("Sessão expirada ou acesso restrito. Faça login novamente.");
          }
          setDados({ tabela: [], resumo: { entradas: 0, saidas: 0, saldo: 0 }});
          setReq({ loading: false, erro: res.status === 404 ? "Módulo em desenvolvimento." : "Ajuste os filtros de busca." });
          return;
      }
      
      const d = await res.json();
      const listaRaw = Array.isArray(d) ? d : (d.caixas || d.content || []);

      let entradas = 0;
      let saidas = 0;

      const listaMapeada = listaRaw.map(item => {
        if (filtros.subRelatorio === 'caixas') {
          const dinheiro = Number(item.conferido_dinheiro || item.conferidoDinheiro || 0);
          const pix = Number(item.conferido_pix || item.conferidoPix || 0);
          const cartoes = Number(item.conferido_debito || item.conferidoDebito || 0) + Number(item.conferido_credito || item.conferidoCredito || 0);
          const crediario = Number(item.conferido_crediario || item.conferidoCrediario || 0);
          const faturamento = dinheiro + pix + cartoes + crediario;

          return {
            ...item,
            id: item.id_caixa || item.idCaixa || item.id,
            data: item.data_fechamento || item.dataFechamento || item.data_abertura || item.dataAbertura || item.data,
            operador: item.nomeFuncionario || item.operador || "Operador",
            dinheiro, pix, cartoes, crediario, faturamento,
            abertura: item.saldo_inicial || item.saldoInicial || item.abertura || 0,
            quebra: item.quebra_de_caixa || item.quebraDeCaixa || 0,
            saldoFinal: Number(item.saldo_inicial || item.saldoInicial || 0) + faturamento,
            status: item.status || "Aberto"
          };
        }
        return item;
      });

      listaMapeada.forEach(item => {
        if (filtros.subRelatorio === 'caixas') {
          entradas += Number(item.faturamento || 0);
          saidas += Number(item.totalSaidas || item.sangrias || 0); 
        } else if (filtros.subRelatorio === 'contas_receber') {
          entradas += Number(item.valor || item.valor_total || item.valorTotal || 0);
        }
      });

      if (d.resumo && filtros.subRelatorio === 'caixas') {
        entradas = d.resumo.totalConferido || entradas;
      }

      setDados({ 
        tabela: listaMapeada, 
        resumo: { entradas, saidas, saldo: entradas - saidas } 
      });
      setReq({ loading: false, erro: null });

    } catch (e) {
      setDados({ tabela: [], resumo: { entradas: 0, saidas: 0, saldo: 0 }});
      setReq({ loading: false, erro: null }); 
    }
  }, [filtros.subRelatorio, filtros.periodo, headersPadrao]);

  useEffect(() => { 
    if(usuario.token) fetchData(); 
  }, [fetchData, usuario.token]);

  const dadosFiltrados = useMemo(() => {
    if (!busca) return dados.tabela;
    const lowerBusca = busca.toLowerCase();
    return dados.tabela.filter(m => 
      (m.descricao || "").toLowerCase().includes(lowerBusca) || 
      (m.operador || "").toLowerCase().includes(lowerBusca) ||
      (m.categoria || "").toLowerCase().includes(lowerBusca) ||
      (m.nomeCliente || "").toLowerCase().includes(lowerBusca)
    );
  }, [dados.tabela, busca]);

  const exportarExcel = () => {
    setShowExportMenu(false);
    
    let csvString = "\uFEFF";
    
    if (filtros.subRelatorio === 'caixas') {
      csvString += "Data;Operador;Status;Dinheiro;PIX;Cartões;Crediário;Faturamento Total;Quebra de Caixa\n";
      dadosFiltrados.forEach(m => csvString += `"${formatarData(m.data)}";"${formatarTitleCase(m.operador)}";"${m.status}";"${formatarMoeda(m.dinheiro)}";"${formatarMoeda(m.pix)}";"${formatarMoeda(m.cartoes)}";"${formatarMoeda(m.crediario)}";"${formatarMoeda(m.faturamento)}";"${formatarMoeda(m.quebra)}"\n`);
    } else {
      csvString += "Vencimento;Descrição/Cliente;Status;Valor\n";
      dadosFiltrados.forEach(m => csvString += `"${formatarData(m.data || m.dataCriacao)}";"${formatarTitleCase(m.descricao || m.nomeCliente)}";"${m.status || m.statusConta}";"${formatarMoeda(m.valor || m.valorTotal)}"\n`);
    }

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_${filtros.subRelatorio}_${Date.now()}.csv`;
    link.click();
  };

  const handleExportarPDF = () => {
    setShowExportMenu(false);

    const subAtiva = MODULO_FINANCEIRO.subs.find(s => s.id === filtros.subRelatorio);
    const tituloRelatorio = `AUDITORIA FINANCEIRA - ${subAtiva?.nome || "GERAL"}`;
    const labelPeriodo = `Período: ${OPCOES_PERIODO.find(o => o.id === filtros.periodo)?.label || "Personalizado"}`;

    let titulosTabela = [];
    if (filtros.subRelatorio === 'caixas') titulosTabela = ["Data", "Operador", "Din/PIX", "Cartões", "Crediário", "Total"];
    else titulosTabela = ["Data", "Cliente", "Status", "Valor"];

    const linhasTabela = dadosFiltrados.length > 0
      ? dadosFiltrados.map(v => {
          if (filtros.subRelatorio === 'caixas') {
            return `
              <tr>
                <td>${formatarData(v.data)}</td>
                <td>${formatarTitleCase(v.operador)}</td>
                <td class="right">${formatarMoeda(v.dinheiro + v.pix)}</td>
                <td class="right">${formatarMoeda(v.cartoes)}</td>
                <td class="right" style="color: #F97316;">${formatarMoeda(v.crediario)}</td>
                <td class="right" style="font-weight: 700;">${formatarMoeda(v.faturamento)}</td>
              </tr>
            `;
          } else {
            return `
              <tr>
                <td>${formatarData(v.data || v.dataCriacao)}</td>
                <td>${formatarTitleCase(v.descricao || v.nomeCliente)}</td>
                <td style="text-align: center;">${formatarTitleCase(v.status || v.statusConta)}</td>
                <td class="right" style="color: #10B981; font-weight: 700;">${formatarMoeda(v.valor || v.valorTotal)}</td>
              </tr>
            `;
          }
        }).join("")
      : `<tr><td colspan="${titulosTabela.length}" style="text-align: center; padding: 20px; color: #6B7280; font-style: italic;">Nenhuma movimentação financeira encontrada para este período.</td></tr>`;

    const resumoHtml = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Entradas / Faturamento</div>
          <div style="font-size: 15pt; font-weight: 900; color: #10B981;">${formatarMoeda(dados.resumo.entradas)}</div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Saídas / Sangrias</div>
          <div style="font-size: 15pt; font-weight: 900; color: #DC2626;">${formatarMoeda(dados.resumo.saidas)}</div>
        </div>
        <div>
          <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #4B5563; margin-bottom: 5px;">Saldo Atual</div>
          <div style="font-size: 15pt; font-weight: 900; color: ${dados.resumo.saldo >= 0 ? '#111827' : '#F97316'};">${formatarMoeda(dados.resumo.saldo)}</div>
        </div>
      </div>
    `;

    gerarTemplateRelatorio({
      tituloRelatorio, periodo: labelPeriodo, resumoHtml, titulosTabela, linhasTabela, usuario, dadosNegocio: unidade, logoUrl: window.location.origin + logoImage
    });
  };

  const chartData = useMemo(() => {
    if (filtros.subRelatorio === 'caixas') return dadosFiltrados.map(d => ({ name: (d.operador || "Caixa").split(' ')[0], value: d.faturamento || 0 })).slice(0, 10);
    
    const groups = dadosFiltrados.reduce((acc, curr) => {
      const cat = curr.status || curr.statusConta || "Pendente";
      acc[cat] = (acc[cat] || 0) + Number(curr.valor || curr.valorTotal || 0);
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [dadosFiltrados, filtros.subRelatorio]);

  return (
    <div className="w-full h-full flex flex-col gap-6 p-1 pb-20 lg:pb-0 px-3 animate-in fade-in duration-500 bg-transparent">
      
      <header className="flex flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6">
        <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
          <button onClick={() => navigate('/relatorios')} className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl hover:text-emerald-500 transition-all active:scale-95 shadow-sm hidden md:flex">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div className="w-14 h-14 flex items-center justify-center">
              <BarChart2 className="w-8 h-8 text-[var(--bg-sidebar)]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--bg-sidebar)]">Relatório Financeiro</h1>
            <p className="text-sm font-medium opacity-60 text-[var(--text-main)]">Detalhamento de caixas e crediário.</p>
          </div>
        </div>

        <div className="relative w-full lg:w-auto">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)} disabled={req.loading}
            className="w-full lg:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-sidebar)' }}
          >
            Exportar <ChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-full sm:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <button onClick={handleExportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase hover:bg-black/5 transition-colors border-b border-[var(--border-color)] text-[var(--text-main)]">
                <FileText size={16} className="text-[var(--bg-sidebar)]" /> Imprimir PDF
              </button>
              <button onClick={exportarExcel} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase hover:bg-black/5 transition-colors text-[var(--text-main)]">
                <TableIcon size={16} className="text-emerald-500" /> Baixar Excel
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-4 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm shrink-0">
        <div className="flex w-full xl:w-auto gap-4 flex-col sm:flex-row items-center">
          <div className="flex items-center gap-2 px-5 py-3 border border-[var(--border-color)] rounded-xl w-full sm:w-auto">
            <CalendarDays size={16} className="text-[var(--bg-sidebar)] shrink-0" />
            <select value={filtros.periodo} onChange={(e) => setFiltro('periodo', e.target.value)} className="bg-transparent font-black uppercase text-xs outline-none w-full text-[var(--text-main)] cursor-pointer">
              {OPCOES_PERIODO.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}
            </select>
          </div>
          <div className="relative w-full sm:w-72">
            <input type="text" placeholder="Pesquisar registro..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full min-h-[44px] pl-12 pr-4 bg-transparent border border-[var(--border-color)] rounded-xl text-xs font-bold focus:border-[var(--bg-sidebar)] text-[var(--text-main)] outline-none" />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)]" />
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto w-full xl:w-auto custom-slim-scroll">
          {MODULO_FINANCEIRO.subs.map(s => (
            <button 
              key={s.id} onClick={() => setFiltro('subRelatorio', s.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase border transition-all whitespace-nowrap shrink-0"
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

        <div className="flex p-1 rounded-xl border border-[var(--border-color)] shrink-0">
          <button onClick={() => setFiltro('modoVisao', 'tabela')} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${filtros.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white' : 'opacity-40 text-[var(--text-main)]'}`}><ListIcon size={16} /></button>
          <button onClick={() => setFiltro('modoVisao', 'grafico')} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${filtros.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white' : 'opacity-40 text-[var(--text-main)]'}`}><PieChartIcon size={16} /></button>
        </div>
      </section>

      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            {[
              { label: 'Entradas', valor: formatarMoeda(dados.resumo.entradas), cor: 'text-emerald-500' },
              { label: 'Saídas', valor: formatarMoeda(dados.resumo.saidas), cor: 'text-red-500' },
              { label: 'Saldo', valor: formatarMoeda(dados.resumo.saldo), cor: dados.resumo.saldo >= 0 ? 'text-[var(--bg-sidebar)]' : 'text-orange-500' }
            ].map((card, idx) => (
                <div key={idx} className="py-6 px-4 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                    <h2 className="text-xs font-black uppercase opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className={`text-2xl font-black ${card.cor}`}>{card.valor}</p>
                </div>
            ))}
        </section>
      )}

      <main className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden relative flex flex-col shadow-sm min-h-[400px]">
        {req.loading ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-sm">
            <RefreshCw className="animate-spin mb-4 text-[var(--bg-sidebar)]" size={40} />
            <p className="text-xs font-black uppercase opacity-50 text-[var(--text-main)]">Sincronizando...</p>
          </div>
        ) : req.erro ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-60 text-[var(--text-main)]">
              <AlertCircle size={48} className="mb-4 text-orange-500" />
              <p className="text-sm font-black uppercase text-center max-w-xs">{req.erro}</p>
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-40 text-[var(--text-main)]">
              <Wallet size={48} className="mb-4" />
              <p className="text-xs font-black uppercase text-center">Nenhum dado financeiro encontrado no período.</p>
          </div>
        ) : filtros.modoVisao === 'grafico' ? (
          <div className="flex-1 p-8 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {filtros.subRelatorio === 'caixas' ? (
                <BarChart data={chartData} margin={{ bottom: 50 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} height={100} tickFormatter={(val) => val.length > 20 ? `${val.substring(0, 20)}...` : val} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="var(--bg-sidebar)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie data={chartData} innerRadius="40%" outerRadius="80%" paddingAngle={8} dataKey="value" stroke="none">
                    {chartData.map((_, i) => <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />)}
                  </Pie>
                  <Tooltip cursor={false} content={<CustomTooltip />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto custom-slim-scroll">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-md">
                <tr className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] opacity-70">
                  {filtros.subRelatorio === 'caixas' && (
                    <><th className="p-5">Data</th><th className="p-5">Operador</th><th className="p-5 text-right">Din/PIX</th><th className="p-5 text-right">Cartões</th><th className="p-5 text-right text-orange-500">Crediário</th><th className="p-5 text-right">Total</th><th className="p-5 text-center">Status</th></>
                  )}
                  {filtros.subRelatorio === 'contas_receber' && (
                    <><th className="p-5">Data / Vencimento</th><th className="p-5">Cliente</th><th className="p-5 text-center">Status</th><th className="p-5 text-right">Valor</th></>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dadosFiltrados.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                    
                    {filtros.subRelatorio === 'caixas' && (
                      <>
                        <td className="p-5 opacity-70">{formatarData(item.data)}</td>
                        <td className="p-5">{formatarTitleCase(item.operador)}</td>
                        <td className="p-5 text-right opacity-80 tabular-nums">{formatarMoeda(item.dinheiro + item.pix)}</td>
                        <td className="p-5 text-right opacity-80 tabular-nums">{formatarMoeda(item.cartoes)}</td>
                        <td className="p-5 text-right text-orange-500 tabular-nums">{formatarMoeda(item.crediario)}</td>
                        <td className="p-5 text-right font-black text-[var(--bg-sidebar)] tabular-nums">{formatarMoeda(item.faturamento)}</td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${item.status === 'FECHADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}

                    {filtros.subRelatorio === 'contas_receber' && (
                      <>
                        <td className="p-5 opacity-70">{formatarData(item.data || item.dataCriacao)}</td>
                        <td className="p-5">{formatarTitleCase(item.descricao || item.nomeCliente)}</td>
                        <td className="p-5 text-center">
                           <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${(item.status || item.statusConta) === 'QUITADA' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                             {item.status || item.statusConta || "Pendente"}
                           </span>
                        </td>
                        <td className="p-5 text-right font-black tabular-nums text-emerald-500">
                          +{formatarMoeda(item.valor || item.valorTotal)}
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
      <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">{label}</p>
      <p className="text-sm font-black tabular-nums text-[var(--bg-sidebar)]">Valor: {formatarMoeda(payload[0].value)}</p>
    </div>
  );
};