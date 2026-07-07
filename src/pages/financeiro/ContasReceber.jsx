import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, AlertTriangle, 
  ShoppingBag, Wallet, FileText, 
  Download, Loader2, AlertCircle, MessageSquare
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import apiFetch from "../../services/api";

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ContasReceber() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [buscaIdCliente, setBuscaIdCliente] = useState(""); 
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const buscarContasDoCliente = async (e) => {
    if (e) e.preventDefault();
    if (!buscaIdCliente.trim()) {
        setErro("Digite o ID do cliente para buscar o crediário.");
        return;
    }

    setLoading(true);
    setErro(null);
    setClienteSelecionado(null);

    try {
      const response = await apiFetch(`/contas-receber/cliente/${buscaIdCliente}`);
      
      const contasDoCliente = await response.json();
      
      if (!contasDoCliente || contasDoCliente.length === 0) {
          throw new Error("Este cliente não possui histórico de crediário.");
      }

      const dadosProcessados = processarDadosDoBackend(contasDoCliente);
      setClienteSelecionado(dadosProcessados);

    } catch (error) {
      console.error("Falha na requisição:", error);
      setErro(error.message || "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const processarDadosDoBackend = (contas) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const cliRef = contas[0].cliente || {};

    const clienteProcessado = {
        id: cliRef.id || cliRef.idCliente || buscaIdCliente,
        nome: cliRef.nomeCompleto || cliRef.nome || "Cliente não identificado",
        cpf: cliRef.cpf || "-",
        telefone: cliRef.telefone || "", 
        limiteCredito: cliRef.limiteCredito || 0,
        totalDevido: 0,
        totalAtrasado: 0,
        extrato: []
    };

    contas.forEach(conta => {
        if (conta.status === 'QUITADA') return;

        (conta.parcelas || []).forEach(parcela => {
            if (parcela.status !== 'PAGA') {
                const valorRef = parcela.valorOriginal || 0;
                const dataVenc = new Date(parcela.dataVencimento);
                
                clienteProcessado.totalDevido += valorRef;

                const isAtrasada = parcela.status === 'ATRASADA' || dataVenc < hoje;
                
                if (isAtrasada) {
                    clienteProcessado.totalAtrasado += valorRef;
                }

                const mesReferenciaStr = dataVenc.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                const mesReferenciaFormatado = mesReferenciaStr.charAt(0).toUpperCase() + mesReferenciaStr.slice(1);

                clienteProcessado.extrato.push({
                    idVenda: conta.venda?.idVenda || conta.id,
                    data: parcela.dataVencimento,
                    hora: conta.venda?.dataVenda ? new Date(conta.venda.dataVenda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "00:00",
                    descricao: `Venda #${conta.venda?.idVenda || conta.id} - Parcela ${parcela.numeroParcela} de ${conta.quantidadeParcelas}`,
                    valor: valorRef,
                    status: isAtrasada ? "ATRASADO" : "PENDENTE",
                    mesReferencia: mesReferenciaFormatado
                });
            }
        });
    });

    clienteProcessado.extrato.sort((a, b) => new Date(a.data) - new Date(b.data));

    const mesesAtrasoSet = new Set(
        clienteProcessado.extrato.filter(e => e.status === 'ATRASADO').map(e => e.mesReferencia)
    );

    return {
        ...clienteProcessado,
        resumo: {
            totalDevido: clienteProcessado.totalDevido,
            totalAtrasado: clienteProcessado.totalAtrasado,
            mesesEmAtraso: Array.from(mesesAtrasoSet),
            comprasMesAtual: 0 
        }
    };
  };

  const limparSelecao = () => {
    setClienteSelecionado(null);
    setBuscaIdCliente("");
    setErro(null);
  };

  const formatarMoeda = (valor) => (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatarData = (dataString) => {
    if (!dataString || dataString === "-") return "-";
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString("pt-BR");
  };

  const enviarWhatsApp = () => {
    if (!clienteSelecionado) return;

    let mensagem = `Olá *${formatarTitleCase(clienteSelecionado.nome)}*, tudo bem? 👋\n\n`;
    mensagem += `Segue o resumo do seu crediário no nosso sistema:\n`;
    mensagem += `🧾 *Total Devido:* ${formatarMoeda(clienteSelecionado.resumo.totalDevido)}\n`;

    if (clienteSelecionado.resumo.totalAtrasado > 0) {
      mensagem += `⚠️ *Total em Atraso:* ${formatarMoeda(clienteSelecionado.resumo.totalAtrasado)}\n`;
    }

    mensagem += `\n*EXTRATO DETALHADO:*\n`;
    
    clienteSelecionado.extrato.forEach(compra => {
      const isAtrasado = compra.status === "ATRASADO";
      const icone = isAtrasado ? "🔴" : "🟢";
      mensagem += `${icone} ${formatarData(compra.data)} - ${formatarMoeda(compra.valor)}\n`;
      mensagem += `   ↳ ${compra.descricao}\n`;
    });

    mensagem += `\nQualquer dúvida, estamos à disposição!`;

    const mensagemCodificada = encodeURIComponent(mensagem);
    const telefoneLimpo = clienteSelecionado.telefone ? clienteSelecionado.telefone.replace(/\D/g, '') : '';
    
    const url = telefoneLimpo 
      ? `https://wa.me/55${telefoneLimpo}?text=${mensagemCodificada}` 
      : `https://wa.me/?text=${mensagemCodificada}`;

    window.open(url, '_blank');
  };

  return (
    <>
      <style>{`
        .custom-slim-scroll::-webkit-scrollbar { width: 6px; }
        .custom-slim-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-slim-scroll::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
      `}</style>

      <div className="w-full h-full font-sans flex flex-col animate-in fade-in duration-500 transition-colors bg-transparent gap-6 pb-10 lg:pb-0 px-3">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 mt-4 mb-2 gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
              <button 
                onClick={() => navigate(-1)} 
                className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110 hover:-translate-x-1 outline-none opacity-60 hover:opacity-100 shrink-0"
                style={{ color: 'var(--text-main)' }}
              >
                  <ArrowLeft strokeWidth={2.5} />
              </button>
              <div className="flex flex-col">
                  <h1 className="text-2xl font-black uppercase italic tracking-tight leading-none" style={{ color: 'var(--bg-sidebar)' }}>
                    Contas a Receber
                  </h1>
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-widest mt-1 font-bold opacity-40" style={{ color: 'var(--text-main)' }}>
                    Gestão de Crediário
                  </p>
              </div>
          </div>
          
          {clienteSelecionado ? (
              <button 
                onClick={limparSelecao} 
                className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border hover:opacity-80 mt-4 md:mt-0 w-full md:w-auto text-center outline-none"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                 Nova Busca
              </button>
          ) : (
              <form onSubmit={buscarContasDoCliente} className="relative w-full md:max-w-md flex gap-2">
                  <div className="relative flex-1">
                      <input 
                          type="text" 
                          placeholder="Digite o ID do Cliente..." 
                          value={buscaIdCliente} 
                          onChange={(e) => setBuscaIdCliente(e.target.value)} 
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none shadow-sm transition-colors text-xs font-bold focus:border-current"
                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      />
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-main)' }} />
                  </div>
                  <button 
                    type="submit"
                    className="px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 text-white shadow-md outline-none"
                    style={{ backgroundColor: 'var(--bg-sidebar)' }}
                  >
                      Buscar
                  </button>
              </form>
          )}
        </header>

        {loading && (
            <div className="flex flex-col items-center justify-center flex-1 rounded-2xl border shadow-sm bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
                <Loader2 size={40} className="animate-spin mb-4" style={{ color: 'var(--bg-sidebar)' }} />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Buscando dados no servidor...</p>
            </div>
        )}

        {erro && !loading && (
            <div className="flex flex-col items-center justify-center flex-1 rounded-2xl border p-8 text-center bg-red-500/10 border-red-500/20">
                <AlertCircle size={40} className="mb-4 text-red-500 opacity-50" />
                <p className="text-sm font-bold text-red-500 uppercase tracking-wide">{erro}</p>
                <button onClick={limparSelecao} className="mt-6 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 outline-none flex items-center gap-2">
                  <ArrowLeft size={12} /> Tentar Novamente
                </button>
            </div>
        )}

        {!loading && !erro && !clienteSelecionado && (
            <div className="flex flex-col items-center justify-center flex-1 rounded-2xl border shadow-sm opacity-60 bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
                <Search size={40} className="mb-4 opacity-30" style={{ color: 'var(--text-main)' }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Digite o ID do cliente na barra acima.</p>
                <p className="text-[9px] font-bold tracking-widest mt-2 opacity-40 italic" style={{ color: 'var(--text-main)' }}>Ex: 1, 2, 50...</p>
            </div>
        )}

        {clienteSelecionado && !loading && (
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden animate-in slide-in-from-right-8 duration-300 bg-transparent pb-4">
                
                <div className="flex flex-col flex-1 min-h-0 gap-6">
                    
                    {clienteSelecionado.resumo.totalAtrasado > 0 && (
                        <div className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 bg-red-500/10 border-red-500/30 shrink-0 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-500">
                                    <AlertTriangle size={20} strokeWidth={2.5} className="animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-red-500">
                                        Atenção: Constam débitos em atraso
                                    </h3>
                                    <p className="text-[10px] font-bold mt-1 text-red-500/80 uppercase">
                                        Ref: {clienteSelecionado.resumo.mesesEmAtraso.join(", ")}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-red-500/80">Total Atrasado</p>
                                <p className="text-2xl font-black tracking-tighter text-red-500">
                                    {formatarMoeda(clienteSelecionado.resumo.totalAtrasado)}
                                </p>
                            </div>
                        </div>
                    )}

                    <div 
                      className="flex flex-col flex-1 overflow-hidden rounded-2xl border shadow-sm"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                        <div className="p-6 border-b flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50" style={{ color: 'var(--text-main)' }}>
                                <FileText size={14} strokeWidth={2.5} style={{ color: 'var(--text-main)' }} />
                                Extrato Detalhado
                            </h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                  onClick={enviarWhatsApp}
                                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm text-white outline-none"
                                  style={{ backgroundColor: '#25D366' }} 
                                >
                                    <MessageSquare size={14} strokeWidth={2.5} /> Enviar Cobrança
                                </button>
                                <button 
                                  className="p-2.5 rounded-xl border transition-colors hover:opacity-70 flex items-center justify-center outline-none shadow-sm"
                                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', backgroundColor: 'var(--bg-body)' }}
                                >
                                    <Download size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-slim-scroll p-4 bg-transparent">
                            <div className="flex flex-col gap-3">
                                {clienteSelecionado.extrato.map((compra, idx) => {
                                    const isAtrasado = compra.status === "ATRASADO";
                                    return (
                                        <div 
                                          key={idx} 
                                          className="p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-current bg-[var(--bg-body)]"
                                          style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div 
                                                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isAtrasado ? 'bg-red-500/10 border-red-500/30 text-red-500' : ''}`}
                                                  style={isAtrasado ? {} : { backgroundColor: 'var(--bg-card)', borderColor: 'transparent', color: 'var(--text-main)' }}
                                                >
                                                    <span className="text-[10px] font-black uppercase leading-none" style={{ opacity: isAtrasado ? 1 : 0.7 }}>{compra.data.split('-')[2]}</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-50">{compra.mesReferencia.substring(0, 3)}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isAtrasado ? 'text-red-500' : ''}`} style={isAtrasado ? {} : { color: 'var(--text-main)', opacity: 0.4 }}>
                                                        {isAtrasado ? 'VENCIDO' : 'A VENCER'} • {compra.hora}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>
                                                        {compra.descricao.split(' - ')[0]}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-1 px-0 sm:px-4">
                                                <p className="text-[10px] font-bold leading-relaxed line-clamp-2 opacity-60 uppercase" style={{ color: 'var(--text-main)' }}>
                                                    <ShoppingBag size={12} className="inline mr-1 opacity-50 mb-0.5" /> 
                                                    {compra.descricao}
                                                </p>
                                            </div>

                                            <div className="text-left sm:text-right shrink-0">
                                                <p className={`text-lg font-black tracking-tighter tabular-nums ${isAtrasado ? 'text-red-500' : ''}`} style={isAtrasado ? {} : { color: 'var(--text-main)' }}>
                                                    {formatarMoeda(compra.valor)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {clienteSelecionado.extrato.length === 0 && (
                                    <div className="p-10 text-center opacity-40 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                        Nenhuma pendência encontrada.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-6">
                    
                    <div 
                      className="p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border-4"
                          style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--bg-sidebar)' }}
                        >
                            <span className="text-2xl font-black opacity-30">{clienteSelecionado.nome.charAt(0)}</span>
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {formatarTitleCase(clienteSelecionado.nome)}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-40" style={{ color: 'var(--text-main)' }}>CPF: {clienteSelecionado.cpf}</p>
                    </div>

                    <div 
                      className="p-6 rounded-2xl border shadow-sm flex flex-col gap-5"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-40" style={{ color: 'var(--text-main)' }}>Resumo da Fatura</h3>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 opacity-80">Em Atraso</span>
                            <span className="text-sm font-black text-red-500">{formatarMoeda(clienteSelecionado.resumo.totalAtrasado)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Mês Atual</span>
                            <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{formatarMoeda(clienteSelecionado.resumo.comprasMesAtual)}</span>
                        </div>

                        <div className="w-full h-px opacity-20" style={{ backgroundColor: 'var(--border-color)' }} />

                        <div className="flex justify-between items-end">
                            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Total Devido</span>
                            <span className="text-3xl font-black tracking-tighter" style={{ color: 'var(--bg-sidebar)' }}>
                                {formatarMoeda(clienteSelecionado.resumo.totalDevido)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <button 
                            onClick={() => alert("Chamar a rota POST /contas-receber/pagar enviando o ID do cliente e o valor.")}
                            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 outline-none"
                            style={{ backgroundColor: 'var(--bg-sidebar)' }}
                        >
                            <Wallet size={18} /> Receber Pagamento
                        </button>
                        <p className="text-center text-[9px] font-bold uppercase tracking-widest mt-4 opacity-40" style={{ color: 'var(--text-main)' }}>
                            Baixa em cascata: O sistema quitará primeiro as dívidas mais antigas.
                        </p>
                    </div>

                </div>
            </div>
        )}

      </div>
    </>
  );
}