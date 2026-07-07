import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Trash2, Plus, Loader2, Camera, ChevronDown, ChevronUp, AlertTriangle, Search, Image as ImageIcon, X, CheckCircle, Package } from "lucide-react";
import Webcam from "react-webcam";
import ModalLateral from "../common/ModalLateral";
import iconeEditar from "../../assets/icons/editarproduto.png";
import { produtoService } from "../../services/produtoService";
import apiFetch from "../../services/api";

const aplicarMascaraMoeda = (valor) => {
  if (!valor) return "";
  let v = String(valor).replace(/[^\d,]/g, ""); 
  const parts = v.split(",");
  if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
  if (parts.length === 2 && parts[1].length > 2) v = parts[0] + "," + parts[1].substring(0, 2);
  const splitPoint = v.split(",");
  splitPoint[0] = splitPoint[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return `R$ ${splitPoint.join(",")}`; 
};

const limparMascaraMoeda = (valorStr) => {
  if (!valorStr) return 0.00;
  if (typeof valorStr === "number") return valorStr;
  return parseFloat(String(valorStr).replace(/[^\d,]/g, "").replace(",", ".")) || 0.00;
};

const aplicarMascaraEAN = (valor) => valor ? String(valor).replace(/\D/g, "").slice(0, 14) : "";

export default function CadastroProduto({ isOpen, onClose, onSalvo, dadosIniciais }) {
  const isEdicao = !!dadosIniciais;
  const webcamRef = useRef(null);

  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  const [loading, setLoading] = useState(false);
  const [errosBackend, setErrosBackend] = useState([]);
  const [errosLocais, setErrosLocais] = useState({});
  const [menuFotoAberto, setMenuFotoAberto] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [fotoDestinoIndex, setFotoDestinoIndex] = useState(0); 
  const [feedbackEan, setFeedbackEan] = useState({ index: null, tipo: "", msg: "" });
  
  const [formGeral, setFormGeral] = useState({ nomeGenerico: "", nomeCategoria: "", marca: "", descricao: "", ncm: "" });
  const [variacoes, setVariacoes] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setErrosBackend([]);
    setErrosLocais({});
    setFeedbackEan({ index: null, tipo: "", msg: "" });
    setMenuFotoAberto(false);
    setUseCamera(false);
      
    if (isEdicao && dadosIniciais) {
      setFormGeral({
        nomeGenerico: dadosIniciais.nomeGenerico || dadosIniciais.nome || "",
        nomeCategoria: dadosIniciais.nomeCategoria || dadosIniciais.categoria || "",
        marca: dadosIniciais.marca || "",
        descricao: dadosIniciais.descricao || "",
        ncm: String(dadosIniciais.ncm || "")
      });

      const varFormatadas = dadosIniciais.variacoes?.length > 0 
        ? dadosIniciais.variacoes.map((v) => ({
            ...v,
            codigoBarras: v.codigoBarras || dadosIniciais.codigoBarras || "", 
            precoCusto: v.precoCusto ? aplicarMascaraMoeda(v.precoCusto.toFixed(2).replace(".", ",")) : "",
            precoVenda: v.precoVenda ? aplicarMascaraMoeda(v.precoVenda.toFixed(2).replace(".", ",")) : "",
            estoqueInicial: v.estoqueAtual || v.estoqueInicial || "0",
            estoqueMinimo: v.estoqueMinimo || "5",
            isNova: false 
          }))
        : [{ id: null, nomeVariacao: "Única", codigoBarras: "", precoCusto: "", precoVenda: "", estoqueInicial: "0", estoqueMinimo: "5", foto: null, isNova: false }];
      setVariacoes(varFormatadas);
    } else {
      setFormGeral({ nomeGenerico: "", nomeCategoria: "", marca: "", descricao: "", ncm: "" });
      setVariacoes([{ id: null, nomeVariacao: "Única", codigoBarras: "", precoCusto: "", precoVenda: "", estoqueInicial: "0", estoqueMinimo: "5", foto: null, isNova: false }]);
    }
  }, [isOpen, isEdicao, dadosIniciais]);

  const pesquisarEAN = useCallback(async (index) => {
    const eanLimpo = (variacoes[index]?.codigoBarras || "").replace(/\D/g, "");
    if (eanLimpo.length < 8) {
        setFeedbackEan({ index, tipo: "erro", msg: "Digite pelo menos 8 dígitos." });
        return;
    }
    
    setFeedbackEan({ index, tipo: "loading", msg: "Buscando..." }); 
    try {
      const response = await apiFetch(`/produtos/pesquisa-catalogo/${eanLimpo}`);
      if (response.ok) {
          const data = await response.json();
          setFormGeral(prev => ({
             ...prev,
             nomeGenerico: prev.nomeGenerico || data.nome || "",
             marca: prev.marca || data.marca || "",
             descricao: prev.descricao || data.descricao || "",
             ncm: prev.ncm || data.ncm || ""
          }));
          setFeedbackEan({ index, tipo: "sucesso", msg: "Localizado!" });
      } else {
          setFeedbackEan({ index, tipo: "erro", msg: "Não encontrado." });
      }
    } catch {
      setFeedbackEan({ index, tipo: "erro", msg: "Erro na comunicação." });
    } finally {
      setTimeout(() => setFeedbackEan({ index: null, tipo: "", msg: "" }), 5000); 
    }
  }, [variacoes]);

  const handleAddVariacao = useCallback(() => {
    const primeira = variacoes[0] || {};
    setVariacoes(prev => [...prev, { 
      id: null, nomeVariacao: "", codigoBarras: "", precoCusto: primeira.precoCusto || "", 
      precoVenda: primeira.precoVenda || "", estoqueInicial: "0", estoqueMinimo: primeira.estoqueMinimo || "5", 
      foto: null, isNova: true 
    }]);
  }, [variacoes]);

  const handleRemoveVariacao = useCallback((index) => {
    if (variacoes.length === 1) {
        setErrosBackend([{ campo: "Variação", mensagem: "O produto precisa ter pelo menos uma variedade." }]);
        setTimeout(() => setErrosBackend([]), 3000);
        return;
    }
    setVariacoes(prev => prev.filter((_, i) => i !== index));
    setErrosLocais(prev => {
        const { [`var-${index}-nome`]: _, [`var-${index}-preco`]: __, ...rest } = prev;
        return rest;
    });
  }, [variacoes.length]);

  const handleChangeVariacao = useCallback((index, campo, valor) => {
    setVariacoes(prev => prev.map((item, i) => {
      if (i !== index) return item;
      let novoValor = valor;
      if (["precoCusto", "precoVenda"].includes(campo)) novoValor = aplicarMascaraMoeda(valor);
      if (campo === "codigoBarras") novoValor = aplicarMascaraEAN(valor);
      return { ...item, [campo]: novoValor };
    }));

    if (campo === "codigoBarras" && feedbackEan.index === index) setFeedbackEan({ index: null, tipo: "", msg: "" });

    setErrosLocais(prev => {
        const key = `var-${index}-${campo === 'nomeVariacao' ? 'nome' : 'preco'}`;
        if (!prev[key]) return prev;
        const { [key]: _, ...rest } = prev;
        return rest;
    });
  }, [feedbackEan.index]);

  const handleChangeGeral = useCallback((campo, valor) => {
    setFormGeral(prev => ({...prev, [campo]: valor}));
    setErrosLocais(prev => {
        if (!prev[campo]) return prev;
        const { [campo]: _, ...rest } = prev;
        return rest;
    });
  }, []);

  const handleMediaUpload = (source) => {
    const isCamera = typeof source === "string";
    const imageUrl = isCamera ? source : URL.createObjectURL(source.target.files[0]);
    if (imageUrl) handleChangeVariacao(fotoDestinoIndex, "foto", imageUrl);
    setMenuFotoAberto(false);
    setUseCamera(false);
  };

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    const novosErrosLocais = {};
    let temErro = false;

    if (!formGeral.nomeGenerico.trim()) { novosErrosLocais.nomeGenerico = "Obrigatório"; temErro = true; }
    if (!formGeral.nomeCategoria.trim()) { novosErrosLocais.nomeCategoria = "Obrigatório"; temErro = true; }
    
    variacoes.forEach((v, index) => {
      if (!String(v.nomeVariacao || "").trim()) { novosErrosLocais[`var-${index}-nome`] = "Obrigatório"; temErro = true; }
      if (!limparMascaraMoeda(v.precoVenda)) { novosErrosLocais[`var-${index}-preco`] = "Obrigatório"; temErro = true; }
    });

    if (temErro) return setErrosLocais(novosErrosLocais);

    setLoading(true);
    try {
      const payload = {
         idFuncionario: Number(usuarioLogado.idFuncionario || usuarioLogado.id || 1), 
         ...formGeral,
         nomeGenerico: formGeral.nomeGenerico.trim(),
         nomeCategoria: formGeral.nomeCategoria.trim(),
         ncm: formGeral.ncm ? String(formGeral.ncm).trim() : null,
         variacoes: variacoes.map(v => ({
            nomeVariacao: String(v.nomeVariacao).trim(),
            codigoBarras: v.codigoBarras ? String(v.codigoBarras).trim() : null,
            precoCusto: limparMascaraMoeda(v.precoCusto),
            precoVenda: limparMascaraMoeda(v.precoVenda),
            estoqueInicial: Number(v.estoqueInicial) || 0,
            estoqueMinimo: Number(v.estoqueMinimo) || 5
         }))
      };

      isEdicao 
        ? await produtoService.atualizar(dadosIniciais.idProduto || dadosIniciais.id, payload)
        : await produtoService.cadastrar(payload);

      if (onSalvo) onSalvo();
      fecharModalComAnimacao();
    } catch (error) {
      const msgs = error.backendErrors || (error.errors?.map(e => ({ campo: e.field || "Validação", mensagem: e.defaultMessage }))) || [{ campo: "Erro", mensagem: error.message }];
      setErrosBackend(msgs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        .shake-error { animation: shake-error 0.3s ease-in-out; }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span className="!text-white font-black">{isEdicao ? "Editar Produto" : "Novo Produto"}</span>} 
        subtitulo={<span className="!text-white opacity-60">Catálogo e Estoque</span>} 
        icone={
          <div className="relative w-16 h-16 cursor-pointer group" onClick={() => { if(variacoes.length===1) setFotoDestinoIndex(0); setMenuFotoAberto(true); }}>
            {variacoes[fotoDestinoIndex]?.foto || variacoes[0]?.foto ? (
              <img src={variacoes[fotoDestinoIndex]?.foto || variacoes[0]?.foto} alt="Produto" className="w-full h-full object-cover rounded-full border-2 !border-white/50" />
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-full border border-dashed !border-white/40"><img src={iconeEditar} alt="Edição" className="w-8 h-8 invert opacity-100" /></div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md bg-black/40 backdrop-blur-md !text-white border !border-white/30"><Plus size={14} strokeWidth={4} /></div>
          </div>
        } 
        footer={(fechar) => (
          <div className="flex w-full">
            <button type="button" onClick={fechar} className="flex-1 py-8 flex justify-center opacity-70 hover:opacity-100 group bg-transparent !text-white border-t !border-white/10 hover:bg-white/5"><span className="font-black uppercase text-sm">Cancelar</span></button>
            <button type="submit" form="form-produto" disabled={loading} onClick={(e) => handleSalvar(e, fechar)} className="flex-1 py-8 flex justify-center items-center gap-2 disabled:opacity-30 group bg-transparent hover:bg-white/10 !text-white border-t border-l !border-white/10">
                {loading && <Loader2 size={18} className="animate-spin" />} <span className="font-black uppercase text-sm">Cadastrar</span>
            </button>
          </div>
        )}
      >
        {errosBackend.length > 0 && (
          <div className="mb-6 p-5 rounded-[20px] bg-red-500/20 border !border-red-500/50 flex flex-col gap-2 mt-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest !text-red-200"><AlertTriangle size={14} /> Atenção aos Erros</h4>
            <ul className="pl-6 list-disc text-xs font-bold space-y-1 !text-red-100">{errosBackend.map((e, i) => <li key={i}><span className="opacity-70">{e.campo}:</span> {e.mensagem}</li>)}</ul>
          </div>
        )}

        <form id="form-produto" autoComplete="off" className="flex flex-col gap-8 mt-2 pb-6">
          <Input label="Nome do Produto" value={formGeral.nomeGenerico} onChange={v => handleChangeGeral('nomeGenerico', v)} obrigatorio errorMsg={errosLocais.nomeGenerico} />
          
          <div className="grid grid-cols-2 gap-6">
             <Input label="Categoria" value={formGeral.nomeCategoria} onChange={v => handleChangeGeral('nomeCategoria', v)} obrigatorio errorMsg={errosLocais.nomeCategoria} />
             <Input label="Marca" value={formGeral.marca} onChange={v => handleChangeGeral('marca', v)} />
          </div>

          <div className="relative w-full border-b focus-within:!border-white/60 !border-white/20 pt-5">
             <label className="absolute left-0 top-0 text-[10px] font-black uppercase italic tracking-tighter opacity-60 !text-white">Descrição</label>
             <textarea value={formGeral.descricao} onChange={e => handleChangeGeral('descricao', e.target.value)} rows={2} className="w-full bg-transparent text-sm font-bold outline-none resize-none pb-2 pt-1 mt-2 !text-white placeholder-white/30" />
          </div>

          <div className="flex flex-col gap-4 mt-2">
             <h3 className="text-[10px] font-black uppercase border-b pb-2 mb-2 !border-white/20 opacity-80 flex items-center gap-2 !text-white"><Package size={14} /> Dados Fiscais</h3>
             <AutocompleteNCM label="Código NCM" value={formGeral.ncm} onChange={val => handleChangeGeral("ncm", val)} errorMsg={errosLocais.ncm} />

             <h3 className="text-[10px] font-black uppercase border-b pb-2 mb-2 mt-4 !border-white/20 opacity-80 flex items-center gap-2 !text-white"><Package size={14} /> Variáveis de Venda</h3>
             
             {variacoes.map((v, index) => (
               <div key={index} className="flex flex-col gap-6 p-5 rounded-[24px] border bg-transparent relative transition-all !border-white/20 hover:!border-white/40">
                  {variacoes.length > 1 && <button type="button" onClick={() => handleRemoveVariacao(index)} className="absolute top-4 right-4 !text-red-400 opacity-50 hover:opacity-100"><Trash2 size={16} /></button>}

                  <Input label="Nome da Variação (Ex: P, M, G)" value={v.nomeVariacao} onChange={val => handleChangeVariacao(index, "nomeVariacao", val)} obrigatorio errorMsg={errosLocais[`var-${index}-nome`]} />

                  <div className="relative w-full border-b focus-within:!border-white/60 !border-white/20 pt-5">
                    <label className={`absolute left-0 transition-all font-black uppercase italic !text-white ${v.codigoBarras ? "top-0 text-[10px] opacity-100" : "top-5 text-sm opacity-60"}`}>Código de Barras (EAN)</label>
                    <div className="flex items-center relative">
                      <input type="text" value={v.codigoBarras} onChange={e => handleChangeVariacao(index, "codigoBarras", e.target.value)} className="w-full bg-transparent text-sm font-bold pb-2 pt-1 pr-10 !text-white outline-none" />
                      <button type="button" onClick={() => pesquisarEAN(index)} disabled={feedbackEan.tipo === "loading"} className="absolute right-0 bottom-2 p-1 rounded-md border border-white/30 hover:bg-white/10 !text-white">
                          {feedbackEan.tipo === "loading" && feedbackEan.index === index ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      </button>
                    </div>
                    {feedbackEan.index === index && feedbackEan.msg && (
                      <span className={`absolute -bottom-5 left-0 text-[9px] font-bold uppercase flex items-center gap-1 ${feedbackEan.tipo === 'sucesso' ? '!text-green-400' : '!text-red-400'}`}>
                        {feedbackEan.tipo === 'sucesso' && <CheckCircle size={10} />} {feedbackEan.msg}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <Input label="Preço de Custo" value={v.precoCusto} onChange={val => handleChangeVariacao(index, "precoCusto", val)} />
                     <Input label="Preço de Venda" value={v.precoVenda} onChange={val => handleChangeVariacao(index, "precoVenda", val)} obrigatorio errorMsg={errosLocais[`var-${index}-preco`]} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <Input label="Estoque Inicial" type="number" value={v.estoqueInicial} onChange={val => handleChangeVariacao(index, "estoqueInicial", val)} />
                     <Input label="Estoque Mínimo" type="number" value={v.estoqueMinimo} onChange={val => handleChangeVariacao(index, "estoqueMinimo", val)} />
                  </div>
               </div>
             ))}

             <button type="button" onClick={handleAddVariacao} className="w-full py-4 mt-2 border border-dashed rounded-[20px] font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-white/10 !text-white !border-white/30">
                <Plus size={14} strokeWidth={3} /> Adicionar Nova Variação
             </button>
          </div>
        </form>
      </ModalLateral>

      {menuFotoAberto && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => {setMenuFotoAberto(false); setUseCamera(false);}}>
          <div className="w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col bg-black border !border-white/20" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center !border-white/10">
              <h2 className="text-sm font-black uppercase italic !text-white">Fotografia</h2>
              <button onClick={() => {setMenuFotoAberto(false); setUseCamera(false);}} className="!text-white"><X size={18}/></button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {variacoes.length > 1 && !useCamera && (
                 <div className="relative w-full border-b focus-within:!border-white/60 pt-5 !border-white/20">
                    <label className="absolute left-0 top-0 text-[10px] font-black uppercase italic !text-white">Atrelar foto a qual variedade?</label>
                    <select value={fotoDestinoIndex} onChange={(e) => setFotoDestinoIndex(Number(e.target.value))} className="w-full bg-transparent text-sm font-bold pb-2 pt-1 pr-8 appearance-none !text-white outline-none">
                      {variacoes.map((v, i) => <option key={i} value={i} className="bg-black">{v.nomeVariacao || `Variedade 0${i+1}`}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-0 top-3 !text-white pointer-events-none" />
                 </div>
              )}

              {useCamera ? (
                 <div className="flex flex-col items-center gap-4">
                    <div className="w-full aspect-square rounded-3xl overflow-hidden border !border-white/20"><Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" /></div>
                    <button onClick={() => handleMediaUpload(webcamRef.current.getScreenshot())} className="w-full py-4 rounded-2xl font-black uppercase text-[11px] border !border-white/30 hover:bg-white/10 !text-white">Tirar Foto</button>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setUseCamera(true)} className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-white/20 hover:bg-white/10 !text-white outline-none"><Camera size={28} /><span className="text-[10px] font-black uppercase">Usar Webcam</span></button>
                    <label className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-white/20 hover:bg-white/10 cursor-pointer !text-white"><ImageIcon size={28} /><span className="text-[10px] font-black uppercase">Galeria</span><input type="file" accept="image/*" className="hidden" onChange={handleMediaUpload} /></label>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AutocompleteNCM({ label, value, onChange, obrigatorio, errorMsg }) {
  const [busca, setBusca] = useState(value || "");
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => { setBusca(value || ""); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsFocused(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (busca.length < 3 || busca === value) return setSugestoes([]);
    const timer = setTimeout(async () => {
      setCarregando(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/ncm/v1?search=${busca}`);
        if (res.ok) setSugestoes((await res.json()).slice(0, 15));
        else setSugestoes([]);
      } catch { setSugestoes([]); } 
      finally { setCarregando(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [busca, value]);

  const isActive = isFocused || busca.toString().length > 0;

  return (
    <div className={`relative w-full border-b pt-5 pb-1 ${errorMsg ? '!border-red-500 shake-error' : 'focus-within:!border-white/60 !border-white/20'}`} ref={dropdownRef}>
      <label className={`absolute left-0 transition-all pointer-events-none font-black uppercase italic !text-white ${isActive ? "top-0 text-[10px]" : "top-5 text-sm opacity-60"}`}>{label} {obrigatorio && "*"}</label>
      <div className="relative flex items-center">
        <input type="text" value={busca} onFocus={() => setIsFocused(true)} onChange={(e) => { setBusca(e.target.value); onChange(e.target.value.replace(/\D/g, '')); }} placeholder={isFocused ? "Nome (Ex: Doce) ou Código..." : ""} className="w-full bg-transparent text-sm font-bold pb-1 pt-1 pr-8 outline-none !text-white placeholder-white/30" />
        <div className="absolute right-0 top-1 opacity-50 !text-white">{carregando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}</div>
      </div>
      {errorMsg && <span className="absolute -bottom-5 left-0 text-[9px] font-bold uppercase !text-red-400 animate-pulse">{errorMsg}</span>}
      {isFocused && sugestoes.length > 0 && (
        <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-[20px] border max-h-48 overflow-y-auto bg-black/90 backdrop-blur-md !border-white/20">
          {sugestoes.map((sug) => (
            <li key={sug.codigo} onClick={() => { onChange(sug.codigo); setBusca(sug.codigo); setIsFocused(false); }} className="px-5 py-4 cursor-pointer hover:bg-white/10 border-b !border-white/10 flex flex-col">
              <span className="text-[11px] font-black !text-white">{sug.codigo}</span>
              <span className="text-[9px] font-bold mt-1 opacity-80 !text-white">{sug.descricao}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", obrigatorio, step = "1", errorMsg }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  
  const handleBlur = () => { setIsFocused(false); setIsTouched(true); };
  const isActive = isFocused || safeValue.toString().length > 0;
  const isNumber = type === "number";
  const displayError = errorMsg || (isTouched && obrigatorio && !String(safeValue).trim() ? "Campo obrigatório" : null);

  const adjustValue = (amount) => {
    setIsTouched(true);
    const current = parseFloat(safeValue) || 0;
    const newVal = current + amount;
    onChange(newVal < 0 ? (0).toFixed(step < 1 ? 2 : 0) : newVal.toFixed(step < 1 ? 2 : 0));
  };

  return (
    <div className={`relative w-full border-b pt-5 pb-1 ${displayError ? '!border-red-500 shake-error' : 'focus-within:!border-white/60 !border-white/20'}`}>
      <label className={`absolute left-0 transition-all pointer-events-none font-black uppercase italic !text-white ${isActive ? "top-0 text-[10px]" : "top-5 text-sm opacity-60"}`}>{label} {obrigatorio && "*"}</label>
      <div className="relative flex items-center">
        <input type={type} step={isNumber ? step : undefined} value={safeValue} onFocus={() => setIsFocused(true)} onBlur={handleBlur} onChange={(e) => { setIsTouched(true); onChange(e.target.value); }} className="w-full bg-transparent text-sm font-bold pb-1 pt-1 pr-8 outline-none !text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        {isNumber && (
          <div className="absolute right-0 flex flex-col gap-0.5 opacity-50 hover:opacity-100 !text-white">
            <button type="button" onClick={() => adjustValue(parseFloat(step))}><ChevronUp size={14} /></button>
            <button type="button" onClick={() => adjustValue(-parseFloat(step))}><ChevronDown size={14} /></button>
          </div>
        )}
      </div>
      {displayError && <span className="absolute -bottom-5 left-0 text-[9px] font-bold uppercase !text-red-400 animate-pulse">{displayError}</span>}
    </div>
  );
}