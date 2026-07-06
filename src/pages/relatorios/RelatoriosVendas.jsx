import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  TrendingUp, Users, CreditCard, ListIcon, Package, PieChart as PieChartIcon,
  CalendarDays, FileText, Table as TableIcon, ChevronDown, RefreshCw, AlertCircle, Box, ArrowLeft
} from "lucide-react";

import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

import iconeLogo from "../../assets/icons/logo.png"; 
import { gerarTemplateRelatorio } from "../../utils/geradorPdf";

const MODULO_VENDAS = {
  subs: [
    { id: 'consulta_vendas', nome: 'Consulta Geral', icone: ListIcon },
    { id: 'produtos_vendidos', nome: 'Produtos', icone: Package },
    { id: 'vendas_vendedor', nome: 'Vendedores', icone: Users },
    { id: 'vendas_pagamento', nome: 'Pagamentos', icone: CreditCard },
  ]
};

const CORES_PIE = ['var(--bg-sidebar)', '#3B82F6', '#10B981', '#8B5CF6', '#64748B'];

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
  { id: 'TUDO', label: 'Todo o Período' },
  { id: 'CUSTOM', label: 'Personalizado' }
];

const formatarMoeda = (valor = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
const parseDataSpring = (dataRef) => {
    if (!dataRef) return null;

    if (Array.isArray(dataRef)) {
        const [y, m, d, h = 0, min = 0] = dataRef;
        return new Date(y, m - 1, d, h, min);
    }

    if (typeof dataRef === 'string') {
        const regexCustomFormat = /^(\d{2})-(\d{2})-(\d{4})(?:\s(\d{2}):(\d{2}):(\d{2}))?$/;
        const match = dataRef.match(regexCustomFormat);
        
        if (match) {
            const [, dia, mes, ano, hora = 0, minuto = 0, segundo = 0] = match;
            return new Date(ano, mes - 1, dia, hora, minuto, segundo);
        }
    }
    const fallbackDate = new Date(dataRef);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

const formatarDataHora = (dataRef) => {
  const d = parseDataSpring(dataRef);
  return !d ? "-" : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const getIsoDate = (d) => {
    if (!d || isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RelatoriosVendas() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [usuario, setUsuario] = useState({}); 
  const [dadosNegocio, setDadosNegocio] = useState(null);
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const backEndDisponivel = useRef(true); 
  
  const [filtros, setFiltros] = useState(() => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
      subRelatorio: location.state?.abaAtiva || MODULO_VENDAS.subs[0].id,
      modoVisao: "tabela",
      periodoId: 'ESTE_MES',
      dataInicio: getIsoDate(primeiroDiaMes),
      dataFim: getIsoDate(ultimoDiaMes)
    };
  });
  
  const [req, setReq] = useState({ loading: true, erro: null });
  const [dados, setDados] = useState({ 
    tabela: [], 
    resumo: { total: 0, quantidade: 0, ticketMedio: 0 },
    totaisPagamento: { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, CREDIARIO: 0 }
  });

  useEffect(() => {
    try { setUsuario(JSON.parse(localStorage.getItem("usuario")) || {}); } 
    catch { setUsuario({}); }
  }, []);

  const headersPadrao = useMemo(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${usuario.token || ""}`,
    "id-operador": String(usuario.id || usuario.idFuncionario || 1)
  }), [usuario]);

  useEffect(() => {
     const fetchDadosEmpresa = async () => {
         if (!usuario.token) return;
         try {
             const res = await fetch("/api/unidades/dados-negocio", { headers: headersPadrao });
             if (res.ok) setDadosNegocio(await res.json());
         } catch (e) { setDadosNegocio(null); }
     };
     fetchDadosEmpresa();
  }, [usuario.token, headersPadrao]);

  const aplicarPeriodoRapido = useCallback((idPeriodo) => {
    const hoje = new Date();
    let dInicio = new Date();
    let dFim = new Date();

    switch (idPeriodo) {
      case 'HOJE': break;
      case 'ONTEM':
        dInicio.setDate(hoje.getDate() - 1);
        dFim.setDate(hoje.getDate() - 1);
        break;
      case 'ESTA_SEMANA':
        dInicio.setDate(hoje.getDate() - hoje.getDay()); 
        break;
      case 'ESTE_MES':
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'MES_PASSADO':
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case 'TUDO':
        dInicio = new Date(2000, 0, 1);
        dFim = new Date(hoje.getFullYear() + 5, 11, 31);
        break;
      default: return;
    }

    setFiltros(prev => ({ 
      ...prev, 
      periodoId: idPeriodo, 
      dataInicio: idPeriodo === 'CUSTOM' ? prev.dataInicio : getIsoDate(dInicio),
      dataFim: idPeriodo === 'CUSTOM' ? prev.dataFim : getIsoDate(dFim)
    }));
  }, []);

  useEffect(() => {
    if (filtros.subRelatorio === 'consulta_vendas') {
        setFiltros(prev => ({ ...prev, modoVisao: "tabela" }));
    }
  }, [filtros.subRelatorio]);

  const fetchData = useCallback(async () => {
    if (!backEndDisponivel.current) return;
    setReq({ loading: true, erro: null });
    
    try {
      const response = await fetch(`/api/vendas`, { headers: headersPadrao });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            backEndDisponivel.current = false;
            throw new Error("Acesso Negado. Verifique suas permissões de visualização.");
        }
        throw new Error("Erro de comunicação com o servidor.");
      }
      
      const vendasBrutas = await response.json();
      const listaReal = Array.isArray(vendasBrutas) ? vendasBrutas : (vendasBrutas.content || []);
      
      const vendasFiltradas = listaReal.filter(v => {
          const dtObj = parseDataSpring(v.dataVenda || v.dataHora || v.dataCriacao || v.criadoEm || v.data);
          if (!dtObj) return false;
          
          const dtIso = getIsoDate(dtObj);
          return dtIso >= filtros.dataInicio && dtIso <= filtros.dataFim;
      });

      let totalArrecadado = 0;
      const totaisPagamento = { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, CREDIARIO: 0 };
      
      vendasFiltradas.forEach(v => {
          const valor = Number(v.valorTotal || v.total || v.valorLiquido || 0);
          totalArrecadado += valor;

          const metodoStr = String(v.metodoPagamento || v.formaPagamento || v.tipoPagamento || "OUTROS").toUpperCase();
          if (metodoStr.includes("PIX")) totaisPagamento.PIX += valor;
          else if (metodoStr.includes("DINHEIRO")) totaisPagamento.DINHEIRO += valor;
          else if (metodoStr.includes("CREDITO") || metodoStr.includes("CRÉDITO")) totaisPagamento.CREDITO += valor;
          else if (metodoStr.includes("DEBITO") || metodoStr.includes("DÉBITO")) totaisPagamento.DEBITO += valor;
          else if (metodoStr.includes("CREDIARIO") || metodoStr.includes("CREDIÁRIO") || metodoStr.includes("A_PRAZO")) totaisPagamento.CREDIARIO += valor;
          else {
             if(!totaisPagamento[metodoStr]) totaisPagamento[metodoStr] = 0;
             totaisPagamento[metodoStr] += valor;
          }
      });

      const qtdVendas = vendasFiltradas.length;
      const resumo = {
          total: totalArrecadado,
          quantidade: qtdVendas,
          ticketMedio: qtdVendas > 0 ? totalArrecadado / qtdVendas : 0
      };

      let tabelaProcessada = [];
      if (filtros.subRelatorio === 'consulta_vendas') {
          tabelaProcessada = vendasFiltradas.sort((a, b) => {
             const dA = parseDataSpring(a.dataVenda || a.dataHora)?.getTime() || 0;
             const dB = parseDataSpring(b.dataVenda || b.dataHora)?.getTime() || 0;
             return dB - dA;
          });
      } 
      else if (filtros.subRelatorio === 'vendas_vendedor') {
          const agrupado = vendasFiltradas.reduce((acc, v) => {
              const nome = v.nomeFuncionario || v.vendedor || "Não Informado";
              if (!acc[nome]) acc[nome] = { nome, qtd: 0, total: 0 };
              acc[nome].qtd += 1;
              acc[nome].total += Number(v.valorTotal || v.total || 0);
              return acc;
          }, {});
          tabelaProcessada = Object.values(agrupado).sort((a, b) => b.total - a.total);
      }
      else if (filtros.subRelatorio === 'vendas_pagamento') {
          const agrupado = vendasFiltradas.reduce((acc, v) => {
              const metodo = v.metodoPagamento || v.formaPagamento || "OUTROS";
              if (!acc[metodo]) acc[metodo] = { nome: metodo, total: 0, qtd: 0 }; 
              acc[metodo].qtd += 1;
              acc[metodo].total += Number(v.valorTotal || v.total || 0);
              return acc;
          }, {});
          tabelaProcessada = Object.values(agrupado).sort((a, b) => b.total - a.total);
      }
      else if (filtros.subRelatorio === 'produtos_vendidos') {
          const agrupado = {};
          vendasFiltradas.forEach(venda => {
              const listaItens = venda.itens || venda.itensVenda || venda.produtos || [];
              listaItens.forEach(item => {
                  const nome = item.nomeProduto || item.produto || "Produto Genérico";
                  if (!agrupado[nome]) agrupado[nome] = { nome, qtd: 0, total: 0 };
                  agrupado[nome].qtd += Number(item.quantidade || 1);
                  agrupado[nome].total += Number(item.subtotal || item.valorTotal || item.preco || 0);
              });
          });
          tabelaProcessada = Object.values(agrupado).sort((a, b) => b.qtd - a.qtd).slice(0, 20); 
      }

      setDados({ tabela: tabelaProcessada, resumo, totaisPagamento });
      setReq({ loading: false, erro: null });

    } catch (error) {
      setDados({ tabela: [], resumo: { total: 0, quantidade: 0, ticketMedio: 0 }, totaisPagamento: {} });
      setReq({ loading: false, erro: error.message });
    }
  }, [filtros.dataInicio, filtros.dataFim, filtros.subRelatorio, headersPadrao]);

  useEffect(() => { 
    if(usuario.token) fetchData(); 
  }, [fetchData, usuario.token]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (!e.target.closest('.modal-container-export')) setShowExportMenu(false);
      if (!e.target.closest('.modal-container-periodo')) setShowPeriodoModal(false);
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const exportarExcel = () => {
    setShowExportMenu(false);
    let csv = "\uFEFF"; 
    const { subRelatorio } = filtros;

    if (subRelatorio === 'consulta_vendas') {
      csv += "Data;Código da Venda;Cliente;Vendedor;Forma de Pagamento;Valor Total\n";
      dados.tabela.forEach(v => {
        const dStr = formatarDataHora(v.dataVenda || v.dataHora);
        const id = v.idVenda || v.id || "-";
        const c = formatarTitleCase(v.nomeCliente || v.cliente || 'Avulso');
        const f = formatarTitleCase(v.nomeFuncionario || v.vendedor || 'Sistema');
        const p = formatarTitleCase(v.metodoPagamento || v.formaPagamento || '-');
        const t = formatarMoeda(v.valorTotal || v.total);
        csv += `"${dStr}";"${id}";"${c}";"${f}";"${p}";"${t}"\n`;
      });
    } else if (subRelatorio === 'produtos_vendidos') {
      csv += "Produto;Volume Vendido;Faturamento Bruto\n";
      dados.tabela.forEach(v => csv += `"${formatarTitleCase(v.nome)}";"${v.qtd}";"${formatarMoeda(v.total)}"\n`);
    } else {
      csv += "Categoria/Operador;Quantidade de Operações;Faturamento Total\n";
      dados.tabela.forEach(v => csv += `"${formatarTitleCase(v.nome)}";"${v.qtd}";"${formatarMoeda(v.total)}"\n`);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Vendas_${subRelatorio}_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleExportarPDF = () => {
    setShowExportMenu(false);
    if (typeof gerarTemplateRelatorio !== "function") {
       alert("O utilitário de PDF não está disponível no momento.");
       return;
    }

    const subAtiva = MODULO_VENDAS.subs.find(s => s.id === filtros.subRelatorio);
    const tituloRelatorio = `RELATÓRIO DE VENDAS - ${subAtiva?.nome.toUpperCase() || "GERAL"}`;
    const labelPeriodo = `Período: ${filtros.dataInicio.split('-').reverse().join('/')} até ${filtros.dataFim.split('-').reverse().join('/')}`;

    let titulosTabela = [];
    if (filtros.subRelatorio === 'consulta_vendas') titulosTabela = ["ID", "Data", "Cliente", "Vendedor", "Pagto", "Total"];
    else if (filtros.subRelatorio === 'produtos_vendidos') titulosTabela = ["Produto", "Volume (UN)", "Faturamento Bruto"];
    else titulosTabela = ["Categoria / Operador", "Quantidade", "Faturamento"];

    const linhasTabela = dados.tabela.length > 0 
      ? dados.tabela.map(v => {
          if (filtros.subRelatorio === 'consulta_vendas') {
            return `
              <tr>
                <td style="font-weight: 700;">#${v.idVenda || v.id || "-"}</td>
                <td>${formatarDataHora(v.dataVenda || v.dataHora)}</td>
                <td>${formatarTitleCase(v.nomeCliente || v.cliente || 'Avulso')}</td>
                <td>${formatarTitleCase(v.nomeFuncionario || v.vendedor)}</td>
                <td style="text-align: center;">${formatarTitleCase(v.metodoPagamento || v.formaPagamento)}</td>
                <td class="right" style="font-weight: 700;">${formatarMoeda(v.valorTotal || v.total)}</td>
              </tr>
            `;
          } else if (filtros.subRelatorio === 'produtos_vendidos') {
            return `
              <tr>
                <td>${formatarTitleCase(v.nome)}</td>
                <td class="right">${v.qtd} un.</td>
                <td class="right" style="font-weight: 700;">${formatarMoeda(v.total)}</td>
              </tr>
            `;
          } else {
            return `
              <tr>
                <td>${formatarTitleCase(v.nome)}</td>
                <td class="right">${v.qtd} op.</td>
                <td class="right" style="font-weight: 700;">${formatarMoeda(v.total)}</td>
              </tr>
            `;
          }
        }).join("")
      : `<tr><td colspan="${titulosTabela.length}" style="text-align: center; padding: 20px; color: #6B7280; font-style: italic;">Nenhuma venda encontrada para este período.</td></tr>`;

    const resumoHtml = `
      <div style="display: flex; flex-direction: column; gap: 15px; font-size: 10px; color: #111827; border: 1px solid #E5E7EB; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">
           <div>
              <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">Faturamento Bruto</div>
              <div style="font-size: 14pt; font-weight: 900;">${formatarMoeda(dados.resumo.total)}</div>
           </div>
           <div style="text-align: right;">
              <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">Volume de Negociações</div>
              <div style="font-size: 14pt; font-weight: 900;">${dados.resumo.quantidade} <span style="font-size: 10pt; font-weight: 500;">op.</span></div>
           </div>
           <div style="text-align: right;">
              <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">Ticket Médio</div>
              <div style="font-size: 14pt; font-weight: 900;">${formatarMoeda(dados.resumo.ticketMedio)}</div>
           </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9pt;">
           <div><strong>Dinheiro:</strong> ${formatarMoeda(dados.totaisPagamento?.DINHEIRO || 0)}</div>
           <div><strong>PIX:</strong> ${formatarMoeda(dados.totaisPagamento?.PIX || 0)}</div>
           <div><strong>Crédito:</strong> ${formatarMoeda(dados.totaisPagamento?.CREDITO || 0)}</div>
           <div><strong>Débito:</strong> ${formatarMoeda(dados.totaisPagamento?.DEBITO || 0)}</div>
           <div><strong>Crediário:</strong> ${formatarMoeda(dados.totaisPagamento?.CREDIARIO || 0)}</div>
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

  const chartData = useMemo(() => [...dados.tabela], [dados.tabela]);

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-4 md:gap-6 p-4 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* HEADER */}
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
              Relatório de Vendas
            </h1>
            <p className="text-xs md:text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)]">
              Estratégias de crescimento e faturamento.
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-auto modal-container-export">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={req.loading || dados.tabela.length === 0}
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
              <button onClick={exportarExcel} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
                <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
              </button>
            </div>
          )}
        </div>
      </header>

      {/* FILTROS E CONTROLES */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[20px] p-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shrink-0 shadow-sm w-full">
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-48 modal-container-periodo">
                <button 
                onClick={() => setShowPeriodoModal(!showPeriodoModal)}
                className="flex justify-between items-center w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-transparent transition-colors hover:border-[var(--bg-sidebar)] outline-none"
                >
                <div className="flex items-center gap-2">
                    <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} />
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">
                    {OPCOES_PERIODO.find(o => o.id === filtros.periodoId)?.label}
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
                        aplicarPeriodoRapido(op.id);
                        setShowPeriodoModal(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors ${
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

            {filtros.periodoId === 'CUSTOM' && (
                <div className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-xl bg-transparent w-full md:w-auto animate-in fade-in">
                    <div className="flex flex-col flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Início</span>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros(p => ({...p, dataInicio: e.target.value}))} className="bg-transparent w-full text-[10px] md:text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
                    </div>
                    <span className="text-[10px] font-black uppercase opacity-30 text-[var(--text-main)]">ATÉ</span>
                    <div className="flex flex-col flex-1 border-l border-[var(--border-color)] pl-3">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Fim</span>
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros(p => ({...p, dataFim: e.target.value}))} className="bg-transparent w-full text-[10px] md:text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
                    </div>
                </div>
            )}
        </div>

        <nav className="flex gap-2 overflow-x-auto scrollbar-hide snap-x w-full xl:w-auto pb-1 xl:pb-0">
          {MODULO_VENDAS.subs.map(s => (
            <button 
              key={s.id} onClick={() => setFiltros(prev => ({ ...prev, subRelatorio: s.id }))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap shrink-0 snap-start"
              style={{
                backgroundColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'transparent',
                borderColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'var(--border-color)',
                color: filtros.subRelatorio === s.id ? '#FFF' : 'var(--text-main)',
                opacity: filtros.subRelatorio === s.id ? 1 : 0.6
              }}
            >
              <s.icone size={14} /> {s.nome}
            </button>
          ))}
        </nav>

        {filtros.subRelatorio !== 'consulta_vendas' && (
            <div className="flex bg-transparent p-1 rounded-xl border border-[var(--border-color)] w-full xl:w-auto justify-center shrink-0">
                <button onClick={() => setFiltros(prev => ({ ...prev, modoVisao: 'tabela' }))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
                    <ListIcon size={14} /> <span className="text-[10px] md:text-xs font-black uppercase">Lista</span>
                </button>
                <button onClick={() => setFiltros(prev => ({ ...prev, modoVisao: 'grafico' }))} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
                    <PieChartIcon size={14} /> <span className="text-[10px] md:text-xs font-black uppercase">Gráfico</span>
                </button>
            </div>
        )}
      </section>

      {/* DASHBOARD */}
      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 w-full">
            {[
              { label: 'Faturamento Bruto', valor: formatarMoeda(dados.resumo.total) },
              { label: 'Volume de Negociações', valor: dados.resumo.quantidade, suf: 'operações' },
              { label: 'Ticket Médio', valor: formatarMoeda(dados.resumo.ticketMedio) }
            ].map((card, idx) => (
                <div key={idx} className="py-5 md:py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[20px] bg-[var(--bg-card)] border-[var(--border-color)]">
                    <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-main)]">
                      {card.valor} {card.suf && <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40 ml-1">{card.suf}</span>}
                    </p>
                </div>
            ))}
        </section>
      )}

      {/* ÁREA DE EXIBIÇÃO DE DADOS */}
      <main className="flex-1 w-full bg-transparent md:bg-[var(--bg-card)] md:border md:border-[var(--border-color)] rounded-[20px] overflow-hidden relative flex flex-col md:shadow-sm min-h-[400px]">
        {req.loading && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin mb-4" size={40} style={{ color: 'var(--bg-sidebar)' }} />
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 text-[var(--text-main)]">Sincronizando Vendas...</p>
          </div>
        )}

        {req.erro && !req.loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none">
                <AlertCircle size={48} className="mb-4 text-orange-500" />
                <p className="font-black text-sm max-w-md mb-6 text-[var(--text-main)]">{req.erro}</p>
                <button 
                  onClick={() => { backEndDisponivel.current = true; fetchData(); }} 
                  className="font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-opacity hover:opacity-80 shadow-md border bg-[var(--bg-sidebar)] text-white border-[var(--border-color)] outline-none"
                >
                    Tentar Novamente
                </button>
            </div>
        )}

        {!req.loading && !req.erro && dados.tabela.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-[var(--text-main)] bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none">
                <Box size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Nenhuma venda concluída encontrada neste período.</p>
            </div>
        )}

        {/* MODO GRÁFICO */}
        {filtros.modoVisao === 'grafico' && !req.loading && dados.tabela.length > 0 && (
          <div className="flex-1 p-4 md:p-8 flex flex-col w-full min-h-[400px] bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none">
            <ResponsiveContainer width="100%" height="100%">
              {filtros.subRelatorio === 'vendas_pagamento' ? (
                <PieChart>
                  <Pie data={chartData} innerRadius="40%" outerRadius="80%" paddingAngle={8} dataKey="total" stroke="none" style={{ outline: 'none' }}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip 
                    cursor={false} 
                    content={({ active, payload }) => {
                      if (!active || !payload) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
                          <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">{d.nome}</p>
                          <p className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>Total: {formatarMoeda(d.total)}</p>
                          <p className="text-[10px] font-bold text-[var(--text-main)] opacity-60 mt-1">Qtd: {d.qtd} op.</p>
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
                    tick={{ fill: 'var(--text-main)', fontSize: 10, fontWeight: 700 }} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0}
                    height={100}
                    tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    content={({ active, payload }) => {
                      if (!active || !payload) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
                          <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">{d.nome}</p>
                          <p className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>Total: {formatarMoeda(d.total)}</p>
                          <p className="text-[10px] font-bold text-[var(--text-main)] opacity-60 mt-1">Qtd: {d.qtd}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total" fill="var(--bg-sidebar)" radius={[8, 8, 0, 0]} maxBarSize={50} style={{ outline: 'none' }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {filtros.modoVisao === 'tabela' && !req.loading && dados.tabela.length > 0 && (
          <>
            <div className="hidden md:block flex-1 w-full overflow-x-auto overflow-y-auto custom-slim-scroll">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-sm">
                  <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                    {filtros.subRelatorio === 'consulta_vendas' && (
                        <><th className="px-6 py-5">Código</th><th className="px-6 py-5">Data</th><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Vendedor</th><th className="px-6 py-5 text-center">Pagamento</th><th className="px-6 py-5 text-right">Total</th></>
                    )}
                    {filtros.subRelatorio === 'produtos_vendidos' && (
                        <><th className="px-6 py-5">Produto</th><th className="px-6 py-5 text-center">Volume (UN)</th><th className="px-6 py-5 text-right">Faturamento Bruto</th></>
                    )}
                    {filtros.subRelatorio === 'vendas_vendedor' && (
                        <><th className="px-6 py-5">Operador / Vendedor</th><th className="px-6 py-5 text-center">Vendas Concluídas</th><th className="px-6 py-5 text-right">Montante Gerado</th></>
                    )}
                    {filtros.subRelatorio === 'vendas_pagamento' && (
                        <><th className="px-6 py-5">Forma de Recebimento</th><th className="px-6 py-5 text-center">Frequência</th><th className="px-6 py-5 text-right">Valor Transacionado</th></>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filtros.subRelatorio === 'consulta_vendas' && dados.tabela.map((v) => (
                      <tr key={v.idVenda || v.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                          <td className="px-6 py-5 opacity-60 tabular-nums">#{v.idVenda || v.id || "S/N"}</td>
                          <td className="px-6 py-5 opacity-80 tabular-nums">{formatarDataHora(v.dataVenda || v.dataHora)}</td>
                          <td className="px-6 py-5">{formatarTitleCase(v.nomeCliente || v.cliente || "Cliente Avulso")}</td>
                          <td className="px-6 py-5 opacity-80">{formatarTitleCase(v.nomeFuncionario || v.vendedor || "Sistema")}</td>
                          <td className="px-6 py-5 text-center">
                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm bg-black/5 dark:bg-white/5 border-[var(--border-color)]">
                              {formatarTitleCase(v.metodoPagamento || v.formaPagamento)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{formatarMoeda(v.valorTotal || v.total)}</td>
                      </tr>
                  ))}

                  {filtros.subRelatorio !== 'consulta_vendas' && dados.tabela.map((p, i) => (
                      <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                          <td className="px-6 py-5">{formatarTitleCase(p.nome)}</td>
                          <td className="px-6 py-5 text-center opacity-70 tabular-nums">{p.qtd} {filtros.subRelatorio === 'produtos_vendidos' ? 'un.' : 'op.'}</td>
                          <td className="px-6 py-5 text-right font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>{formatarMoeda(p.total)}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex md:hidden flex-col gap-3 w-full pb-6 mt-2">
              {dados.tabela.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  {filtros.subRelatorio === 'consulta_vendas' ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[var(--text-main)]">{formatarTitleCase(item.nomeCliente || item.cliente || "Cliente Avulso")}</span>
                          <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">Vend: {formatarTitleCase(item.nomeFuncionario || item.vendedor)}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase opacity-60 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md border border-[var(--border-color)] text-[var(--text-main)]">
                           {formatarTitleCase(item.metodoPagamento || item.formaPagamento)}
                        </span>
                      </div>
                      <div className="flex justify-between items-end pt-2 border-t border-[var(--border-color)]">
                        <span className="text-[10px] font-bold opacity-60 text-[var(--text-main)]">
                          ID: #{item.idVenda || item.id} <br/> {formatarDataHora(item.dataVenda || item.dataHora)}
                        </span>
                        <span className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>
                          {formatarMoeda(item.valorTotal || item.total)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col overflow-hidden max-w-[65%]">
                        <span className="text-sm font-bold text-[var(--text-main)] truncate">{formatarTitleCase(item.nome)}</span>
                        <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">
                          Vol: {item.qtd} {filtros.subRelatorio === 'produtos_vendidos' ? 'un.' : 'op.'}
                        </span>
                      </div>
                      <span className="text-sm font-black tabular-nums shrink-0" style={{ color: 'var(--bg-sidebar)' }}>
                        {formatarMoeda(item.total)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}