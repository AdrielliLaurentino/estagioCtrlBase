import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader2, Search, ChevronUp, ChevronDown, Plus, Trash2, Package, AlertTriangle, ShieldAlert } from "lucide-react";
import ModalLateral from "../common/ModalLateral"; 
import adcProdutoIcon from "../../assets/icons/adcproduto.png";
import { apiFetch } from "../../services/api"; 

const aplicarMascaraMoeda = (valor) => {
  if (valor == null || valor === "") return "";
  let v = String(valor).replace(/[^\d,]/g, ""); 
  if (!v) return "";
  const parts = v.split(",");
  if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
  if (parts.length === 2 && parts[1].length > 2) v = parts[0] + "," + parts[1].substring(0, 2);
  const splitPoint = v.split(",");
  splitPoint[0] = splitPoint[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return "R$ " + splitPoint.join(","); 
};

const limparMascaraMoeda = (valorStr) => {
  if (!valorStr) return null;
  if (typeof valorStr === "number") return valorStr;
  const limpo = String(valorStr).replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(limpo) || 0.00;
};

const aplicarMascaraEAN = (valor) => valor ? String(valor).replace(/\D/g, "").slice(0, 14) : "";

export default function ModalRegistroEntrada({ isOpen, onClose, onSalvo }) {
  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  const hasPrivilegios = useMemo(() => {
    const role = String(usuarioLogado.cargo || usuarioLogado.perfilAcesso?.nome || usuarioLogado.perfil || "").toUpperCase();
    return ["LIDER", "GERENTE", "DONO", "ADMIN"].some(r => role.includes(r));
  }, [usuarioLogado]);

  const [loading, setLoading] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [variacoesEntrada, setVariacoesEntrada] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [errosBackend, setErrosBackend] = useState([]); 

  useEffect(() => {
    if (!isOpen) {
      setProdutoSelecionado(null);
      setVariacoesEntrada([]);
      setMotivo("");
      setErrosBackend([]);
    }
  }, [isOpen]);

  const handleSelecionarProduto = useCallback((produtoCompleto) => {
    setErrosBackend([]);
    if (!produtoCompleto) {
      setProdutoSelecionado(null);
      setVariacoesEntrada([]);
      return;
    }

    setProdutoSelecionado(produtoCompleto);
    
    const variacoesIniciais = produtoCompleto.variacoes?.length > 0 
      ? produtoCompleto.variacoes 
      : [{ id: null, nomeVariacao: "Única" }]; 

    const varsFormatadas = variacoesIniciais.map(v => ({
      idVariacao: v.id,
      nomeVariacao: v.nomeVariacao || "Única",
      quantidade: "",
      valorCusto: "", 
      valorVenda: "",
      codigoBarras: "",
      ncm: "",
      estoqueMinimo: "5",
      isNova: false
    }));
    
    setVariacoesEntrada(varsFormatadas);
  }, []);

  const handleAdicionarNovaVariacao = () => {
    setVariacoesEntrada(prev => [
      ...prev, { 
        idVariacao: null, 
        nomeVariacao: "", 
        quantidade: "", 
        valorCusto: "", 
        valorVenda: "",
        codigoBarras: "",
        ncm: "",
        estoqueMinimo: "5",
        isNova: true 
      }
    ]);
  };

  const handleAtualizarVariacao = (index, campo, valor) => {
    setVariacoesEntrada(prev => prev.map((item, i) => {
      if (i !== index) return item;
      let novoValor = valor;
      if (["valorCusto", "valorVenda"].includes(campo)) novoValor = aplicarMascaraMoeda(valor);
      else if (campo === "codigoBarras") novoValor = aplicarMascaraEAN(valor);
      return { ...item, [campo]: novoValor };
    }));
  };

  const handleRemoverVariacao = (index) => {
    setVariacoesEntrada(prev => prev.filter((_, i) => i !== index));
  };

  const validarPayload = (entradas) => {
    const erros = [];
    if (!motivo.trim()) erros.push({ campo: "Origem/Motivo", mensagem: "O motivo da entrada é obrigatório." });
    if (entradas.length === 0) erros.push({ campo: "Quantidade", mensagem: "Informe a quantidade recebida em pelo menos uma variação." });
    
    const varNovaInvalida = entradas.find(v => v.isNova && !v.nomeVariacao?.trim());
    if (varNovaInvalida) erros.push({ campo: "Nova Variação", mensagem: "Preencha o nome da nova variação." });
    
    return erros;
  };

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    setErrosBackend([]);
    
    const entradasValidas = variacoesEntrada.filter(v => Number(v.quantidade) > 0);
    const errosValidacao = validarPayload(entradasValidas);

    if (errosValidacao.length > 0) {
      setErrosBackend(errosValidacao);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idProduto: Number(produtoSelecionado.id || produtoSelecionado.idProduto),
        motivo: motivo.trim(),
        status: hasPrivilegios ? "APROVADO" : "EM_ANALISE",
        itens: entradasValidas.map(v => ({
          idVariacao: v.idVariacao ? Number(v.idVariacao) : null, 
          nomeVariacao: v.isNova ? v.nomeVariacao.trim() : undefined,
          quantidade: parseInt(v.quantidade, 10),
          valorCusto: (hasPrivilegios && v.valorCusto) ? limparMascaraMoeda(v.valorCusto) : null,
          valorVenda: (hasPrivilegios && v.valorVenda) ? limparMascaraMoeda(v.valorVenda) : null,
          
          codigoBarras: v.isNova && v.codigoBarras ? String(v.codigoBarras).trim() : null,
          ncm: v.isNova && v.ncm ? String(v.ncm).trim() : null,
          estoqueMinimo: v.isNova ? (Number(v.estoqueMinimo) || 5) : undefined
        }))
      };

      await apiFetch(`/estoque/entrada/lote`, { 
        method: 'POST', 
        body: JSON.stringify(payload)
      });

      onSalvo?.();
      fecharModalComAnimacao(); 
    } catch (error) {
      setErrosBackend([{ campo: "Erro", mensagem: error.message || "Falha na comunicação." }]);
    } finally {
      setLoading(false);
    }
  };

  const isBotaoDesabilitado = loading || !produtoSelecionado || variacoesEntrada.every(v => Number(v.quantidade) <= 0);

  return (
    <>
      <style>{`
        @keyframes shake-error {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        .shake-error {
          animation: shake-error 0.3s ease-in-out;
        }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span style={{ color: 'var(--text-main)' }}>Nova Entrada</span>}
        subtitulo={
          <div className="flex flex-col gap-1 mt-1">
             <span className="opacity-60" style={{ color: 'var(--text-main)' }}>Registrar Reposição de Estoque</span>
             {!hasPrivilegios && (
                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 opacity-80" style={{ color: '#eab308' }}>
                  <ShieldAlert size={10} /> Sujeito à análise da gerência
                </span>
             )}
          </div>
        }
        icone={<img src={adcProdutoIcon} alt="Entrada" className="w-12 h-12 object-contain opacity-90" style={{ filter: 'brightness(0) invert(var(--tw-invert, 0))' }} />} 
        footer={(fechar) => (
          <>
            <button type="button" onClick={fechar} className="flex-1 py-8 flex justify-center items-center opacity-50 hover:opacity-100 transition-all group outline-none" style={{ color: 'var(--text-main)' }}>
                <span className="font-black uppercase text-sm tracking-widest group-hover:scale-105 transition-transform">Cancelar</span>
            </button>
            <button type="button" disabled={isBotaoDesabilitado} onClick={(e) => handleSalvar(e, fechar)} className="flex-1 py-8 flex justify-center items-center gap-2 transition-all disabled:opacity-30 outline-none group bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20" style={{ color: 'var(--text-main)' }}>
                {loading && <Loader2 size={18} className="animate-spin" />} 
                <span className="font-black uppercase text-sm tracking-widest group-hover:scale-105 transition-transform">
                   {hasPrivilegios ? "Confirmar" : "Enviar p/ Análise"}
                </span>
            </button>
          </>
        )}
      >
          {errosBackend.length > 0 && (
            <div className="mb-6 p-5 rounded-[20px] bg-red-500/10 border border-red-500/30 flex flex-col gap-2 transition-all">
              <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                <AlertTriangle size={14} /> Atenção aos Erros
              </h4>
              <ul className="pl-6 list-disc text-xs font-bold space-y-1 text-red-500">
                {errosBackend.map((erro, index) => (
                  <li key={index}><span className="opacity-70">{erro.campo}:</span> {erro.mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          <form id="form-entrada" autoComplete="off" className="flex flex-col gap-8 animate-in fade-in duration-300 mt-2 pb-6">
            <Autocomplete label="Buscar Produto *" value={produtoSelecionado?.nomeGenerico || ""} onSelect={handleSelecionarProduto} obrigatorio />
            <Input label="Origem / Nota Fiscal / Motivo *" value={motivo} onChange={setMotivo} obrigatorio />

            {produtoSelecionado && (
              <div className="flex flex-col gap-4 mt-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b pb-2 mb-2" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                    <Package size={14} /> Quantidades Recebidas
                  </h3>
                </div>

                {variacoesEntrada.map((v, index) => (
                  <div key={index} className="flex flex-col gap-6 p-5 rounded-[24px] border bg-black/5 dark:bg-white/5 relative group transition-all" style={{ borderColor: 'var(--border-color)' }}>
                    {v.isNova && (
                      <button type="button" onClick={() => handleRemoverVariacao(index)} className="absolute top-4 right-4 opacity-50 hover:opacity-100 text-red-500 transition-all outline-none">
                        <Trash2 size={14} />
                      </button>
                    )}

                    {v.isNova ? (
                      <Input label="Nome da Variação (Ex: Tamanho G) *" value={v.nomeVariacao} onChange={val => handleAtualizarVariacao(index, "nomeVariacao", val)} obrigatorio />
                    ) : (
                      <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wide opacity-90" style={{ color: 'var(--text-main)' }}>{v.nomeVariacao}</span>
                          <span className="text-[9px] font-black uppercase opacity-40 mt-0.5" style={{ color: 'var(--text-main)' }}>Ref Existente</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <Input label="Qtd. Adicionada *" type="number" step="1" value={v.quantidade} onChange={val => handleAtualizarVariacao(index, "quantidade", val)} obrigatorio />
                      {v.isNova && (
                        <Input label="Estoque Mínimo" type="number" step="1" value={v.estoqueMinimo} onChange={val => handleAtualizarVariacao(index, "estoqueMinimo", val)} />
                      )}
                    </div>

                    {v.isNova && (
                      <div className="grid grid-cols-2 gap-6">
                         <Input label="Código Barras (EAN)" value={v.codigoBarras} onChange={val => handleAtualizarVariacao(index, "codigoBarras", val)} />
                         <Input label="Código NCM" value={v.ncm} onChange={val => handleAtualizarVariacao(index, "ncm", val)} />
                      </div>
                    )}

                    {/* Exibe valores de custo e venda APENAS se o usuário tem privilégio */}
                    {hasPrivilegios && (
                      <div className="grid grid-cols-2 gap-6">
                        <Input label="Custo Unitário (R$)" type="text" value={v.valorCusto} onChange={val => handleAtualizarVariacao(index, "valorCusto", val)} />
                        <Input label="Venda Unitária (R$)" type="text" value={v.valorVenda} onChange={val => handleAtualizarVariacao(index, "valorVenda", val)} />
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={handleAdicionarNovaVariacao} 
                  className="w-full py-4 mt-2 border border-dashed rounded-[20px] font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 outline-none"
                  style={{ color: 'var(--text-main)', borderColor: 'var(--text-main)' }}
                >
                    <Plus size={14} strokeWidth={3} /> Nova Variação no Recebimento
                </button>
              </div>
            )}
          </form>
      </ModalLateral>
    </>
  );
}

export function Autocomplete({ label, value, onSelect, obrigatorio }) {
  const [f, setF] = useState(false);
  const [busca, setBusca] = useState(value || "");
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const dropdownRef = useRef(null);
  const active = f || (busca.toString().length > 0);

  useEffect(() => { setBusca(value || ""); }, [value]);

  useEffect(() => {
    function handleClickOutside(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setF(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (busca.length < 2) { setProdutos([]); return; }
    const controller = new AbortController();
    const fetchProdutos = async () => {
      setCarregando(true);
      try {
        const res = await apiFetch(`/produtos?page=0&size=100`, { signal: controller.signal });
        const data = await res.json();
        const array = Array.isArray(data) ? data : (data.content || []);
        const termo = busca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        setProdutos(array.filter(p => String(p.nomeGenerico || p.nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termo)));
      } catch (e) { if (e.name !== "AbortError") console.error(e); } finally { setCarregando(false); }
    };
    const t = setTimeout(fetchProdutos, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [busca]);

  return (
    <div className="relative w-full border-b transition-all group pt-5 pb-1 opacity-80 hover:opacity-100 focus-within:opacity-100" style={{ borderColor: 'var(--border-color)' }} ref={dropdownRef}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${active ? "top-0 text-[10px] opacity-100" : "top-5 text-sm opacity-50"}`} style={{ color: 'var(--text-main)' }}>
        {label} {obrigatorio && "*"}
      </label>
      <div className="relative flex items-center">
        <input 
          type="text" value={busca} onFocus={() => setF(true)} onChange={(e) => { setBusca(e.target.value); if(e.target.value==="") onSelect(null); }} 
          className="w-full bg-transparent outline-none text-sm font-bold pb-1 pt-1 pr-8 transition-all" style={{ color: 'var(--text-main)' }}
        />
        <div className="absolute right-0 top-1 bottom-0 flex items-center pointer-events-none opacity-50" style={{ color: 'var(--text-main)' }}>
          {carregando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
      </div>
      {f && produtos.length > 0 && (
        <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-[20px] shadow-2xl border overflow-hidden max-h-48 overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          {produtos.map(p => (
            <li 
              key={p.id || p.idProduto} onClick={() => { setBusca(p.nomeGenerico || p.nome); onSelect(p); setF(false); }}
              className="px-5 py-4 cursor-pointer transition-all duration-300 border-b last:border-0 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 flex flex-col" style={{ borderColor: 'var(--border-color)' }}
            >
              <span className="text-[11px] font-black" style={{ color: 'var(--text-main)' }}>{p.nomeGenerico || p.nome}</span>
              <span className="text-[9px] font-bold mt-1 line-clamp-2 leading-tight opacity-70" style={{ color: 'var(--text-main)' }}>Cod: {p.id || p.idProduto}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", obrigatorio, step = "1", errorMsg }) {
  const safeValue = value ?? "";
  const [f, setF] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [shake, setShake] = useState(false);
  const active = f || (safeValue.toString().length > 0);
  const isNumber = type === "number";
  const decimais = parseFloat(step) < 1 ? 2 : 0;

  useEffect(() => {
    if (errorMsg) {
      setShake(false);
      setTimeout(() => setShake(true), 10);
    }
  }, [errorMsg]);

  const handleBlur = () => {
    setF(false);
    setIsTouched(true);
    if (obrigatorio && !safeValue.toString().trim()) {
      setShake(false);
      setTimeout(() => setShake(true), 10);
    }
  };

  const inc = () => { setIsTouched(true); onChange(((parseFloat(safeValue) || 0) + parseFloat(step)).toFixed(decimais)); };
  const dec = () => { 
    setIsTouched(true); 
    let n = ((parseFloat(safeValue) || 0) - parseFloat(step)).toFixed(decimais); 
    onChange(parseFloat(n)<0 ? (0).toFixed(decimais) : n); 
  };
  
  const localError = (isTouched && obrigatorio && !safeValue.toString().trim()) ? "Campo obrigatório" : null;
  const displayError = errorMsg || localError;

  return (
    <div className={`relative w-full border-b transition-all group pt-5 pb-1 ${displayError ? 'opacity-100' : 'opacity-80 hover:opacity-100 focus-within:opacity-100'} ${shake ? 'shake-error' : ''}`} style={{ borderColor: displayError ? '#ef4444' : 'var(--border-color)' }}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${active ? "top-0 text-[10px] opacity-100" : "top-5 text-sm opacity-50"}`} style={{ color: 'var(--text-main)' }}>
        {label} {obrigatorio && "*"}
      </label>
      <div className="relative flex items-center">
        <input 
          type={type} step={isNumber?step:undefined} value={safeValue} onFocus={()=>setF(true)} onBlur={handleBlur} onChange={(e)=>{setIsTouched(true); onChange(e.target.value)}} 
          className="w-full bg-transparent outline-none text-sm font-bold pb-1 pt-1 pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all" style={{ color: 'var(--text-main)' }}
        />
        {isNumber && (
          <div className="absolute right-0 top-0 bottom-2 flex flex-col justify-center items-center gap-0.5 opacity-50 hover:opacity-100" style={{ color: 'var(--text-main)' }}>
            <button type="button" onClick={inc} className="hover:scale-110 outline-none"><ChevronUp size={14} strokeWidth={3} /></button>
            <button type="button" onClick={dec} className="hover:scale-110 outline-none"><ChevronDown size={14} strokeWidth={3} /></button>
          </div>
        )}
      </div>
      {displayError && (
        <span className="absolute -bottom-5 left-0 text-[9px] font-bold uppercase tracking-widest animate-pulse" style={{ color: '#8B0000' }}>
          {displayError}
        </span>
      )}
    </div>
  );
}