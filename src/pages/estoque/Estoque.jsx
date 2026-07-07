import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Package, ChevronDown, Check, Loader2, 
  PieChart, LayoutGrid, Eye, X, ListIcon 
} from "lucide-react";

import TabelaBase from "../../components/common/TabelaBase";
import CadastroProduto from "../../components/register/CadastroProduto";
import ModalRegistroPerda from "../../components/modal/ModalRegistroPerda";
import ModalRegistroEntrada from "../../components/modal/ModalRegistroEntrada"; 
import ModalConfirmacao from "../../components/modal/ModalConfirmacao";
import MenuInferior from "../../layouts/MenuInferior"; 
import { useTheme } from "../../context/ThemeContext";
import estoqueIcon from "../../assets/icons/estoque.png";
import adcProdutoIcon from "../../assets/icons/adcproduto.png";
import editarProdutoIcon from "../../assets/icons/editarproduto.png";
import movEstoqueIcon from "../../assets/icons/movEstoque.png"; 
import atencaoProdutoIcon from "../../assets/icons/atencaoproduto.png";
import importarProdutoIcon from "../../assets/icons/importarProduto.png"; 
import exportarProdutoIcon from "../../assets/icons/exportarProduto.png"; 
import apiFetch from "../../services/api";
import { produtoService } from "../../services/produtoService";

const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function Estoque() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const usuarioLogado = useMemo(() => {
    try { 
      const rawUser = localStorage.getItem("usuario") || localStorage.getItem("@CtrlBase:user");
      return rawUser ? JSON.parse(rawUser) : {}; 
    } catch { 
      return {}; 
    }
  }, []);

  const cargoUsuario = String(usuarioLogado.cargo || usuarioLogado.perfilAcesso || "").toUpperCase();
  const temPermissaoGerencial = ["ADMIN", "GERENTE", "DONO", "SUPERVISOR"].includes(cargoUsuario);

  const [produtos, setProdutos] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState(["Matriz"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState("tabela"); 
  const [abaAtiva, setAbaAtiva] = useState(1); 
  
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false); 
  const [modalPerdaAberto, setModalPerdaAberto] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState({ isOpen: false, id: null });
  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null);
  const [produtoPreview, setProdutoPreview] = useState(null); 

  const [statusFiltro, setStatusFiltro] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [unidadeFiltro, setUnidadeFiltro] = useState(null);
  const [mostrarStatusMenu, setMostrarStatusMenu] = useState(false);
  const [mostrarCategoriaMenu, setMostrarCategoriaMenu] = useState(false);
  const [mostrarUnidadeMenu, setMostrarUnidadeMenu] = useState(false); 

  const fetchProdutos = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await produtoService.listar(0, 9999, signal);
      const rawArray = Array.isArray(data) ? data : (data.content || []);
      
      const processados = rawArray.map(p => {
        const estoqueTotal = p.variacoes ? p.variacoes.reduce((acc, v) => {
          const saldo = v.estoqueAtual ?? v.estoqueInicial ?? v.quantidadeAtual ?? v.quantidade ?? 0;
          return acc + (Number(saldo) || 0);
        }, 0) : 0;

        const estoqueMinimo = p.variacoes ? p.variacoes.reduce((acc, v) => acc + (Number(v.estoqueMinimo) || 5), 0) : 5;
        
        let statusVisual = "ATIVO";
        if (p.ativo === false) statusVisual = "INATIVO";
        else if (estoqueTotal <= 0) statusVisual = "ESGOTADO";
        else if (estoqueTotal <= estoqueMinimo) statusVisual = "BAIXO";
        
        const precosVenda = p.variacoes?.map(v => Number(v.precoVenda) || 0).filter(v => v > 0) || [];
        const valorVendaMinimo = precosVenda.length > 0 ? Math.min(...precosVenda) : 0;
        const precoVaria = precosVenda.length > 0 && new Set(precosVenda).size > 1;

        return { 
          ...p, 
          statusVisual, 
          quantidadeEmEstoque: estoqueTotal, 
          valorVenda: valorVendaMinimo, 
          precoVaria: precoVaria,
          qtdVariacoes: p.variacoes?.length || 0, 
          nomeCategoria: p.categoria || p.nomeCategoria || "Sem Categoria",
          unidade: p.unidadeNome || "Matriz"
        };
      });
      setProdutos(processados);
    } catch (err) {
      if (err.name !== "AbortError" && !err.message?.includes("Abort")) {
        setError("Falha na conexão com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnidades = useCallback(async (signal) => {
    try {
      const response = await apiFetch("/unidades/dados-negocio", { signal }); 
      const data = await response.json();
      const nomeUnidade = data.nomeFantasia || data.nome || "Matriz";
      setUnidadesDisponiveis([nomeUnidade]);
    } catch (err) { 
      if (err.name !== "AbortError") {
        console.warn("Aviso: Falha ao carregar unidades. Usando fallback 'Matriz'. Verifique suas permissões (403).");
        setUnidadesDisponiveis(["Matriz"]);
      }
    }
  }, []);

  useEffect(() => { 
    const controller = new AbortController();
    fetchProdutos(controller.signal);
    fetchUnidades(controller.signal); 
    return () => controller.abort();
  }, [fetchProdutos, fetchUnidades]);

  const confirmarExclusao = async () => {
    if (!modalConfirmacao.id) return;
    try {
        await produtoService.excluir(modalConfirmacao.id);
        fetchProdutos(); 
    } catch (error) { 
        console.error(error); 
    } finally { 
        setModalConfirmacao({ isOpen: false, id: null }); 
    }
  };

  const alternarStatusProduto = async (produto) => {
    if (!temPermissaoGerencial) return;
    const acao = produto.ativo === false ? "reativar" : "inativar";
    if (!window.confirm(`Deseja realmente ${acao} o produto?`)) return;

    try {
      await produtoService.alterarStatus(produto.idProduto || produto.id, produto.ativo === false);
      fetchProdutos();
    } catch (error) { 
        console.error(error); 
    }
  };

  const categoriasDisponiveis = useMemo(() => [...new Set(produtos.map(p => p.nomeCategoria).filter(Boolean))].sort(), [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termoBusca = normalize(busca.trim());
    return produtos.filter(p => {
      if (p.statusVisual === "INATIVO" && !temPermissaoGerencial && statusFiltro !== "INATIVO") return false;
      
      const id = p.idProduto || p.id || "";
      const matchVariacao = p.variacoes?.some(v => normalize(v.nomeVariacao || "").includes(termoBusca) || normalize(v.codigoBarras || "").includes(termoBusca));
      const matchTexto = !busca || normalize(p.nomeGenerico || p.nome || "").includes(termoBusca) || String(id).includes(termoBusca) || matchVariacao;
      
      const matchStatus = statusFiltro ? p.statusVisual === statusFiltro : (p.statusVisual !== "INATIVO" || temPermissaoGerencial); 
      const matchCategoriaDropdown = !categoriaFiltro || p.nomeCategoria === categoriaFiltro;
      const matchUnidadeDropdown = !unidadeFiltro || p.unidade === unidadeFiltro;

      return matchTexto && matchStatus && matchCategoriaDropdown && matchUnidadeDropdown;
    });
  }, [produtos, busca, statusFiltro, categoriaFiltro, unidadeFiltro, temPermissaoGerencial]);

  const { totalUnidadesEstoque, itensBaixoEstoque, valorTotalEstoque, lucroEstimado } = useMemo(() => {
    const ativos = produtos.filter(p => p.statusVisual !== "INATIVO");
    
    let totalUnidades = 0;
    let valorTotal = 0;
    let custoTotal = 0;
    let itensBaixo = 0;

    ativos.forEach(p => {
      let possuiVariacaoBaixa = false;
      p.variacoes?.forEach(v => {
        const qtd = Number(v.estoqueAtual ?? v.estoqueInicial ?? 0);
        totalUnidades += qtd;
        valorTotal += (Number(v.precoVenda) || 0) * qtd;
        custoTotal += (Number(v.precoCusto) || 0) * qtd;
        if (qtd <= (Number(v.estoqueMinimo) || 5)) possuiVariacaoBaixa = true;
      });
      if (p.statusVisual === "BAIXO" || possuiVariacaoBaixa) itensBaixo++;
    });

    return { 
        totalUnidadesEstoque: totalUnidades, 
        itensBaixoEstoque: itensBaixo, 
        valorTotalEstoque: valorTotal, 
        lucroEstimado: valorTotal - custoTotal 
    };
  }, [produtos]);

  const colunas = useMemo(() => [
    { 
      titulo: "Produto", 
      render: (p) => (
        <div className="flex items-center gap-3 py-1 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setProdutoPreview(p)}>
            <div className="flex flex-col">
                <span className="font-bold text-sm text-[var(--text-main)]">
                   {formatarTitleCase(p.nomeGenerico || p.nome)} {p.qtdVariacoes > 1 && <Eye size={12} className="opacity-50 inline ml-1" title="Possui Múltiplas Variações"/>}
                </span>
                <span className="text-[10px] uppercase font-black opacity-40 text-[var(--text-main)]">COD: {p.idProduto || p.id}</span>
            </div>
        </div>
      )
    },
    { 
      titulo: "Categoria", 
      render: (p) => <span className="text-[12px] font-bold opacity-70 text-[var(--text-main)]">{formatarTitleCase(p.nomeCategoria)}</span> 
    },
    { titulo: "Estoque", align: "center", render: (p) => <span className="font-black text-sm text-[var(--text-main)]">{p.quantidadeEmEstoque} un.</span> },
    { titulo: "Status", align: "center", render: (p) => <StatusBadge status={p.statusVisual} isDarkMode={isDarkMode} /> },
    { 
      titulo: "Preço", align: "right", 
      render: (p) => (
        <div className="flex flex-col text-right">
          {p.precoVaria && <span className="text-[9px] font-black opacity-40 uppercase tracking-widest text-[var(--text-main)]">A partir de</span>}
          <span className="font-bold text-sm text-[var(--text-main)]">{formatarMoeda(p.valorVenda)}</span>
        </div>
      ) 
    }
  ], [isDarkMode]);

  const cardsData = [
    { label: "Total Produtos", val: totalUnidadesEstoque },
    { label: "Estoque Baixo", val: itensBaixoEstoque, action: () => navigate('/estoque/lista-compras') },
    { label: "Valor Total", val: formatarMoeda(valorTotalEstoque) },
    { label: "Lucro Estimado", val: formatarMoeda(lucroEstimado) },
  ];

  const botoesAcao = [
    { label: "Novo Produto", img: adcProdutoIcon, action: () => { setProdutoEmEdicao(null); setMostrarCadastro(true); } },
    { label: "Entrada Prod.", img: editarProdutoIcon, action: () => setModalEntradaAberto(true) }, 
    { label: "Movimentação", img: movEstoqueIcon, action: () => navigate('/relatorios/movimentacoes') },
    { label: "Com Defeito", img: atencaoProdutoIcon, action: () => setModalPerdaAberto(true) },
    { label: "Importar", img: importarProdutoIcon, action: () => alert("Módulo em desenvolvimento") },
    { label: "Exportar", img: exportarProdutoIcon, action: () => navigate('/relatorios/estoque') },
  ];

  const opcoesFiltroStatus = ["ATIVO", "ESGOTADO", "BAIXO"];
  if (temPermissaoGerencial) opcoesFiltroStatus.push("INATIVO");

  const itensMenuInferior = [
    { label: "Relatórios", icon: <PieChart size={22} strokeWidth={2.5} /> },
    { label: "Estoque", icon: <Package size={22} strokeWidth={2.5} /> },
    { label: "Ações", icon: <LayoutGrid size={22} strokeWidth={2.5} /> }, 
  ];

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 relative pb-20 lg:pb-0 px-3 animate-in fade-in duration-500">
      
      <header className={`flex-col lg:flex-row justify-between items-center shrink-0 mt-4 mb-2 gap-6 ${abaAtiva === 1 ? 'flex' : 'hidden lg:flex'}`}>
        <div className="flex items-center gap-4 w-full lg:w-[280px] shrink-0">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <div 
                className="w-8 h-8 bg-[var(--bg-sidebar)]" 
                style={{ 
                  WebkitMaskImage: `url(${estoqueIcon})`, 
                  WebkitMaskSize: "contain", 
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: `url(${estoqueIcon})`, 
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center"
                }} 
              />
            </div>
            
            <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight leading-none text-[var(--bg-sidebar)]">
                  Estoque
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1 text-[var(--text-main)]">
                  Gestão de Inventário
                </p>
            </div>
        </div>

        <div className="flex-1 flex justify-center w-full">
            <div className="relative w-full max-w-2xl">
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, código ou EAN..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)} 
                  className="w-full pl-12 pr-6 py-3.5 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-gray-400 outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]" 
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 transition-opacity text-[var(--text-main)]" />
            </div>
        </div>

        <div className="flex flex-wrap gap-3 relative w-full lg:w-auto mt-4 lg:mt-0 justify-end">
            <div className="relative flex-1 lg:flex-none">
              <button onClick={() => { setMostrarUnidadeMenu(!mostrarUnidadeMenu); setMostrarCategoriaMenu(false); setMostrarStatusMenu(false); }} className="w-full lg:w-auto px-5 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]">
                  {unidadeFiltro || "Unidade"} <ChevronDown size={14} className={`transition-transform ${mostrarUnidadeMenu ? 'rotate-180' : ''}`} />
              </button>
              {mostrarUnidadeMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl border z-[150] overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
                      <div onClick={() => { setUnidadeFiltro(null); setMostrarUnidadeMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border-b text-[var(--bg-sidebar)] border-[var(--border-color)]">Todas</div>
                      {unidadesDisponiveis.map(uni => (
                          <div key={uni} onClick={() => { setUnidadeFiltro(uni); setMostrarUnidadeMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 flex justify-between items-center text-[var(--text-main)]">
                              {uni} {unidadeFiltro === uni && <Check size={12} className="text-[var(--bg-sidebar)]" />}
                          </div>
                      ))}
                  </div>
              )}
            </div>

            <div className="relative flex-1 lg:flex-none">
              <button onClick={() => { setMostrarCategoriaMenu(!mostrarCategoriaMenu); setMostrarUnidadeMenu(false); setMostrarStatusMenu(false); }} className="w-full lg:w-auto px-5 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]">
                  {categoriaFiltro || "Categoria"} <ChevronDown size={14} className={`transition-transform ${mostrarCategoriaMenu ? 'rotate-180' : ''}`} />
              </button>
              {mostrarCategoriaMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl border z-[150] overflow-hidden max-h-48 overflow-y-auto custom-slim-scroll bg-[var(--bg-card)] border-[var(--border-color)]">
                      <div onClick={() => { setCategoriaFiltro(null); setMostrarCategoriaMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border-b text-[var(--bg-sidebar)] border-[var(--border-color)]">Todas</div>
                      {categoriasDisponiveis.map(cat => (
                          <div key={cat} onClick={() => { setCategoriaFiltro(cat); setMostrarCategoriaMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 flex justify-between items-center text-[var(--text-main)]">
                              {formatarTitleCase(cat)} {categoriaFiltro === cat && <Check size={12} className="text-[var(--bg-sidebar)]" />}
                          </div>
                      ))}
                  </div>
              )}
            </div>

            <div className="relative flex-1 lg:flex-none">
              <button onClick={() => { setMostrarStatusMenu(!mostrarStatusMenu); setMostrarCategoriaMenu(false); setMostrarUnidadeMenu(false); }} className="w-full lg:w-auto px-5 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]">
                  {statusFiltro || "Status"} <ChevronDown size={14} className={`transition-transform ${mostrarStatusMenu ? 'rotate-180' : ''}`} />
              </button>
              {mostrarStatusMenu && (
                  <div className="absolute top-full right-0 mt-2 w-42 rounded-xl shadow-2xl border z-[150] overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
                      <div onClick={() => { setStatusFiltro(null); setMostrarStatusMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border-b text-[var(--bg-sidebar)] border-[var(--border-color)]">Todos (Ativos)</div>
                      {opcoesFiltroStatus.map(st => (
                          <div key={st} onClick={() => { setStatusFiltro(st); setMostrarStatusMenu(false); }} className="px-4 py-3 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 flex justify-between items-center text-[var(--text-main)]">
                              {st} {statusFiltro === st && <Check size={12} className="text-[var(--bg-sidebar)]" />}
                          </div>
                      ))}
                  </div>
              )}
            </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[400px] items-stretch pb-4">
        <div className={`flex-1 flex-col gap-6 min-w-0 bg-transparent ${abaAtiva !== 1 ? 'hidden lg:flex' : 'flex'}`}>
            
            <div className="hidden lg:grid grid-cols-4 gap-4 shrink-0">
              {cardsData.map((card, i) => (
                <div 
                  key={i} onClick={card.action}
                  className="py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[24px] cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-95 transition-all duration-300 bg-[var(--bg-card)] border-[var(--border-color)]"
                >
                  <h2 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 text-[var(--text-main)]">{card.label}</h2>
                  <p className="text-xl font-black tracking-tight text-[var(--text-main)]">{card.val}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mb-1 lg:hidden">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Listagem de Produtos</span>
                <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)]">
                    <button onClick={() => setModoVisao("grade")} className={`p-1.5 rounded-lg transition-colors ${modoVisao === "grade" ? 'bg-[var(--bg-sidebar)] text-white' : 'opacity-40'}`}><LayoutGrid size={14} /></button>
                    <button onClick={() => setModoVisao("tabela")} className={`p-1.5 rounded-lg transition-colors ${modoVisao === "tabela" ? 'bg-[var(--bg-sidebar)] text-white' : 'opacity-40'}`}><ListIcon size={14} /></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-transparent transition-all duration-300">
                {loading ? (
                     <div className="flex-1 flex flex-col items-center justify-center">
                         <Loader2 className="animate-spin mb-2 text-[var(--bg-sidebar)]" size={32} />
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Sincronizando...</span>
                     </div>
                ) : error ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-red-500">
                         <p className="text-xs font-bold uppercase">{error}</p>
                     </div>
                ) : (
                    <div className="flex-1 bg-transparent flex flex-col overflow-y-auto custom-slim-scroll">
                        {modoVisao === "grade" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
                                {produtosFiltrados.map(p => <CardProdutoGrid key={p.idProduto || p.id} produto={p} isDarkMode={isDarkMode} onClick={() => setProdutoPreview(p)} />)}
                            </div>
                        ) : (
                            <TabelaBase 
                                dados={produtosFiltrados} colunas={colunas}
                                onEditar={(p) => { setProdutoEmEdicao(p); setMostrarCadastro(true); }}
                                onRemover={temPermissaoGerencial ? (p) => setModalConfirmacao({ isOpen: true, id: p.idProduto || p.id }) : undefined}
                                onInativar={(p) => alternarStatusProduto(p)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className="hidden lg:flex w-[160px] xl:w-[180px] shrink-0 flex-col gap-3">
            {botoesAcao.map((btn, index) => (
                <button
                    key={index} onClick={btn.action}
                    className="group relative h-full min-h-[85px] w-full flex-1 flex flex-col items-center justify-center gap-2 shadow-xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all border-none rounded-[24px] overflow-hidden bg-[var(--bg-sidebar)]"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[24px]" />
                    <div 
                        className="w-6 h-6 shrink-0 relative z-10 transition-transform group-hover:rotate-6 group-hover:scale-110 bg-[#FFFFFF]" 
                        style={{ WebkitMaskImage: `url(${btn.img})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center", maskImage: `url(${btn.img})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} 
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight px-2 relative z-10 text-[#FFFFFF]">{btn.label}</span>
                </button>
            ))}
        </div>

        <div className={`lg:hidden w-full h-full flex-col gap-3 animate-in fade-in zoom-in-95 duration-300 ${abaAtiva === 0 ? 'flex' : 'hidden'}`}>
            <div className="flex items-center gap-2 mb-2 pl-2">
               <PieChart size={18} className="text-[var(--bg-sidebar)]" />
               <h3 className="text-sm font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Indicadores</h3>
            </div>
            {cardsData.map((card, i) => (
              <div 
                key={i} onClick={card.action}
                className="py-6 px-5 border text-left shadow-sm flex flex-col justify-center gap-1.5 rounded-[20px] transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-95 bg-[var(--bg-card)] border-[var(--border-color)]" 
              >
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 leading-tight text-[var(--text-main)]">{card.label}</h2>
                <p className="text-2xl font-black tracking-tight leading-none text-[var(--text-main)]">{card.val}</p>
              </div>
            ))}
        </div>

        <div className={`lg:hidden w-full h-full flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 ${abaAtiva === 2 ? 'flex' : 'hidden'}`}>
            <div className="flex items-center gap-2 mb-2 pl-2 mt-2">
               <LayoutGrid size={18} className="text-[var(--bg-sidebar)]" />
               <h3 className="text-sm font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Operações</h3>
            </div>
            {botoesAcao.map((btn, index) => (
                <button
                    key={index} onClick={btn.action}
                    className="h-[80px] w-full shrink-0 flex flex-row items-center justify-start px-8 gap-6 shadow-md active:scale-95 transition-all border-none rounded-[24px] bg-[var(--bg-sidebar)]"
                >
                    <div 
                        className="w-8 h-8 shrink-0 bg-[#FFFFFF]" 
                        style={{ WebkitMaskImage: `url(${btn.img})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center", maskImage: `url(${btn.img})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} 
                    />
                    <span className="text-xs font-black uppercase tracking-widest text-left leading-tight text-[#FFFFFF]">{btn.label}</span>
                </button>
            ))}
        </div>
      </main>

      {produtoPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setProdutoPreview(null)}>
          <div className="border shadow-2xl rounded-[30px] w-full max-w-md p-8 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 text-white relative overflow-hidden bg-[var(--bg-sidebar)] border-white/10" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-[20px] shadow-inner bg-white/10"><Package size={28} color="#fff" strokeWidth={1.5} /></div>
                <div className="flex flex-col text-white">
                  <h3 className="font-black text-xl leading-tight line-clamp-1">{formatarTitleCase(produtoPreview.nomeGenerico || produtoPreview.nome)}</h3>
                  <span className="text-[11px] font-bold opacity-70 mt-1">{formatarTitleCase(produtoPreview.nomeCategoria || "Sem Categoria")} • {produtoPreview.variacoes?.length || 0} var.</span>
                </div>
              </div>
              <button onClick={() => setProdutoPreview(null)} className="p-2 opacity-50 hover:opacity-100 hover:rotate-90 hover:bg-white/10 rounded-full transition-all text-white"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-slim-scroll space-y-3 pr-2 relative z-10">
              {produtoPreview.variacoes?.map((v, i) => {
                const qtd = Number(v.estoqueAtual ?? v.estoqueInicial ?? 0);
                const estoqueBaixo = qtd <= (v.estoqueMinimo || 5);
                return (
                  <div key={i} className="flex justify-between items-center p-5 border border-white/10 rounded-[20px] transition-colors bg-black/20 hover:bg-black/40">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm">{formatarTitleCase(v.nomeVariacao || "Padrão")}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">EAN: {v.codigoBarras || "-"}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-black text-xl leading-none">{qtd} <span className="text-xs opacity-50">un.</span></span>
                      <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${estoqueBaixo ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>{estoqueBaixo ? "Baixo" : "OK"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <button onClick={() => setProdutoPreview(null)} className="mt-6 w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 bg-white text-black relative z-10 shadow-lg text-[var(--bg-sidebar)]">Fechar Visualização</button>
          </div>
        </div>
      )}

      <MenuInferior activeIndex={abaAtiva} setActiveIndex={setAbaAtiva} items={itensMenuInferior} />

      {mostrarCadastro && <CadastroProduto isOpen={mostrarCadastro} dadosIniciais={produtoEmEdicao} onClose={() => { setMostrarCadastro(false); fetchProdutos(); }} onSalvo={fetchProdutos} />}
      {modalEntradaAberto && <ModalRegistroEntrada isOpen={modalEntradaAberto} onClose={() => setModalEntradaAberto(false)} onSalvo={fetchProdutos} />}
      {modalPerdaAberto && <ModalRegistroPerda isOpen={modalPerdaAberto} onClose={() => setModalPerdaAberto(false)} onSalvo={fetchProdutos} />}
      <ModalConfirmacao isOpen={modalConfirmacao.isOpen} onClose={() => setModalConfirmacao({ isOpen: false, id: null })} onConfirm={confirmarExclusao} titulo="Excluir Produto" mensagem="Tem certeza que deseja remover este item permanentemente?" textoBotaoConfirmar="Excluir" />
    </div>
  );
}

function StatusBadge({ status, isDarkMode }) {
    let bg = 'rgba(150,150,150,0.1)', color = 'var(--text-main)';
    if(status === 'ATIVO') { bg = isDarkMode ? 'rgba(34,197,94,0.15)' : '#dcfce7'; color = isDarkMode ? '#4ade80' : '#15803d'; }
    else if(status === 'ESGOTADO') { bg = isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'; color = isDarkMode ? '#f87171' : '#b91c1c'; }
    else if(status === 'BAIXO') { bg = isDarkMode ? 'rgba(234,179,8,0.15)' : '#fef9c3'; color = isDarkMode ? '#facc15' : '#a16207'; }
    else if(status === 'INATIVO') { bg = isDarkMode ? 'rgba(100,116,139,0.15)' : '#f1f5f9'; color = isDarkMode ? '#94a3b8' : '#475569'; }
    return <span className="px-2.5 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border shadow-sm border-[var(--border-color)]" style={{ backgroundColor: bg, color }}>{status}</span>;
}

function CardProdutoGrid({ produto, isDarkMode, onClick }) {
    return (
        <div onClick={onClick} className="group border rounded-[24px] p-6 flex flex-col justify-between shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 bg-[var(--bg-card)] border-[var(--border-color)]">
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 bg-[var(--bg-sidebar)]">
                    <Package size={20} color="#fff" strokeWidth={2} />
                </div>
                <StatusBadge status={produto.statusVisual} isDarkMode={isDarkMode} />
            </div>
            <div className="flex flex-col gap-1 mb-6 flex-1">
                <h3 className="font-black text-lg leading-tight line-clamp-2 text-[var(--text-main)]">{formatarTitleCase(produto.nomeGenerico || produto.nome)}</h3>
                <span className="text-[11px] font-bold opacity-60 line-clamp-1 mt-1 text-[var(--text-main)]">{formatarTitleCase(produto.nomeCategoria || "Sem Categoria")}</span>
            </div>
            <div className="flex justify-between items-end pt-4 border-t transition-colors border-[var(--border-color)]">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 text-[var(--text-main)]">Estoque</span>
                    <span className="font-black text-xl leading-none text-[var(--text-main)]">{produto.quantidadeEmEstoque} <span className="text-[10px] opacity-50">un.</span></span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1 text-[var(--text-main)]">Preço</span>
                    <span className="font-black text-lg leading-none text-[var(--bg-sidebar)]">{formatarMoeda(produto.valorVenda)}</span>
                </div>
            </div>
        </div>
    );
}