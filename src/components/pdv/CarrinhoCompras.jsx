import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import { Loader2, X, ChevronLeft, Check, Plus, Minus, Trash2, AlertTriangle } from "lucide-react";
import { useCarrinho } from "../../context/CarrinhoContext";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../services/api";
import carrinhocon from "../../assets/icons/carrinho.png";
import pesquisarIcon from "../../assets/icons/pesquisar.png";
import dinheiroIcon from "../../assets/icons/dinheiro.png";
import transferirIcon from "../../assets/icons/transferir.png"; 
import cartaoIcon from "../../assets/icons/cartao.png";
import crediarioIcon from "../../assets/icons/crediario.png";

const parsePrice = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    let str = String(value).replace(/[^\d.,-]/g, '').trim();
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const maskCurrency = (value) => {
    let v = String(value).replace(/\D/g, "");
    v = (Number(v) / 100).toFixed(2);
    return v.replace(".", ",");
};

const normalizarTexto = (texto) => {
    if (!texto) return "";
    return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const MessageBar = ({ message, type, onClose }) => {
    if (!message) return null;
    const colors = { error: "bg-red-500", success: "bg-green-500", info: "bg-blue-500", default: "bg-gray-800" };
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-xl shadow-2xl z-[200] text-white ${colors[type] || colors.default} animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3`}>
            <span className="text-sm font-medium flex-1 text-center break-words">{message}</span>
            <button onClick={onClose} className="outline-none"><X size={16} /></button>
        </div>
    );
};

const FloatingInputWithSuggestions = ({ label, value, onChange, onFocus, suggestions = [], onSelectSuggestion, loading, displayField = "nome", secondaryField, moneyFormat, icon }) => {
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef(null);
  const uniqueId = useId();

  useEffect(() => {
    const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsFocused(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-full group pt-2" ref={wrapperRef}>
      <label htmlFor={uniqueId} className={`absolute left-0 transition-all duration-200 pointer-events-none z-10 flex items-center gap-2 ${(isFocused || value) ? "top-0 text-[10px] uppercase tracking-widest text-white font-bold opacity-100" : "top-4 text-sm text-white/70"}`}>
        {icon && <img src={icon} alt="" className="w-4 h-4 object-contain invert brightness-0" />} {label}
      </label>
      <input id={uniqueId} name={uniqueId} type="text" value={value || ""} onChange={onChange} onFocus={() => { setIsFocused(true); onFocus?.(); }} className="peer w-full bg-transparent border-b-[1.5px] border-white/40 pt-4 pb-2 text-white font-bold text-sm outline-none focus:border-white transition-all placeholder-transparent" autoComplete="off" />
      {loading && <div className="absolute right-0 top-4 text-white/50"><Loader2 size={16} className="animate-spin" /></div>}
      
      {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-white text-gray-800 rounded-b-lg shadow-xl max-h-60 overflow-y-auto z-50 mt-1 border-t-2 border-[var(--bg-sidebar)] custom-scrollbar">
              {suggestions.map((item, idx) => (
                <div key={idx} onClick={() => { onSelectSuggestion(item); setIsFocused(false); }} className="p-3 hover:bg-black/5 cursor-pointer border-b border-gray-100 flex justify-between items-center text-gray-800">
                    <div className="flex flex-col">
                        <span className="font-bold truncate pr-2 text-xs uppercase text-gray-800">{item[displayField]}</span>
                        {item.nomeVariacao && <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Var: {item.nomeVariacao}</span>}
                        {item.cpf && <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">CPF: {item.cpf}</span>}
                    </div>
                    {secondaryField && <span className="text-[10px] font-black tracking-widest text-[var(--bg-sidebar)] bg-black/5 px-2 py-1 rounded-md">{moneyFormat ? formatCurrency(item[secondaryField]) : item[secondaryField]}</span>}
                </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default function CarrinhoCompras({ onClose, produtoParaAdicionar, isFixed = false }) { 
  const { 
    itens = [], cliente, setCliente, subtotal = 0, adicionarAoCarrinho, removerDoCarrinho, 
    atualizarQuantidade, limparCarrinho, pagamentos = [], adicionarPagamento, removerPagamento, totalPago = 0, finalizarVenda 
  } = useCarrinho();

  const [step, setStep] = useState(1);
  const [fechando, setFechando] = useState(false); 
  const [funcionarioAtivo, setFuncionarioAtivo] = useState(true);
  const [searchCarrinho, setSearchCarrinho] = useState("");
  const [clienteInput, setClienteInput] = useState("");
  const [produtoInput, setProdutoInput] = useState("");
  const [descontoInput, setDescontoInput] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [sugestoesClientes, setSugestoesClientes] = useState([]);
  const [sugestoesProdutos, setSugestoesProdutos] = useState([]);
  const [metodoSelecionado, setMetodoSelecionado] = useState(null); 
  const [valorPagamentoInput, setValorPagamentoInput] = useState("");
  const [tipoCartao, setTipoCartao] = useState("CREDITO"); 
  const [last4, setLast4] = useState("");
  const [pinCrediario, setPinCrediario] = useState(""); 
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState({ clientes: false, produtos: false });
  const [messageState, setMessageState] = useState({ text: null, type: null });
  const showMessage = (text, type) => setMessageState({ text, type });
  const closeMessage = () => setMessageState({ text: null, type: null });
  
  const fecharPainel = () => { 
      setFechando(true); 
      setTimeout(() => { setFechando(false); onClose?.(); }, 300); 
  };

  const handleDescartarVenda = () => {
      if (limparCarrinho) limparCarrinho();
      setClienteInput("");
      setProdutoInput("");
      setDescontoInput("");
      setObservacoes("");
      setPinCrediario("");
      setVendaFinalizada(null);
      setStep(1);
  }

  const imprimirReciboTermico = (vendaRetorno) => {
    const janela = window.open('', '', 'width=400,height=600');
    if(!janela) return;
    const descontoRealizado = vendaRetorno.valorBruto - vendaRetorno.valorTotal;
    const htmlContent = `
      <html>
        <head><title>Recibo de Venda</title><style>body { font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #000; margin: 0; padding: 20px; max-width: 350px; background: #fff;} .center { text-align: center; } .bold { font-weight: bold; } .line { border-bottom: 1px dashed #000; margin: 10px 0; } table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; } td { padding: 4px 0; } .right { text-align: right; } .total-row { font-size: 15px; font-weight: bold; } h2 { margin: 0 0 5px 0; font-size: 18px; }</style></head>
        <body>
          <div class="center"><h2>RECIBO DE VENDA</h2><div>Data: ${new Date().toLocaleString('pt-BR')}</div><div>Venda ID: #${vendaRetorno.idVenda}</div><div>Atendente: ${vendaRetorno.nomeFuncionario || 'Caixa'}</div>${vendaRetorno.nomeCliente ? `<div>Cliente: ${vendaRetorno.nomeCliente}</div>` : ''}</div>
          <div class="line"></div>
          <table>${vendaRetorno.itens.map(i => `<tr><td colspan="3" class="bold">${i.nomeProduto}</td></tr><tr><td>${i.quantidade}x</td><td>${formatCurrency(i.precoUnitario)}</td><td class="right">${formatCurrency(i.subtotal)}</td></tr>`).join('')}</table>
          <div class="line"></div>
          <table>
            <tr><td>Subtotal</td><td class="right">${formatCurrency(vendaRetorno.valorBruto || 0)}</td></tr>
            ${descontoRealizado > 0 ? `<tr><td>Descontos</td><td class="right">- ${formatCurrency(descontoRealizado)}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL</td><td class="right">${formatCurrency(vendaRetorno.valorTotal)}</td></tr>
            <tr><td>Pagamento</td><td class="right">${vendaRetorno.metodoPagamento || 'MISTO'}</td></tr>
          </table>
          <div class="line"></div>
          <div class="center"><p>Obrigado pela preferência!</p><p style="font-size: 10px;">${vendaRetorno.observacoes ? 'Obs: ' + vendaRetorno.observacoes : ''}</p></div>
        </body>
      </html>`;
    janela.document.write(htmlContent);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 500);
  };

  useEffect(() => { if (produtoParaAdicionar && produtoParaAdicionar.id && adicionarAoCarrinho) handleAddProdutoDireto(produtoParaAdicionar); }, [produtoParaAdicionar]); 

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("usuario") || localStorage.getItem("@CtrlBase:user") || "{}");
      if (user.ativo === false) setFuncionarioAtivo(false);
    } catch (e) {}
  }, []);

  useEffect(() => { setClienteInput(cliente ? (cliente.nomeCompleto || cliente.nome) : ""); }, [cliente]);

  useEffect(() => {
    const timer = setTimeout(async () => {
        if (clienteInput.length > 2 && !cliente) {
            setLoadingSearch(p => ({ ...p, clientes: true }));
            try {
                const res = await apiFetch(`/clientes?busca=${encodeURIComponent(clienteInput)}`);
                const data = await res.json();
                setSugestoesClientes(Array.isArray(data) ? data : (data.content || []));
            } catch {} finally { setLoadingSearch(p => ({ ...p, clientes: false })); }
        } else setSugestoesClientes([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [clienteInput, cliente]);

  useEffect(() => {
    const timer = setTimeout(async () => {
        if (produtoInput.length >= 2) { 
            setLoadingSearch(p => ({ ...p, produtos: true }));
            try {
                const res = await apiFetch(`/produtos?busca=${encodeURIComponent(produtoInput)}`);
                const data = await res.json();
                const listaRaw = Array.isArray(data) ? data : (data.content || []);
                const listaExpandida = [];
                listaRaw.forEach(p => {
                    if (p.variacoes && p.variacoes.length > 0) {
                        p.variacoes.forEach(v => listaExpandida.push({ ...p, ...v, idRealParaBack: v.id, precoSugerido: v.precoVenda || v.precoCusto }));
                    } else listaExpandida.push({ ...p, idRealParaBack: p.id, precoSugerido: p.precoVenda || p.precoBase });
                });
                setSugestoesProdutos(listaExpandida.slice(0, 30));
            } catch {} finally { setLoadingSearch(p => ({ ...p, produtos: false })); }
        } else setSugestoesProdutos([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [produtoInput]);

  const handleAddProdutoDireto = (prod) => {
      if (!prod.idRealParaBack && !prod.id) return showMessage("Erro: Variação não identificada.", "error");
      if (adicionarAoCarrinho) {
          adicionarAoCarrinho({ 
              ...prod, 
              nomeGenerico: prod.nomeGenerico || prod.nomeCompleto || prod.nome, 
              preco: prod.precoSugerido || parsePrice(prod.valorVenda || prod.preco),
              idRealParaBack: prod.idRealParaBack || prod.id
          });
      }
      setProdutoInput(""); setSugestoesProdutos([]);
  };

  const descontoReal = useMemo(() => {
      if (!descontoInput) return 0;
      const txt = descontoInput.trim();
      const val = parsePrice(txt.replace("%", ""));
      return txt.includes("%") ? (subtotal * val) / 100 : Math.min(val, subtotal);
  }, [descontoInput, subtotal]);

  const totalPagar = Math.max(subtotal - descontoReal, 0);   
  const restante = Math.max(totalPagar - totalPago, 0);

  useEffect(() => {
      if (step === 2 && metodoSelecionado) setValorPagamentoInput(maskCurrency(restante.toFixed(2).replace('.', '')));
  }, [step, metodoSelecionado, restante]);

  const handleAddPagamento = () => {
      if (!funcionarioAtivo) return showMessage("Venda bloqueada.", "error");
      if (!adicionarPagamento) return showMessage("Contexto não atualizado.", "error");

      const valor = parsePrice(valorPagamentoInput);
      if (valor <= 0) return showMessage("Valor inválido.", "error");
      
      let metodoReal = metodoSelecionado;
      let desc = metodoSelecionado;
      
      if (metodoSelecionado === 'CARTAO') {
          if (last4.length < 4) return showMessage("Informe os 4 últimos dígitos.", "error");
          metodoReal = tipoCartao === 'CREDITO' ? 'CREDITO' : 'DEBITO'; 
          desc = `Cartão ${tipoCartao} (Final ${last4})`;
      }
      adicionarPagamento(metodoReal, valor, desc);
      setMetodoSelecionado(null);
      setValorPagamentoInput("");
      setLast4("");
  };

  const processarCheckout = async () => {
      if (!finalizarVenda) return showMessage("Por favor, atualize o arquivo CarrinhoContext.jsx!", "error");
      if (!funcionarioAtivo) return showMessage("Funcionário inativo.", "error");
      if (restante > 0.01) return showMessage(`Falta pagar: ${formatCurrency(restante)}`, "error");
      if (pagamentos.length === 0) return showMessage("Adicione um pagamento.", "error");
      if (!cliente) return showMessage("Informe o cliente.", "error");
      
      const possuiCrediario = pagamentos.some(p => p.metodo === 'CREDIARIO');
      if (possuiCrediario && !pinCrediario) return showMessage("A senha (PIN) é obrigatória para Crediário.", "error");

      setLoadingGlobal(true);
      try {
          const resultadoVenda = await finalizarVenda({ observacoes, descontoManual: descontoReal, pinCrediario, parcelasCrediario: 1 });
          
          if (['PIX', 'CREDITO', 'DEBITO'].includes(pagamentos[0]?.metodo)) {
              showMessage("Aguardando finalização no terminal (Maquininha)...", "info");
          } else {
              showMessage("Venda finalizada com sucesso!", "success");
          }
          setVendaFinalizada(resultadoVenda);
          setStep(3);
      } catch (e) {
          showMessage(`Falha: ${e.message}`, "error");
      } finally { 
          setLoadingGlobal(false); 
      }
  };

  const PaymentBtn = ({ label, icon, method }) => (
      <button onClick={() => setMetodoSelecionado(method)} disabled={!funcionarioAtivo} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all outline-none bg-transparent ${metodoSelecionado === method ? 'bg-white/20 shadow-lg scale-105' : 'hover:bg-white/10'} ${!funcionarioAtivo ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <img src={icon} alt={label} className="w-8 h-8 mb-2 object-contain invert brightness-0" />
          <span className="text-[10px] font-black tracking-widest uppercase text-white">{label}</span>
      </button>
  );

  const panelClasses = isFixed ? "w-full h-full" : `fixed top-1/2 right-4 -translate-y-1/2 h-[calc(100%-4rem)] w-[420px] shadow-2xl transition-transform duration-300 ${fechando ? "translate-x-full" : "translate-x-0"}`;
  
  return (
    <>
    <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }`}</style>
    {!isFixed && !fechando && <div className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm" onClick={fecharPainel} />}
    
    <div className={`${panelClasses} bg-[var(--bg-sidebar)] text-white rounded-[30px] flex flex-col overflow-hidden z-[999]`}>
        
        {!isFixed && <button onClick={fecharPainel} className="absolute top-6 right-6 text-white/70 hover:text-white transition z-20 outline-none"><X size={24} /></button>}

        <div className="flex items-center gap-4 pt-10 px-8 pb-4 flex-shrink-0 border-b border-white/20 relative">
            {step === 2 && <button onClick={() => setStep(1)} className="hover:bg-white/10 rounded-full p-1 -ml-2 transition-colors outline-none absolute left-6"><ChevronLeft size={28}/></button>}
            <div className={`flex items-center gap-3 ${step === 2 ? 'ml-10' : ''}`}>
                <img src={carrinhocon} className="w-8 h-8 invert brightness-0" alt="Carrinho" /> 
                <div className="flex flex-col">
                    <p className="text-2xl font-black italic uppercase tracking-tighter leading-none">Carrinho</p>
                </div>
            </div>
        </div>

        {!funcionarioAtivo && (
            <div className="mx-8 mt-4 bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse flex-shrink-0">
                <AlertTriangle size={20} />
                <div className="text-xs"><strong className="block text-sm">Vendas Bloqueadas</strong>Funcionário inativo no sistema.</div>
            </div>
        )}

        <div className="flex-1 flex flex-col px-8 pb-6 overflow-y-auto custom-scrollbar">
            
            {step === 1 && (
                <div className="flex flex-col h-full animate-in fade-in">
                    <div className="space-y-4 mt-2 flex-shrink-0">
                        <FloatingInputWithSuggestions label="Pesquisar Produto" value={produtoInput} onChange={(e) => setProdutoInput(e.target.value)} suggestions={sugestoesProdutos} onSelectSuggestion={handleAddProdutoDireto} loading={loadingSearch.produtos} displayField="nomeGenerico" secondaryField="precoSugerido" moneyFormat icon={pesquisarIcon} />
                        <FloatingInputWithSuggestions label="Buscar Carrinho" value={searchCarrinho} onChange={(e) => setSearchCarrinho(e.target.value)} /> 
                        <div className="relative">
                            <FloatingInputWithSuggestions label={cliente ? "Cliente Selecionado" : "Vincular Cliente"} value={clienteInput} onChange={(e) => { setClienteInput(e.target.value); setCliente(null); }} suggestions={sugestoesClientes} onSelectSuggestion={(c) => { setCliente(c); setClienteInput(c.nomeCompleto || c.nome); setSugestoesClientes([]); }} loading={loadingSearch.clientes} displayField="nomeCompleto" secondaryField="cpf" />
                            {cliente && <div className="absolute right-0 top-5 text-white animate-in zoom-in"><Check size={18} /></div>}
                        </div>
                        <FloatingInputWithSuggestions label="Desconto Manual (R$ ou %)" value={descontoInput} onChange={(e) => setDescontoInput(e.target.value)} />
                        <FloatingInputWithSuggestions label="Observação da Venda" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                    </div>

                    <div className="flex-1 mt-6 mb-2 overflow-y-auto min-h-[150px] space-y-4 custom-scrollbar">
                        {itens.length > 0 ? itens.filter(i => normalizarTexto(i.nomeGenerico).includes(normalizarTexto(searchCarrinho))).map(item => {
                            const totalItem = parsePrice(item.preco) * Number(item.quantidade);
                            return (
                                <div key={item.carrinhoItemId} className="py-3 border-b border-white/20 animate-in slide-in-from-right-4">
                                    <span className="block text-sm font-black italic uppercase tracking-tight truncate mb-1">{item.nomeGenerico}</span>
                                    {item.nomeVariacao && <span className="block text-[10px] font-bold opacity-80 uppercase tracking-widest mb-2">Var: {item.nomeVariacao}</span>}
                                    <div className="flex justify-between items-end mt-1">
                                        <div className="flex items-baseline gap-2 text-sm">
                                            <span className="opacity-70 text-xs font-bold">Und: {formatCurrency(item.preco)}</span>
                                            <span className="font-black italic">Total: {formatCurrency(totalItem)}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => atualizarQuantidade && atualizarQuantidade(item.carrinhoItemId, -1)} className="p-1 hover:bg-white/20 rounded outline-none disabled:opacity-30" disabled={item.quantidade <= 1}><Minus size={16}/></button>
                                            <span className="font-black text-sm w-4 text-center">{item.quantidade}</span>
                                            <button onClick={() => atualizarQuantidade && atualizarQuantidade(item.carrinhoItemId, 1)} className="p-1 hover:bg-white/20 rounded outline-none"><Plus size={16}/></button>
                                            <button onClick={() => removerDoCarrinho && removerDoCarrinho(item.carrinhoItemId)} className="ml-2 text-white/60 hover:text-white outline-none transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mt-10">Carrinho vazio</p>}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/20 space-y-2 text-sm flex-shrink-0">
                        <div className="flex justify-between opacity-80 font-bold uppercase tracking-widest text-[10px]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {descontoReal > 0 && <div className="flex justify-between opacity-80 font-bold uppercase tracking-widest text-[10px]"><span>Desconto</span><span>- {formatCurrency(descontoReal)}</span></div>}
                        <div className="flex justify-between text-2xl font-black italic tracking-tighter pt-3 border-t border-white/10"><span>Total</span><span>{formatCurrency(totalPagar)}</span></div>
                        
                        <div className="flex items-center justify-between gap-4 w-full mt-4">
                            <button onClick={handleDescartarVenda} className="flex-1 py-3 bg-transparent text-white font-black uppercase text-[11px] tracking-widest hover:scale-105 transition-transform outline-none">DESCARTAR</button>
                            <div className="w-px h-6 bg-white/30"></div>
                            <button onClick={() => { if (itens.length === 0) return showMessage("Adicione itens.", "error"); if (!cliente) return showMessage("Vincule um cliente antes de pagar.", "error"); setStep(2); }} className="flex-1 bg-transparent text-white font-black uppercase text-[11px] tracking-widest hover:scale-105 transition-transform outline-none disabled:opacity-50" disabled={itens.length === 0 || !funcionarioAtivo}>RECEBER</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col h-full animate-in slide-in-from-right relative pt-4">

                    <div className="grid grid-cols-4 gap-3 mb-6 flex-shrink-0">
                        <PaymentBtn label="Dinheiro" icon={dinheiroIcon} method="DINHEIRO" />
                        <PaymentBtn label="Pix" icon={transferirIcon} method="PIX" />
                        <PaymentBtn label="Cartão" icon={cartaoIcon} method="CARTAO" />
                        <PaymentBtn label="Crediário" icon={crediarioIcon} method="CREDIARIO" />
                    </div>

                    {metodoSelecionado && restante > 0 && (
                        <div className="mb-6 animate-in fade-in zoom-in duration-200 flex-shrink-0">
                            <div className="flex flex-col gap-3 p-4 border border-white/30 rounded-xl bg-white/10 shadow-inner">
                                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-black text-white/90">
                                    <span>{metodoSelecionado}</span>
                                    <span>Restante: {formatCurrency(restante)}</span>
                                </div>
                                
                                {metodoSelecionado === 'CARTAO' && (
                                    <div className="flex gap-2">
                                        {['CREDITO', 'DEBITO'].map(t => (
                                            <button key={t} onClick={() => setTipoCartao(t)} className={`flex-1 py-2 text-[10px] font-black tracking-widest rounded border transition outline-none ${tipoCartao === t ? 'bg-white/20 text-white border-white' : 'border-transparent text-white/60 hover:bg-white/10'}`}>{t}</button>
                                        ))}
                                    </div>
                                )}

                                {metodoSelecionado === 'CREDIARIO' && (
                                    <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/80">Senha (PIN) do Cliente *</label>
                                        <input type="password" placeholder="****" value={pinCrediario} onChange={(e) => setPinCrediario(e.target.value)} className="w-full bg-black/20 text-center text-sm font-bold text-white tracking-widest outline-none py-2 rounded-lg border border-white/20" />
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex-1 border-b border-white/50 focus-within:border-white transition-colors">
                                        <input type="text" value={valorPagamentoInput} onChange={(e) => setValorPagamentoInput(maskCurrency(e.target.value))} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none py-1" />
                                    </div>
                                    {metodoSelecionado === 'CARTAO' && (
                                        <div className="w-20 border-b border-white/50 focus-within:border-white transition-colors">
                                            <input type="text" maxLength={4} placeholder="Final" value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g,''))} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none py-1 placeholder-white/50" />
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleAddPagamento} className="w-full bg-white/20 text-white hover:bg-white/30 font-black tracking-widest text-[11px] py-3 rounded-lg transition shadow-sm mt-3 outline-none">ADICIONAR {formatCurrency(parsePrice(valorPagamentoInput))}</button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar mb-4 border-t border-white/20 pt-4">
                        {pagamentos?.length > 0 ? pagamentos.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-black/10 rounded-xl border border-white/10 text-sm flex-shrink-0 animate-in slide-in-from-left-2">
                                <div><span className="font-bold text-xs uppercase tracking-widest">{p.descricao || p.metodo}</span></div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black italic">{formatCurrency(p.valor)}</span>
                                    <button onClick={() => removerPagamento && removerPagamento(p.id)} className="text-white/60 hover:text-red-300 outline-none transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        )) : <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest italic mt-4">Nenhum pagamento adicionado.</p>}
                    </div>

                    <div className="mt-auto border-t border-white/20 pt-4 space-y-2 flex-shrink-0">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-80"><span>Total Venda</span><span>{formatCurrency(totalPagar)}</span></div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-emerald-300"><span>Total Recebido</span><span>{formatCurrency(totalPago)}</span></div>
                        
                        <div className="flex justify-between text-2xl font-black italic tracking-tighter pt-3 border-t border-white/10 mb-4">
                            <span>Faltam</span>
                            <span className={restante > 0 ? "text-white" : "text-emerald-300"}>{restante > 0 ? formatCurrency(restante) : "Pago"}</span>
                        </div>

                        <button 
                            onClick={processarCheckout} 
                            disabled={restante > 0.01 || loadingGlobal || !funcionarioAtivo} 
                            className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition shadow-lg outline-none flex justify-center items-center gap-2 ${restante <= 0.01 && funcionarioAtivo ? 'bg-white text-[var(--bg-sidebar)] hover:bg-gray-100' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}
                        >
                            {loadingGlobal ? <Loader2 className="animate-spin"/> : (restante > 0.01 ? "AGUARDANDO PAGAMENTO" : "FINALIZAR VENDA")}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && vendaFinalizada && (
                <div className="flex flex-col h-full animate-in slide-in-from-right relative pt-4">
                    <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 bg-white text-black p-6 rounded-xl shadow-inner relative">
                        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                            <h2 className="text-xl font-black uppercase tracking-tighter">Recibo de Venda</h2>
                            <p className="text-xs text-gray-500 font-bold mt-1">Pedido #{vendaFinalizada.idVenda}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                        
                        <div className="space-y-3 mb-4 text-xs font-medium">
                            <div className="flex justify-between">
                                <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Atendente</span>
                                <span className="font-bold">{vendaFinalizada.nomeFuncionario || 'Caixa'}</span>
                            </div>
                            {vendaFinalizada.nomeCliente && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Cliente</span>
                                    <span className="font-bold">{vendaFinalizada.nomeCliente}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t-2 border-dashed border-gray-300 pt-4 mb-4 space-y-3">
                            {vendaFinalizada.itens?.map((i, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="font-bold">{i.quantidade}x {i.nomeProduto}</span>
                                    <span className="font-black text-gray-700">{formatCurrency(i.subtotal)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatCurrency(vendaFinalizada.valorBruto || 0)}</span>
                            </div>
                            {(vendaFinalizada.valorBruto - vendaFinalizada.valorTotal) > 0 && (
                                <div className="flex justify-between text-xs text-red-500">
                                    <span>Descontos</span>
                                    <span>- {formatCurrency(vendaFinalizada.valorBruto - vendaFinalizada.valorTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black mt-2">
                                <span>TOTAL</span>
                                <span>{formatCurrency(vendaFinalizada.valorTotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Pagamento</span>
                                <span className="font-bold uppercase">{vendaFinalizada.metodoPagamento || 'MISTO'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto border-t border-white/20 pt-4 flex gap-4 w-full flex-shrink-0">
                        <button onClick={handleDescartarVenda} className="flex-1 py-4 bg-transparent text-white font-black uppercase text-xs tracking-widest border border-white/40 rounded-xl hover:bg-white/10 transition-all outline-none">Nova Venda</button>
                        <button onClick={() => imprimirReciboTermico(vendaFinalizada)} className="flex-1 bg-white text-[var(--bg-sidebar)] font-black py-4 rounded-xl hover:bg-gray-100 transition shadow-lg uppercase tracking-widest text-xs outline-none">Imprimir</button>
                    </div>
                </div>
            )}
            
        </div>
        <MessageBar message={messageState.text} type={messageState.type} onClose={closeMessage} />
    </div>
    </>
  );
}