import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import { 
  Package, Box, Trash2, ArrowDownToLine, ListIcon, 
  PieChart as PieChartIcon, CalendarDays, FileText, Table as TableIcon,
  ChevronDown, RefreshCw, ArrowLeft
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

import { estoqueService } from "../../services/estoqueService";
import { unidadeService } from "../../services/unidadeService";
import { produtoService } from "../../services/produtoService"; 
import { gerarTemplateRelatorio } from "../../utils/geradorPdf";
import logoImage from "../../assets/icons/logobase.png"; 

const OPCOES_PERIODO = [
  { id: 'HOJE', label: 'Hoje' },
  { id: 'ONTEM', label: 'Ontem' },
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'SEMANA_PASSADA', label: 'Semana Passada' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
  { id: 'CUSTOM', label: 'Personalizado' }
];

const MODULO_ESTOQUE = {
  subs: [
    { id: 'movimentacao_estoque', nome: 'Posição Atual', icone: Box },
    { id: 'entrada', nome: 'Entradas', icone: ArrowDownToLine },
    { id: 'percas', nome: 'Saídas (Descartes)', icone: Trash2 } 
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

const obterCoresStatus = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'DISPONÍVEL') return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
  if (s === 'QUASE ESGOTADO') return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
  if (s === 'ESGOTADO') return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400';
  return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
};

export default function RelatorioEstoque() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [usuario, setUsuario] = useState({});
  const [unidade, setUnidade] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [filtros, setFiltros] = useState({
    subRelatorio: location.state?.abaAtiva || MODULO_ESTOQUE.subs[0].id,
    modoVisao: "tabela",
    periodo: "ESTE_MES"
  });
  
  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [], resumo: { valorTotalCusto: 0, totalItens: 0, alertas: 0 }});
  const CORES_GRAFICO = ['var(--bg-sidebar)', '#3B82F6', '#10B981', '#8B5CF6', '#64748B'];

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario")) || {};
      setUsuario(u);
    } catch { setUsuario({}); }
  }, []);

  useEffect(() => {
    const carregarUnidade = async () => {
      try {
        const res = await unidadeService.buscarDadosNegocio();
        setUnidade(res);
      } catch (e) { console.error("Erro ao carregar unidade:", e); }
    };
    carregarUnidade();
  }, []);

  const setFiltro = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }));

  const fetchData = useCallback(async () => {
    setReq({ loading: true, erro: null });
    try {
      let listaRaw = [];
      
      const idUnidade = usuario?.unidadeId || usuario?.idUnidade || unidade?.idUnidade || 1;

      if (filtros.subRelatorio === 'movimentacao_estoque') {
        const d = await produtoService.listar(0, 2000);
        listaRaw = d.content || [];
      } else {
        const d = await estoqueService.listarMovimentacoes({ 
          unidadeId: idUnidade, 
          periodo: filtros.periodo, 
          size: 2000 
        });
        listaRaw = d.content || d || []; 
      }

      if (filtros.subRelatorio === 'movimentacao_estoque') {
        let processados = [];
        let total = 0; let alertas = 0;

        listaRaw.forEach(p => {
          const itens = p.variacoes?.length > 0 ? p.variacoes : [p];
          itens.forEach(v => {
            if (v.ativo === false || p.ativo === false) return;
            const qtd = Number(v.estoqueAtual ?? v.estoqueInicial ?? v.quantidadeAtual ?? v.quantidade ?? 0);
            const custo = Number(v.precoCusto ?? v.custo ?? 0);
            const min = Number(v.estoqueMinimo || 5);
            
            total += (qtd * custo);
            if (qtd <= min) alertas++;

            const nomeBase = p.nomeGenerico || p.nome || "Produto sem nome";
            const nomeFinal = (v.nomeVariacao && v.nomeVariacao !== "Única") ? `${nomeBase} - ${v.nomeVariacao}` : nomeBase;

            processados.push({
              id: v.id || p.idProduto || p.id || Math.random().toString(36).substring(7),
              nome: nomeFinal, categoria: p.categoria || p.nomeCategoria || "-", 
              qtd, custo, totalItem: qtd * custo,
              status: v.statusEstoque || (qtd === 0 ? "ESGOTADO" : (qtd <= min ? "QUASE ESGOTADO" : "DISPONÍVEL"))
            });
          });
        });
        
        setDados({ tabela: processados.sort((a, b) => a.qtd - b.qtd), resumo: { valorTotalCusto: total, totalItens: processados.length, alertas } });
      } 
      else if (filtros.subRelatorio === 'percas') {
        const apenasSaidas = listaRaw.filter(item => item.tipoMovimentacao === "PERDA");
        setDados({ 
          tabela: apenasSaidas, 
          resumo: { 
            valorTotalCusto: 0,
            totalItens: apenasSaidas.length,
            alertas: apenasSaidas.reduce((acc, i) => acc + Math.abs(Number(i.quantidade || 0)), 0)
          }
        });
      }
      else if (filtros.subRelatorio === 'entrada') {
        const apenasEntradas = listaRaw.filter(item => item.tipoMovimentacao === "ENTRADA");
        setDados({ 
          tabela: apenasEntradas, 
          resumo: { 
            valorTotalCusto: 0,
            totalItens: apenasEntradas.length,
            alertas: apenasEntradas.reduce((acc, i) => acc + Number(i.quantidade || 0), 0)
          }
        });
      }
      
      setReq({ loading: false, erro: null });
    } catch (e) {
      setReq({ loading: false, erro: e.message || "Falha ao carregar dados." });
    }
  }, [filtros.subRelatorio, filtros.periodo, usuario, unidade]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const exportarExcel = () => { setShowExportMenu(false); };
  const handleExportarPDF = () => { setShowExportMenu(false); };

  const chartData = useMemo(() => {
    if (filtros.subRelatorio === 'movimentacao_estoque') {
      return [...dados.tabela].sort((a, b) => b.qtd - a.qtd).slice(0, 10);
    }
    const groups = dados.tabela.reduce((acc, curr) => {
      const m = curr.observacao || "Geral";
      acc[m] = (acc[m] || 0) + Math.abs(Number(curr.quantidade || 0));
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [dados.tabela, filtros.subRelatorio]);

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className="flex flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6">
        <div className="flex items-center gap-4 w-full lg:w-[320px] shrink-0">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[var(--bg-sidebar)] opacity-80 hover:opacity-100"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>

          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <Package className="w-8 h-8" style={{ color: 'var(--bg-sidebar)' }} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap text-[var(--bg-sidebar)]">
              Relatório de Estoque
            </h1>
            <p className="text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)] whitespace-nowrap">
              Seu estoque organizado, sua operação sob controle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative w-full lg:w-auto mt-4 lg:mt-0 justify-end">
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={req.loading || dados.tabela.length === 0}
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
                <button onClick={exportarExcel} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
                  <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {req.erro && (
        <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center">
          {req.erro}
          <button onClick={() => setReq({ ...req, erro: null })} className="opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] p-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shrink-0 shadow-sm">
        
        <div className={`flex items-center gap-2 px-5 py-3 border border-[var(--border-color)] rounded-xl bg-transparent w-full xl:w-auto ${filtros.subRelatorio === 'movimentacao_estoque' ? 'opacity-40' : ''}`}>
          <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} className="shrink-0" />
          <select 
            value={filtros.periodo} 
            onChange={(e) => setFiltro('periodo', e.target.value)}
            disabled={filtros.subRelatorio === 'movimentacao_estoque'}
            className="bg-transparent font-black uppercase text-xs tracking-widest outline-none cursor-pointer w-full text-[var(--text-main)] disabled:cursor-not-allowed"
          >
            {filtros.subRelatorio === 'movimentacao_estoque' ? (
              <option value="ESTE_MES">Tempo Real</option>
            ) : (
              OPCOES_PERIODO.map(op => <option key={op.id} value={op.id} className="text-black dark:text-white bg-[var(--bg-card)]">{op.label}</option>)
            )}
          </select>
        </div>

        <nav className="flex gap-2 overflow-x-auto custom-slim-scroll w-full xl:w-auto pb-2 xl:pb-0">
          {MODULO_ESTOQUE.subs.map(s => {
            const isActive = filtros.subRelatorio === s.id;
            return (
              <button 
                key={s.id} 
                onClick={() => setFiltro('subRelatorio', s.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap shrink-0 
                  ${isActive 
                    ? 'shadow-sm opacity-100' 
                    : 'bg-transparent border-[var(--border-color)] text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                style={{
                  backgroundColor: isActive ? 'var(--bg-sidebar)' : '',
                  borderColor: isActive ? 'var(--bg-sidebar)' : '',
                  color: isActive ? '#FFF' : ''
                }}
              >
                <s.icone size={16} /> {s.nome}
              </button>
            );
          })}
        </nav>

        <div className="flex bg-transparent p-1 rounded-xl border border-[var(--border-color)] w-full xl:w-auto justify-center sm:justify-start shrink-0">
          <button onClick={() => setFiltro('modoVisao', 'tabela')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <ListIcon size={16} /> <span className="text-xs font-black uppercase">Lista</span>
          </button>
          <button onClick={() => setFiltro('modoVisao', 'grafico')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
            <PieChartIcon size={16} /> <span className="text-xs font-black uppercase">Gráfico</span>
          </button>
        </div>
      </section>

      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 w-full">
            {[
              { label: 'Valor Custo Total', valor: formatarMoeda(dados.resumo.valorTotalCusto) },
              { label: 'Registros Encontrados', valor: dados.resumo.totalItens, suf: 'registros' },
              { label: 'Volume Afetado', valor: dados.resumo.alertas, suf: 'unidades' }
            ].map((card, idx) => (
                <div key={idx} className="py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] bg-[var(--bg-card)] border-[var(--border-color)]">
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">{card.label}</h2>
                    <p className="text-2xl font-black tracking-tight text-[var(--text-main)]">
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

        {filtros.modoVisao === 'grafico' && !req.loading && dados.tabela.length > 0 && (
          <div className="flex-1 p-4 md:p-8 flex flex-col w-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {filtros.subRelatorio === 'percas' || filtros.subRelatorio === 'entrada' ? (
                <PieChart>
                  <Pie data={chartData} innerRadius="40%" outerRadius="80%" paddingAngle={8} dataKey="value" stroke="none" style={{ outline: 'none' }}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip cursor={false} content={(props) => <CustomTooltip {...props} />} />
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
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={(props) => <CustomTooltip {...props} />} />
                  <Bar dataKey="qtd" fill="var(--bg-sidebar)" radius={[8, 8, 0, 0]} maxBarSize={50} style={{ outline: 'none' }} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {filtros.modoVisao === 'tabela' && !req.loading && dados.tabela.length > 0 && (
          <div className="flex-1 overflow-x-auto custom-slim-scroll w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <tr className="text-xs font-black uppercase tracking-widest whitespace-nowrap text-[var(--text-main)] opacity-70">
                  {filtros.subRelatorio === 'movimentacao_estoque' && (
                    <><th className="px-6 py-5">Produto</th><th className="px-6 py-5">Categoria</th><th className="px-6 py-5 text-center">Estoque</th><th className="px-6 py-5 text-center">Situação</th><th className="px-6 py-5 text-right">Preço Un.</th><th className="px-6 py-5 text-right">Custo Total</th></>
                  )}
                  {filtros.subRelatorio === 'percas' && (
                    <><th className="px-6 py-5">Data</th><th className="px-6 py-5">Produto</th><th className="px-6 py-5">Observação/Motivo</th><th className="px-6 py-5 text-center">Qtd</th><th className="px-6 py-5 text-right">Valor Registrado</th></>
                  )}
                  {filtros.subRelatorio === 'entrada' && (
                    <><th className="px-6 py-5">Data</th><th className="px-6 py-5">Produto</th><th className="px-6 py-5">Observação</th><th className="px-6 py-5 text-center">Qtd</th><th className="px-6 py-5 text-right">Valor Registrado</th></>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {dados.tabela.map((v, i) => (
                  <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                    
                    {filtros.subRelatorio === 'movimentacao_estoque' && (
                      <>
                        <td className="px-6 py-5">{formatarTitleCase(v.nome)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.categoria)}</td>
                        <td className="px-6 py-5 text-center tabular-nums">{v.qtd} <span className="opacity-50 text-xs">un.</span></td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border shadow-sm ${obterCoresStatus(v.status)}`}>{formatarTitleCase(v.status)}</span>
                        </td>
                        <td className="px-6 py-5 text-right opacity-70 tabular-nums">{formatarMoeda(v.custo)}</td>
                        <td className="px-6 py-5 text-right font-black tabular-nums">{formatarMoeda(v.totalItem)}</td>
                      </>
                    )}

                    {filtros.subRelatorio === 'percas' && (
                      <>
                        <td className="px-6 py-5 opacity-60 tabular-nums text-xs">{formatarDataHora(v.dataMovimentacao)}</td>
                        <td className="px-6 py-5">{formatarTitleCase(v.produtoNome)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.observacao || '-')}</td>
                        <td className="px-6 py-5 text-center tabular-nums">{Math.abs(v.quantidade)} <span className="opacity-50 text-xs">un.</span></td>
                        <td className="px-6 py-5 text-right text-red-500 font-black tabular-nums">-</td>
                      </>
                    )}

                    {filtros.subRelatorio === 'entrada' && (
                      <>
                        <td className="px-6 py-5 opacity-60 tabular-nums text-xs">{formatarDataHora(v.dataMovimentacao)}</td>
                        <td className="px-6 py-5">{formatarTitleCase(v.produtoNome)}</td>
                        <td className="px-6 py-5 opacity-70">{formatarTitleCase(v.observacao || 'Não informado')}</td>
                        <td className="px-6 py-5 text-center tabular-nums">{v.quantidade} <span className="opacity-50 text-xs">un.</span></td>
                        <td className="px-6 py-5 text-right text-green-600 font-black tabular-nums">-</td>
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
  const d = payload[0].payload;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl z-50">
      <p className="text-xs font-black uppercase mb-2 text-[var(--text-main)] opacity-70">{label || d.name || d.nome}</p>
      <p className="text-sm font-black tabular-nums" style={{ color: 'var(--bg-sidebar)' }}>Volume: {payload[0].value || payload[0].payload.qtd} un.</p>
    </div>
  );
};