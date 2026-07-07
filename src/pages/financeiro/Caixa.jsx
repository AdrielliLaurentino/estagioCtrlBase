import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, ChevronUp, Lock, XCircle, ShoppingBag, 
  Printer, Search, FileText, Loader2, ArrowLeft, Banknote, Check
} from "lucide-react";

import ModalAbrirCaixa from "../../components/modal/ModalAbrirCaixa";
import ModalFecharCaixa from "../../components/modal/ModalFecharCaixa";
import apiFetch from "../../services/api";
import financeiroIcon from "../../assets/icons/financeiro.png";
import dinheiroIcon from "../../assets/icons/dinheiro.png";
import crediarioIcon from "../../assets/icons/crediario.png";
import cartaoIcon from "../../assets/icons/cartao.png";
import transferirIcon from "../../assets/icons/transferir.png";
import totalSaidasIcon from "../../assets/icons/totalsaídas.png";
import totalVendasIcon from "../../assets/icons/totalvendas.png";
import totalRecebimentosIcon from "../../assets/icons/totalrecebimentos.png";

const formatarMoeda = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarData = (d) => d ? new Date(d).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "--";
const formatarApenasHora = (d) => d ? new Date(d).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : "--";
const formatarTitleCase = (text) => text ? text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "";

const mapaPeriodo = { 
  "Hoje": "HOJE", 
  "Ontem": "ONTEM", 
  "Esta Semana": "ESTA_SEMANA", 
  "Semana Passada": "SEMANA_PASSADA", 
  "Este Mês": "ESTE_MES", 
  "Mês Passado": "MES_PASSADO" 
};

const mapaStatus = { 
  "Todos": null, 
  "Abertos": "ABERTO", 
  "Fechados": "FECHADO" 
};

const StatCard = ({ label, val, imagem }) => (
  <div className="py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] cursor-default hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-[var(--bg-card)] border-[var(--border-color)]">
    <div className="flex items-center justify-center gap-2 mb-2">
      {imagem && <img src={imagem} alt={label} className="w-6 h-6 object-contain opacity-70" style={{ filter: 'var(--icon-filter)' }} />}
      <h2 className="text-[10px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">{label}</h2>
    </div>
    <p className="text-xl font-black tracking-tight text-[var(--text-main)]">{formatarMoeda(val)}</p>
  </div>
);

const FilterDropdown = ({ label, options, selected, onSelect, isOpen, onToggle }) => (
  <div className="relative flex-1 lg:flex-none">
    <button 
      onClick={onToggle} 
      className="w-full lg:w-[150px] py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-all outline-none bg-[var(--bg-sidebar)] text-white border-none"
    >
      <span className="truncate">{selected === "Todos" ? label : selected}</span>
      <ChevronDown size={14} className={`transition-transform opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="absolute top-full left-0 mt-2 w-full lg:w-[150px] rounded-xl shadow-2xl border z-[150] overflow-hidden max-h-48 overflow-y-auto custom-slim-scroll bg-[var(--bg-card)] border-[var(--border-color)] animate-in fade-in slide-in-from-top-2">
        {options.map(opt => (
          <div 
            key={opt} 
            onClick={() => onSelect(opt)} 
            className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 flex justify-between items-center text-[var(--text-main)] border-b last:border-0 border-[var(--border-color)]"
          >
            <span className="truncate pr-2">{formatarTitleCase(opt)}</span>
            {selected === opt && <Check size={12} className="text-[var(--bg-sidebar)] shrink-0" />}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function Caixa() {
  const navigate = useNavigate();

  const [filtros, setFiltros] = useState({ periodo: "Hoje", status: "Todos", colaborador: "Todos" });
  const [valores, setValores] = useState({ dinheiro: 0, crediario: 0, cartoes: 0, transferencias: 0, totalVendas: 0, totalRecebimentos: 0, totalSaidas: 0 });
  const [listaCaixas, setListaCaixas] = useState([]);
  const [funcionariosDb, setFuncionariosDb] = useState([]); 
  const [menuAberto, setMenuAberto] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [erroApi, setErroApi] = useState(null); 
  const [possuiCaixaAberto, setPossuiCaixaAberto] = useState(false);
  
  const [modalAbrirOpen, setModalAbrirOpen] = useState(false);
  const [modalFecharOpen, setModalFecharOpen] = useState(false);
  const [caixaParaFechar, setCaixaParaFechar] = useState(null); 
  const [caixaExpandidoId, setCaixaExpandidoId] = useState(null);

  useEffect(() => {
    const carregarFuncionarios = async () => {
      try {
        const res = await apiFetch(`/funcionarios`);
        if (res.ok) setFuncionariosDb(await res.json());
      } catch (error) {
        console.warn("Não foi possível carregar a lista de funcionários.");
      }
    };
    carregarFuncionarios();
  }, []);

  const carregarDadosCaixa = async () => {
    setLoading(true); 
    setErroApi(null);
    try {
      const params = new URLSearchParams();
      params.append("periodo", mapaPeriodo[filtros.periodo] || "HOJE");
      if (mapaStatus[filtros.status]) params.append("status", mapaStatus[filtros.status]);
      
      if (filtros.colaborador !== "Todos") {
          const funcTarget = funcionariosDb.find(f => f.nomeCompleto === filtros.colaborador);
          if (funcTarget) params.append("idFuncionario", funcTarget.idFuncionario);
      }

      const [resCaixa, resVendas] = await Promise.allSettled([
        apiFetch(`/caixas/relatorio?${params.toString()}`),
        apiFetch(`/vendas`)
      ]);

      let listaCaixasAPI = [];
      if (resCaixa.status === 'fulfilled' && resCaixa.value.ok) {
          const dadosCaixa = await resCaixa.value.json();
          listaCaixasAPI = Array.isArray(dadosCaixa) ? dadosCaixa : (dadosCaixa.listaCaixas || []);
      } else if (resCaixa.status === 'rejected') {
          throw new Error(resCaixa.reason.message);
      }

      let todasVendas = [];
      if (resVendas.status === 'fulfilled' && resVendas.value.ok) {
          const dadosVendas = await resVendas.value.json();
          todasVendas = Array.isArray(dadosVendas) ? dadosVendas : (dadosVendas.content || []);
      }
      
      const vendasFiltradas = todasVendas.filter(v => (v.statusVenda || "").toUpperCase() === 'REALIZADA');

      let listaFinal = listaCaixasAPI.map(caixa => {
          const dtAbertura = new Date(caixa.dataAbertura).getTime();
          const dtFechamento = caixa.dataFechamento ? new Date(caixa.dataFechamento).getTime() : new Date().getTime();
          const vDesteCaixa = vendasFiltradas.filter(v => {
              if (v.idCaixa && caixa.idCaixa) return v.idCaixa === caixa.idCaixa;
              const dataVenda = new Date(v.dataVenda).getTime();
              return (v.idFuncionario === caixa.idFuncionario && dataVenda >= dtAbertura && dataVenda <= dtFechamento);
          });
          return { ...caixa, vendas: vDesteCaixa };
      });

      let tDin = 0, tPix = 0, tCard = 0, tCred = 0, tSaida = 0;
      listaFinal.forEach(c => {
          if (c.status === 'FECHADO') {
              tDin += parseFloat(c.conferidoDinheiro ?? 0);
              tPix += parseFloat(c.conferidoPix ?? 0);
              tCard += parseFloat(c.conferidoDebito ?? 0) + parseFloat(c.conferidoCredito ?? 0);
              tCred += parseFloat(c.conferidoCrediario ?? 0);
          }
      });

      setValores({ dinheiro: tDin, crediario: tCred, cartoes: tCard, transferencias: tPix, totalVendas: tDin+tPix+tCard+tCred, totalRecebimentos: tDin+tPix+tCard, totalSaidas: tSaida });
      setPossuiCaixaAberto(listaFinal.some(c => c.status === 'ABERTO')); 
      setListaCaixas(listaFinal);

    } catch (error) { 
        setErroApi(error.message || "Erro ao conectar com o servidor ou sessão expirada."); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { 
      carregarDadosCaixa(); 
  }, [filtros, funcionariosDb]);

  const opcoesColaborador = ["Todos", ...funcionariosDb.map(f => f.nomeCompleto)];
  const opcoesPeriodo = Object.keys(mapaPeriodo);
  const opcoesStatus = Object.keys(mapaStatus);

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden custom-slim-scroll">
      
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 mt-4 mb-2 gap-6">
        
        <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
            <button onClick={() => navigate('/financeiro')} className="bg-transparent border-none outline-none opacity-50 hover:opacity-100 transition-all p-0" style={{ color: 'var(--text-main)' }}>
                <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl shadow-sm bg-[var(--bg-sidebar)]" style={{ WebkitMaskImage: `url(${financeiroIcon})`, maskImage: `url(${financeiroIcon})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} />
            
            <hgroup className="flex flex-col justify-center">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none whitespace-nowrap" style={{ color: 'var(--bg-sidebar)' }}>Fluxo de Caixa</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1" style={{ color: 'var(--text-main)' }}>Aberturas e fechamentos</p>
            </hgroup>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap gap-3 relative w-full lg:w-auto justify-start lg:justify-end">
          <FilterDropdown label="Período" options={opcoesPeriodo} selected={filtros.periodo} onSelect={(val) => { setFiltros(prev => ({...prev, periodo: val})); setMenuAberto(null); }} isOpen={menuAberto === 'periodo'} onToggle={() => setMenuAberto(menuAberto === 'periodo' ? null : 'periodo')} />
          <FilterDropdown label="Status" options={opcoesStatus} selected={filtros.status} onSelect={(val) => { setFiltros(prev => ({...prev, status: val})); setMenuAberto(null); }} isOpen={menuAberto === 'status'} onToggle={() => setMenuAberto(menuAberto === 'status' ? null : 'status')} />
          <FilterDropdown label="Operador" options={opcoesColaborador} selected={filtros.colaborador} onSelect={(val) => { setFiltros(prev => ({...prev, colaborador: val})); setMenuAberto(null); }} isOpen={menuAberto === 'colaborador'} onToggle={() => setMenuAberto(menuAberto === 'colaborador' ? null : 'colaborador')} />
          
          <button 
            onClick={() => setModalAbrirOpen(true)} 
            disabled={possuiCaixaAberto} 
            className={`w-full lg:w-[150px] py-3 px-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md transition-all flex items-center justify-center gap-2 outline-none
               ${possuiCaixaAberto ? "opacity-30 cursor-not-allowed" : "hover:opacity-90 active:scale-95"}`}
            style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}
          >
            <Banknote size={14} strokeWidth={3} />
            <span className="truncate">{possuiCaixaAberto ? "Caixa Aberto" : "Abrir Caixa"}</span>
          </button>
        </div>
      </header>

      {erroApi && (
        <div className="p-4 rounded-[16px] flex items-center gap-3 animate-in slide-in-from-top-2 border shadow-sm bg-red-500/10 border-red-500/20 text-red-500 shrink-0">
            <XCircle size={20} strokeWidth={2.5} className="shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-wider">{erroApi}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 shrink-0">
        <StatCard label="Dinheiro" val={valores.dinheiro} imagem={dinheiroIcon} />
        <StatCard label="Pix/Transf" val={valores.transferencias} imagem={transferirIcon} />
        <StatCard label="Cartões" val={valores.cartoes} imagem={cartaoIcon} />
        <StatCard label="Crediário" val={valores.crediario} imagem={crediarioIcon} />
        <StatCard label="Recebido" val={valores.totalRecebimentos} imagem={totalRecebimentosIcon} />
        <StatCard label="Saídas" val={valores.totalSaidas} imagem={totalSaidasIcon} />
        <StatCard label="Total Vendas" val={valores.totalVendas} imagem={totalVendasIcon} />
      </div>

      <main className="flex-1 flex flex-col gap-4 pb-10 min-h-[400px]">
        <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50 mt-4" style={{ color: 'var(--text-main)' }}>
            <FileText size={16} strokeWidth={2.5} /> Relatórios de Turno
        </h2>

        {loading ? (
            <div className="flex-1 rounded-[24px] border flex flex-col items-center justify-center shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <Loader2 size={32} className="animate-spin mb-3" style={{ color: 'var(--bg-sidebar)' }} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Sincronizando Fechamentos...</span>
            </div>
        ) : listaCaixas.length === 0 ? (
            <div className="flex-1 rounded-[24px] border flex flex-col items-center justify-center border-dashed shadow-sm transition-colors opacity-60" style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                <Search size={36} className="mb-4 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Nenhum caixa encontrado neste filtro.</p>
            </div>
        ) : (
            <div className="flex flex-col gap-4 overflow-y-visible">
              {listaCaixas.map((caixa) => {
                  const isExpanded = caixaExpandidoId === caixa.idCaixa;
                  const isAberto = caixa.status === 'ABERTO';

                  return (
                      <div 
                        key={caixa.idCaixa} 
                        className="rounded-[24px] border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md cursor-pointer bg-[var(--bg-card)] border-[var(--border-color)]"
                        onClick={() => setCaixaExpandidoId(isExpanded ? null : caixa.idCaixa)}
                      >
                          <div className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                              
                              <div className="flex flex-col gap-2 w-full lg:w-auto">
                                  <div className="flex items-center gap-3">
                                      <h2 className="font-bold text-base sm:text-lg uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                          {formatarTitleCase(caixa.nomeFuncionario || "Operador Principal")}
                                      </h2>
                                      <span 
                                        className={`px-2.5 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                          isAberto 
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                            : 'bg-gray-500/10 text-[var(--text-main)] border-[var(--border-color)] opacity-70'
                                        }`}
                                      >
                                          {caixa.status}
                                      </span>
                                  </div>
                                  <div className="text-[10px] flex flex-wrap gap-x-6 gap-y-1 uppercase font-bold tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>
                                      <span className="flex items-center gap-1">Abertura: {formatarData(caixa.dataAbertura)}</span>
                                      <span className="flex items-center gap-1">Troco: {formatarMoeda(caixa.saldoInicial)}</span>
                                      {caixa.dataFechamento && <span className="flex items-center gap-1">Fechamento: {formatarData(caixa.dataFechamento)}</span>}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end shrink-0 mt-2 lg:mt-0">
                                  {isAberto ? (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setCaixaParaFechar(caixa); setModalFecharOpen(true); }} 
                                        className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md active:scale-95 hover:opacity-90 outline-none"
                                        style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}
                                      >
                                          <Lock size={14} strokeWidth={3} /> Fechar Caixa
                                      </button>
                                  ) : (
                                      <div className="flex items-center gap-6">
                                          <div className="text-right hidden sm:block">
                                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Vendas do Turno</p>
                                              <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                  {formatarMoeda(caixa.vendas?.reduce((acc, v) => acc + (v.valorTotal || 0), 0) || 0)}
                                              </p>
                                          </div>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); alert("Impressão em breve"); }} 
                                            className="p-3.5 rounded-2xl border transition-colors shadow-sm hover:opacity-70 active:scale-95 outline-none"
                                            style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                          >
                                              <Printer size={18} strokeWidth={2} />
                                          </button>
                                      </div>
                                  )}
                                  <div className="p-1 transition-colors opacity-40 hover:opacity-100" style={{ color: 'var(--text-main)' }}>
                                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                  </div>
                              </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t p-6 lg:p-8 animate-in slide-in-from-top-2 duration-300 bg-[var(--bg-body)]" style={{ borderColor: 'var(--border-color)' }}>
                              {isAberto ? (
                                <div className="text-center py-10 flex flex-col items-center gap-4">
                                  <div className="p-5 rounded-full border-2 border-dashed bg-transparent" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', opacity: 0.3 }}>
                                      <Lock size={28} strokeWidth={1.5} />
                                  </div>
                                  <p className="text-[10px] font-black uppercase tracking-widest max-w-sm opacity-40" style={{ color: 'var(--text-main)' }}>
                                      O relatório detalhado estará disponível após o fechamento do caixa.
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--bg-sidebar)' }}>
                                        <ShoppingBag size={16} strokeWidth={3} /> Histórico Detalhado
                                    </h3>
                                    <div className="overflow-x-auto custom-slim-scroll bg-[var(--bg-card)] rounded-[20px] border shadow-sm border-[var(--border-color)]">
                                      <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                          <tr className="text-[9px] uppercase tracking-widest font-black border-b bg-transparent opacity-50" style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                                            <th className="py-4 px-5 w-28">Horário</th>
                                            <th className="py-4 px-5">Produtos e Quantidades</th>
                                            <th className="py-4 px-5 w-32">Pagamento</th>
                                            <th className="py-4 px-5 text-right w-32">Valor Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y bg-transparent" style={{ divideColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                          {caixa.vendas && caixa.vendas.length > 0 ? caixa.vendas.map((venda, idx) => (
                                            <tr key={venda.idVenda || idx} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5 group">
                                              
                                              <td className="py-4 px-5 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold">{formatarApenasHora(venda.dataVenda)}</span>
                                                    <span className="opacity-40 text-[9px] uppercase tracking-widest font-black">ID: {venda.idVenda || `#${idx}`}</span>
                                                </div>
                                              </td>

                                              <td className="py-4 px-5 align-middle">
                                                <div className="flex flex-col gap-2">
                                                    {venda.itens?.map((item, i) => {
                                                        const nomeProduto = item.nomeProduto || item.produto?.nomeGenerico || "Produto Genérico";
                                                        const variacao = item.produtoVariacao?.nomeVariacao && item.produtoVariacao?.nomeVariacao !== "Única" 
                                                                         ? ` - ${item.produtoVariacao.nomeVariacao}` : "";
                                                        return (
                                                            <div key={i} className="text-[10px] sm:text-[11px] flex items-center justify-between border-b border-dashed pb-1.5 last:border-0 last:pb-0" style={{ borderColor: 'var(--border-color)' }}>
                                                                <span className="truncate pr-4 uppercase font-bold">
                                                                    <span className="font-black mr-2 opacity-50">{item.quantidade}x</span>
                                                                    {nomeProduto}{variacao}
                                                                </span>
                                                                <span className="opacity-60 font-bold whitespace-nowrap">
                                                                    {formatarMoeda(item.precoUnitario)} un.
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                              </td>

                                              <td className="py-4 px-5 align-middle">
                                                <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-[var(--bg-body)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                                    {venda.metodoPagamento || "Não Informado"}
                                                </span>
                                              </td>

                                              <td className="py-4 px-5 text-right font-black align-middle text-sm text-[var(--bg-sidebar)]">
                                                  {formatarMoeda(venda.valorTotal)}
                                              </td>
                                            </tr>
                                          )) : (
                                              <tr><td colSpan="4" className="py-10 text-center text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Nenhuma venda registrada neste turno.</td></tr>
                                          )}
                                        </tbody>
                                        {caixa.vendas && caixa.vendas.length > 0 && (
                                            <tfoot>
                                                <tr className="border-t bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
                                                    <td colSpan="3" className="py-4 px-5 text-right text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>
                                                        Soma Total de Vendas do Turno
                                                    </td>
                                                    <td className="py-4 px-5 text-right text-base font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                                        {formatarMoeda(caixa.vendas.reduce((acc, v) => acc + (v.valorTotal || 0), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                      </table>
                                    </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                  );
              })
            }
            </div>
        )}
      </main>

      <ModalAbrirCaixa isOpen={modalAbrirOpen} onClose={() => setModalAbrirOpen(false)} aoAbrir={carregarDadosCaixa} />
      <ModalFecharCaixa isOpen={modalFecharOpen} onClose={() => setModalFecharOpen(false)} onSalvo={carregarDadosCaixa} idCaixa={caixaParaFechar?.idCaixa} />
    </div>
  );
}