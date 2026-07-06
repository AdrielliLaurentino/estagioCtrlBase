import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, User, Mail, Phone, FileText, 
  ShoppingBag, Activity, Edit, Scale, Loader2, Clock, Send, Plus, MessageCircle, Camera, AlertCircle
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import CadastroCliente from "../../components/register/CadastroCliente";

const API_BASE = "http://localhost:8080";
const formatarDataSegura = (dataRaw) => {
  if (!dataRaw) return "N/I";
  try {
    if (Array.isArray(dataRaw)) {
      const [ano, mes, dia] = dataRaw;
      return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
    }
    
    const dataStr = String(dataRaw);
    if (dataStr.includes('/')) return dataStr;
    if (dataStr.includes('-')) {
        const partes = dataStr.split('T')[0].split('-');
        if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    const d = new Date(dataRaw);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
    
    return "N/I";
  } catch (e) {
    return "N/I";
  }
};

export default function ClientePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [cliente, setCliente] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [isEscrevendoNota, setIsEscrevendoNota] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [fotoPreview, setFotoPreview] = useState(null);

  const getUsuarioLogado = () => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  };

  const carregarTudo = useCallback(async (signal) => {
    setLoading(true);
    setErro(null);
    try {
      const user = getUsuarioLogado();
      const headers = { 
        "Authorization": `Bearer ${user.token}`,
        "id-operador": String(user.id || 1)
      };

      const [resCli, resVendas, resAval] = await Promise.all([
        fetch(`${API_BASE}/clientes/${id}`, { headers, signal }),
        fetch(`${API_BASE}/vendas`, { headers, signal }),
        fetch(`${API_BASE}/avaliacoes-fisicas/cliente/${id}`, { headers, signal }).catch(() => null)
      ]);

      if (!resCli.ok) throw new Error("Não foi possível carregar os dados do cliente.");

      const cliData = await resCli.json();
      setCliente(cliData);
      if (cliData.foto) setFotoPreview(cliData.foto);
      
      if (resVendas.ok) {
        const todas = await resVendas.json();
        setVendas(todas.filter(v => String(v.idCliente) === String(id) || String(v.cliente?.id) === String(id)));
      }
      
      if (resAval && resAval.ok) {
        setAvaliacoes(await resAval.json());
      }

    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        setErro(err.message);
      }
    } finally { 
      setLoading(false); 
    }
  }, [id]);

  useEffect(() => { 
    const controller = new AbortController();
    carregarTudo(controller.signal); 
    return () => controller.abort();
  }, [carregarTudo]);

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setFotoPreview(previewUrl);
  };

  const abrirWhatsApp = (telefone) => {
    if (!telefone) return;
    const numeroLimpo = telefone.replace(/\D/g, '');
    if (numeroLimpo.length < 10) {
      alert("Número de telefone inválido para o WhatsApp.");
      return;
    }
    const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    window.open(`https://wa.me/${numeroFinal}`, '_blank');
  };

  const abrirEmail = (email) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const handleSalvarNota = async () => {
    if (!novaNota.trim()) return;
    setSalvandoNota(true);
    
    try {
      const user = getUsuarioLogado();
      const dataStr = new Date().toLocaleString('pt-BR');
      const nomeFuncionario = user.nome || user.nomeCompleto || "Equipe";
      
      const notaFormatada = `[${dataStr} - ${nomeFuncionario}]\n${novaNota.trim()}`;
      const observacoesAtualizadas = cliente.observacoes ? `${cliente.observacoes}\n\n${notaFormatada}` : notaFormatada;

      const headers = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`,
        "id-operador": String(user.id || 1)
      };

      const response = await fetch(`${API_BASE}/clientes/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...cliente, observacoes: observacoesAtualizadas })
      });

      if (response.ok) {
        setCliente({ ...cliente, observacoes: observacoesAtualizadas });
        setNovaNota(""); 
        setIsEscrevendoNota(false); 
      } else {
        alert("Erro ao salvar a observação.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de comunicação ao salvar a observação.");
    } finally {
      setSalvandoNota(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full bg-transparent">
      <Loader2 className="animate-spin mb-4" style={{ color: 'var(--bg-sidebar)' }} size={40} />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Carregando Perfil...</span>
    </div>
  );

  if (erro || !cliente) return (
    <div className="flex flex-col items-center justify-center h-full bg-transparent text-center gap-4">
       <AlertCircle size={48} className="opacity-20 text-red-500" />
       <p className="font-black uppercase tracking-widest opacity-40 text-xs" style={{ color: 'var(--text-main)' }}>
         {erro || "Cliente não encontrado."}
       </p>
       <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest outline-none hover:bg-black/5" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
         Voltar
       </button>
    </div>
  );

  const stats = [
    { label: "Total Compras", val: vendas.length },
    { label: "Avaliações", val: avaliacoes.length },
    { label: "Status", val: cliente.ativo !== false ? "Ativo" : "Inativo" },
  ];

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in duration-500 transition-colors bg-transparent px-2 md:px-4 pb-10">
      
      <div className="flex items-center mb-4 mt-4 shrink-0 px-2 gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 transition-all hover:scale-110 hover:-translate-x-1 outline-none opacity-60 hover:opacity-100" 
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          
          <h1 className="text-base font-black uppercase italic leading-none" style={{ color: 'var(--text-main)' }}>
            Cliente <span className="opacity-40 not-italic text-xs">{cliente.id || cliente.idCliente}</span>
          </h1>
      </div>

      <div className="rounded-[24px] border p-6 md:p-8 mb-6 relative overflow-hidden shadow-sm transition-all bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 blur-3xl rounded-full pointer-events-none" style={{ backgroundColor: 'var(--bg-sidebar)' }} />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center xl:items-start justify-between gap-6 xl:gap-10">
          
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              
              <div className="relative group w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-full border-[4px] shadow-md overflow-hidden bg-[var(--bg-body)] flex items-center justify-center cursor-pointer transition-all" style={{ borderColor: 'var(--border-color)' }}>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto Cliente" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black opacity-30" style={{ color: 'var(--text-main)' }}>
                    {cliente.nomeCompleto?.charAt(0).toUpperCase()}
                  </span>
                )}
                
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                   <Camera size={24} className="text-white" strokeWidth={2} />
                   <input type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                </label>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-xl md:text-2xl font-black tracking-tighter mb-2 uppercase" style={{ color: 'var(--text-main)' }}>{cliente.nomeCompleto}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 opacity-70">
                  
                  <button 
                    onClick={() => abrirEmail(cliente.email)}
                    className="text-[10px] md:text-xs font-bold uppercase flex items-center gap-1.5 hover:text-blue-500 transition-colors outline-none cursor-pointer" 
                    style={{ color: 'var(--text-main)' }}
                    title="Enviar e-mail"
                  >
                    <Mail size={12}/> {cliente.email || "NÃO INFORMADO"}
                  </button>
                  
                  <button 
                    onClick={() => abrirWhatsApp(cliente.telefone)}
                    className="text-[10px] md:text-xs font-bold uppercase flex items-center gap-1.5 hover:text-emerald-500 transition-colors outline-none cursor-pointer" 
                    style={{ color: 'var(--text-main)' }}
                    title="Abrir conversa no WhatsApp"
                  >
                    <MessageCircle size={12}/> {cliente.telefone || "NÃO INFORMADO"}
                  </button>
                </div>
              </div>
          </div>

          <div className="flex flex-col items-center xl:items-end justify-center w-full xl:w-auto pt-4 xl:pt-0">
              <div className="flex gap-3 mb-6 w-full md:w-auto justify-center">
                 <button onClick={() => navigate('/vendas')} className="w-full md:w-44 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-md outline-none text-white" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                    <ShoppingBag size={14} strokeWidth={2.5} /> Nova Venda
                 </button>
                 <button onClick={() => navigate(`/avaliacoes/nova`, { state: { clienteSelecionado: cliente } })} className="w-full md:w-44 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-md outline-none text-white" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                    <Activity size={14} strokeWidth={2.5} /> Avaliação
                 </button>
              </div>

              <div className="flex gap-6 md:gap-8 pt-4 border-t w-full justify-center xl:justify-end xl:border-none xl:pt-0" style={{ borderColor: 'var(--border-color)' }}>
                {stats.map((s, i) => (
                  <div key={i} className="flex flex-col items-center xl:items-end text-center xl:text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-main)' }}>{s.label}</p>
                    <div className="flex items-center gap-1.5 font-black text-lg md:text-xl uppercase" style={{ color: 'var(--text-main)' }}>{s.val}</div>
                  </div>
                ))}
              </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 md:gap-8 border-b mb-6 shrink-0 overflow-x-auto custom-slim-scroll" style={{ borderColor: 'var(--border-color)' }}>
        {['cadastro', 'vendas', 'avaliacoes'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setAbaAtiva(tab)}
            className={`pb-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all relative outline-none whitespace-nowrap ${abaAtiva === tab ? '' : 'opacity-40 hover:opacity-100'}`}
            style={{ color: abaAtiva === tab ? 'var(--bg-sidebar)' : 'var(--text-main)' }}
          >
            {tab}
            {abaAtiva === tab && <div className="absolute bottom-0 left-0 w-full h-1 rounded-t-full" style={{ backgroundColor: 'var(--bg-sidebar)' }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 animate-in slide-in-from-bottom-4 duration-500 min-h-0">
        
        {abaAtiva === 'cadastro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-4">
            
            <div className="lg:col-span-2 rounded-2xl border p-6 shadow-sm h-max bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                    <FileText size={14} /> Informações
                  </h3>
                  <button 
                    onClick={() => setModalEdicaoAberto(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-1.5 outline-none"
                  >
                    <Edit size={12} strokeWidth={3} /> Editar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {[
                    { l: "CPF", v: cliente.cpf || "N/I" },
                    { l: "Nascimento", v: formatarDataSegura(cliente.dataNascimento) },
                    { l: "Gênero", v: cliente.sexoBiologico || "N/I" },
                    { l: "Criado Em", v: formatarDataSegura(cliente.dataCadastro || cliente.criadoEm) }
                  ].map((f, i) => (
                    <div key={i} className="group border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1 transition-opacity" style={{ color: 'var(--text-main)' }}>{f.l}</p>
                      <p className="text-sm font-bold uppercase" style={{ color: 'var(--text-main)' }}>{f.v}</p>
                    </div>
                  ))}
                </div>
            </div>
            
            <div className="rounded-2xl border shadow-sm flex flex-col bg-[var(--bg-card)] h-[400px] lg:h-auto overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
               <div className="p-5 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                 <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                   <Clock size={14} /> Observações
                 </h3>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-slim-scroll p-5 text-xs font-bold leading-relaxed whitespace-pre-wrap opacity-80" style={{ color: 'var(--text-main)' }}>
                  {cliente.observacoes ? cliente.observacoes : <span className="opacity-40 italic">Este cliente não possui observações.</span>}
               </div>

               <div className="p-4 bg-black/5 dark:bg-white/5 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                 {!isEscrevendoNota ? (
                    <button 
                      onClick={() => setIsEscrevendoNota(true)}
                      className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-2 outline-none hover:opacity-90 shadow-sm"
                      style={{ backgroundColor: 'var(--bg-sidebar)' }}
                    >
                      <Plus size={14} strokeWidth={2.5} /> Registrar Observação
                    </button>
                 ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <textarea 
                        value={novaNota}
                        onChange={(e) => setNovaNota(e.target.value)}
                        className="w-full bg-transparent border-none outline-none resize-none text-xs font-bold placeholder:italic placeholder:opacity-40 custom-slim-scroll transition-all mb-3"
                        style={{ color: 'var(--text-main)' }}
                        rows="3"
                        placeholder="Escreva a observação aqui..."
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setIsEscrevendoNota(false); setNovaNota(""); }}
                          className="px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-all outline-none"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSalvarNota}
                          disabled={salvandoNota || !novaNota.trim()}
                          className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-md active:scale-95 transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none" 
                          style={{ backgroundColor: 'var(--bg-sidebar)' }}
                        >
                          {salvandoNota ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
                          Salvar Observação
                        </button>
                      </div>
                    </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {abaAtiva === 'vendas' && (
          <div className="rounded-2xl border overflow-hidden shadow-sm bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto custom-slim-scroll">
              <table className="w-full border-collapse">
                <thead className="bg-black/5 dark:bg-white/5">
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="p-5 text-[10px] font-black uppercase opacity-40 tracking-widest" style={{ color: 'var(--text-main)' }}>Data / Pedido</th>
                    <th className="p-5 text-[10px] font-black uppercase opacity-40 tracking-widest" style={{ color: 'var(--text-main)' }}>Pagamento</th>
                    <th className="p-5 text-right text-[10px] font-black uppercase opacity-40 tracking-widest" style={{ color: 'var(--text-main)' }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'var(--border-color)' }}>
                  {vendas.length > 0 ? vendas.map((v, i) => (
                    <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/vendas/${v.idVenda}`)}>
                      <td className="p-5">
                        <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>{new Date(v.dataVenda).toLocaleDateString()}</p>
                        <p className="text-[9px] opacity-40 uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--text-main)' }}># {v.idVenda}</p>
                      </td>
                      <td className="p-5">
                        <span className="px-3 py-1.5 rounded-lg border shadow-sm text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                          {v.metodoPagamento}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-sm" style={{ color: 'var(--bg-sidebar)' }}>
                        {v.valorTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="p-10 text-center text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Nenhuma venda registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {abaAtiva === 'avaliacoes' && (
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-4">
              {avaliacoes.length > 0 ? avaliacoes.map((a, i) => (
                <div key={i} className="p-6 rounded-2xl border group shadow-sm transition-all hover:-translate-y-1 bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                      {formatarDataSegura(a.dataAvaliacao || a.data_avaliacao)}
                    </span>
                    <Scale size={18} style={{ color: 'var(--bg-sidebar)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-main)' }}>Peso</p>
                       <p className="font-black text-xl" style={{ color: 'var(--text-main)' }}>{a.peso} <span className="text-[10px] opacity-50">KG</span></p>
                     </div>
                     <div>
                       <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-main)' }}>Gordura</p>
                       <p className="font-black text-xl text-orange-500">{a.percentualGordura || a.percentual_gordura}%</p>
                     </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full p-10 text-center text-[10px] font-black uppercase tracking-widest opacity-40 border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  Nenhuma avaliação física encontrada.
                </div>
              )}
           </div>
        )}
      </div>

      {modalEdicaoAberto && (
        <CadastroCliente 
          isOpen={modalEdicaoAberto} 
          onClose={() => setModalEdicaoAberto(false)} 
          dadosIniciais={cliente} 
          onSalvo={() => { setModalEdicaoAberto(false); carregarTudo(); }} 
        />
      )}

    </div>
  );
}