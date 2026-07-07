import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Package, Loader2, AlertCircle, X, RefreshCw } from "lucide-react";
import CarrinhoCompras from "../../components/pdv/CarrinhoCompras";
import TabelaBase from "../../components/common/TabelaBase";
import { useTheme } from "../../context/ThemeContext";
import { useCarrinho } from "../../context/CarrinhoContext"; 
import apiFetch from "../../services/api";
import iconeCarrinho from "../../assets/icons/carrinho.png";

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarTitleCase = (text) => text ? text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "";

export default function Vendas() {
  const { isDarkMode } = useTheme();
  const { adicionarAoCarrinho } = useCarrinho(); 
  const searchInputRef = useRef(null);
  
  const [produtosPai, setProdutosPai] = useState([]);
  const [uiState, setUiState] = useState({ loading: false, erro: null, statusErro: null });
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const carregarProdutos = useCallback(async () => {
    setUiState({ loading: true, erro: null, statusErro: null });
    try {
      const res = await apiFetch("/produtos?page=0&size=200"); 
      if (!res.ok) throw { status: res.status, message: "Falha ao carregar catálogo." };
      
      const data = await res.json();
      const content = Array.isArray(data) ? data : (data?.content ?? []);

      const processados = content.map(p => ({
        ...p,
        menorPreco: p.variacoes?.length ? Math.min(...p.variacoes.map(v => v.precoVenda)) : 0,
        estoqueTotal: p.variacoes?.reduce((acc, v) => acc + (v.estoqueAtual || 0), 0) || 0,
        categoria: (p.categoria || "GERAL").toUpperCase()
      }));
      
      setProdutosPai(processados);
      setUiState({ loading: false, erro: null, statusErro: null });
    } catch (e) { 
      setUiState({ 
        loading: false, 
        erro: e.message || "Verifique sua conexão e tente novamente.", 
        statusErro: e.status 
      });
    }
  }, []);

  useEffect(() => { 
    carregarProdutos(); 
  }, [carregarProdutos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setProdutoSelecionado(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categorias = useMemo(() => {
    const cats = new Set(produtosPai.map(p => p.categoria));
    return ["TODOS", ...Array.from(cats).sort()];
  }, [produtosPai]);

  const filtrados = useMemo(() => {
    const termoBusca = busca.toLowerCase();
    return produtosPai.filter(p => {
      const matchCat = filtroCategoria === "TODOS" || p.categoria === filtroCategoria;
      const matchNome = (p.nomeGenerico || p.nome || "").toLowerCase().includes(termoBusca);
      return matchCat && matchNome;
    });
  }, [produtosPai, filtroCategoria, busca]);

  const colunas = useMemo(() => [
    { 
      titulo: "Produto", 
      render: (p) => (
        <div className="flex items-center gap-3 py-1 cursor-pointer hover:opacity-70 transition-opacity">
            <div className="p-3 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 bg-[var(--border-color)] shrink-0">
                <Package size={20} className="text-[var(--text-main)]" strokeWidth={2} />
            </div>
            <div className="flex flex-col text-left">
                <span className="font-black text-lg leading-tight line-clamp-2 text-[var(--text-main)]">
                    {formatarTitleCase(p.nomeGenerico || p.nome)}
                </span>
                <span className="text-[11px] font-bold opacity-60 line-clamp-1 mt-1 text-[var(--text-main)] uppercase tracking-widest">
                    {p.variacoes?.length || 0} VARIAÇÕES
                </span>
            </div>
        </div>
      )
    },
    { 
      titulo: "Estoque", 
      align: "center",
      render: (p) => (
        <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 text-[var(--text-main)]">Total</span>
            <span className="font-black text-xl leading-none text-[var(--text-main)]">{p.estoqueTotal} <span className="text-[10px] opacity-50">un.</span></span>
        </div>
      ) 
    },
    { 
      titulo: "Preço Inicial", 
      align: "right", 
      render: (p) => (
        <div className="flex flex-col items-end">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 text-[var(--text-main)]">A partir de</span>
            <span className="font-black text-lg leading-none text-[var(--bg-sidebar)]">{formatadorMoeda.format(p.menorPreco)}</span>
        </div>
      )
    }
  ], []);

  const handleDeslogar = useCallback(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("@CtrlBase:token");
    window.location.href = '/login';
  }, []);

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent p-1 relative px-3 animate-in fade-in duration-500 overflow-hidden">
      
      <main className="flex-1 flex flex-col min-w-0 pr-0 lg:pr-[440px] pb-4">
        <header className="flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6 hidden lg:flex">
            <div className="flex items-center gap-4 w-full lg:w-[280px] shrink-0">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl shadow-sm icon-dynamic-color" style={{ WebkitMaskImage: `url(${iconeCarrinho})`, maskImage: `url(${iconeCarrinho})` }} />
                <div className="flex flex-col justify-center">
                    <h1 className="text-2xl font-black italic uppercase tracking-tight leading-none text-[var(--bg-sidebar)]">Vendas</h1>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold opacity-60 mt-1 text-[var(--text-main)]">Terminal de vendas</p>
                </div>
            </div>

            <div className="flex-1 flex justify-center w-full gap-3">
                <div className="relative w-full max-w-2xl group">
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Pesquisar produto no catálogo..." 
                      value={busca} 
                      onChange={e => setBusca(e.target.value)} 
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-[var(--bg-sidebar)] outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]" 
                    />
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)] group-focus-within:text-[var(--bg-sidebar)] transition-colors" />
                    <span className="hidden lg:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border border-[var(--border-color)] bg-black/5 text-[10px] font-black text-[var(--text-main)] opacity-40 pointer-events-none">
                      /
                    </span>
                </div>
                
                <button 
                  onClick={carregarProdutos} 
                  className="px-4 py-3.5 rounded-2xl border shadow-sm hover:opacity-80 transition-all outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] active:scale-95 flex items-center justify-center"
                  title="Atualizar Catálogo"
                >
                  <RefreshCw size={18} className={uiState.loading ? 'animate-spin' : ''} />
                </button>
            </div>
            
            <div className="w-[180px] shrink-0" />
        </header>

        <div className="flex gap-2 overflow-x-auto custom-slim-scroll py-2 shrink-0 mb-4 mt-2">
          {categorias.map(cat => (
            <button 
              key={cat} onClick={() => setFiltroCategoria(cat)}
              className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all border active:scale-95 whitespace-nowrap"
              style={{ 
                backgroundColor: filtroCategoria === cat ? 'var(--bg-sidebar)' : 'var(--bg-card)', 
                color: filtroCategoria === cat ? '#FFF' : 'var(--text-main)',
                borderColor: filtroCategoria === cat ? 'transparent' : 'var(--border-color)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 transition-all duration-300">
          {uiState.loading ? (
             <div className="flex-1 flex flex-col items-center justify-center">
                 <Loader2 className="animate-spin mb-2 text-[var(--bg-sidebar)]" size={32} />
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Sincronizando catálogo...</span>
             </div>
          ) : uiState.erro ? (
             <div className="flex-1 flex flex-col items-center justify-center text-red-500 gap-2">
                 <AlertCircle size={32} className="opacity-80"/>
                 <p className="text-xs font-bold uppercase">{uiState.erro}</p>
                 {uiState.statusErro === 401 && (
                    <button 
                      onClick={handleDeslogar}
                      className="mt-4 px-6 py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest hover:opacity-70 transition-all"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', backgroundColor: 'var(--bg-card)' }}
                    >
                      Fazer Login Novamente
                    </button>
                  )}
             </div>
          ) : filtrados.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-[var(--text-main)]">
                <Package size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nenhum produto encontrado</p>
             </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto custom-slim-scroll">
                <TabelaBase 
                  dados={filtrados} 
                  colunas={colunas} 
                  onLinhaClick={setProdutoSelecionado}
                  initialMode="tabela"
                />
            </div>
          )}
        </div>
      </main>

      <aside className="hidden lg:flex absolute top-4 right-4 bottom-4 w-[420px] flex-col shadow-2xl overflow-hidden rounded-[30px] z-40 bg-transparent">
        <CarrinhoCompras isFixed={true} />
      </aside>

      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setProdutoSelecionado(null)}>
          <div className="border shadow-2xl rounded-[30px] w-full max-w-md p-8 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 relative overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-start mb-6 border-b pb-6 relative z-10" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-[20px] shadow-sm bg-[var(--border-color)]">
                    <Package size={28} className="text-[var(--text-main)]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col text-[var(--text-main)]">
                  <h3 className="font-black text-xl leading-tight line-clamp-1">{formatarTitleCase(produtoSelecionado.nomeGenerico || produtoSelecionado.nome)}</h3>
                  <span className="text-[11px] font-bold opacity-70 mt-1 uppercase tracking-widest">
                    Selecione a variação
                  </span>
                </div>
              </div>
              <button onClick={() => setProdutoSelecionado(null)} className="p-2 opacity-50 hover:opacity-100 hover:rotate-90 rounded-full transition-all text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={20}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-slim-scroll space-y-3 pr-2 relative z-10">
              {produtoSelecionado.variacoes?.map((v, i) => {
                const qtd = Number(v.estoqueAtual ?? v.estoqueInicial ?? 0);
                const esgotado = qtd <= 0;
                
                return (
                  <button 
                    key={i} 
                    disabled={esgotado}
                    onClick={() => {
                        adicionarAoCarrinho({ ...v, nomeGenerico: produtoSelecionado.nomeGenerico || produtoSelecionado.nome });
                        setProdutoSelecionado(null);
                    }}
                    className={`w-full flex justify-between items-center p-5 border rounded-[20px] transition-all text-left
                        ${esgotado ? 'opacity-40 cursor-not-allowed bg-black/5 dark:bg-white/5 border-transparent' : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--bg-sidebar)] hover:shadow-md'}
                    `}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold text-sm text-[var(--text-main)]">{formatarTitleCase(v.nomeVariacao || "Padrão")}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">
                          EAN: {v.codigoBarras || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-black text-xl leading-none text-[var(--bg-sidebar)]">
                          {formatadorMoeda.format(v.precoVenda)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${esgotado ? "bg-red-500/20 text-red-400" : "bg-black/5 dark:bg-white/10 text-[var(--text-main)]"}`}>
                          {qtd} un.
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setProdutoSelecionado(null)} className="mt-6 w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 shadow-lg relative z-10 border text-[var(--text-main)] bg-[var(--bg-card)] border-[var(--border-color)] outline-none">
                Cancelar (ESC)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}