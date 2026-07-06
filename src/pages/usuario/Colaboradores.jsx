import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, AlertCircle, ChevronDown, Check } from "lucide-react";
import TabelaBase from "../../components/common/TabelaBase";
import CadastroColaborador from "../../components/register/CadastroColaborador";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../services/api"; 
import colabIcon from "../../assets/icons/colab.png"; 
import cadastroIcon from "../../assets/icons/cadastro.png"; 

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function Colaboradores() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const searchInputRef = useRef(null);
  const [busca, setBusca] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const buscarColaboradores = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErro(null);
      
      const response = await apiFetch("/funcionarios", { method: "GET", signal });
      const data = await response.json();
      setColaboradores(Array.isArray(data) ? data : (data.content || []));
    } catch (error) {
      if (error.name !== "AbortError") {
        setErro(error.message || "Falha ao carregar o quadro de colaboradores.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    buscarColaboradores(controller.signal);
    return () => controller.abort();
  }, [buscarColaboradores]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && modalAberto) {
        setModalAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto]);

  const alternarStatus = async (colab) => {
    const id = colab.id || colab.idFuncionario;
    const acao = colab.ativo !== false ? "inativar" : "reativar";
    
    if (!window.confirm(`Tem certeza que deseja ${acao} o colaborador ${colab.nomeCompleto || colab.nome}?`)) return;

    try {
      await apiFetch(`/funcionarios/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: colab.ativo === false })
      });
      buscarColaboradores();
    } catch (error) { 
      alert(error.message || "Não foi possível alterar o status.");
    }
  };

  const removerColaborador = async (colab) => {
    const id = colab.id || colab.idFuncionario;
    if (!window.confirm("ATENÇÃO: Deseja excluir este colaborador do sistema de forma irreversível?")) return;

    try {
      await apiFetch(`/funcionarios/${id}`, { method: "DELETE" });
      buscarColaboradores();
    } catch (error) { 
      alert(error.message || "Não foi possível remover o colaborador.");
    }
  };

  const dadosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return colaboradores.filter((c) => {
      const bateuTexto = (c.nomeCompleto || c.nome || "").toLowerCase().includes(termo) || 
                         (c.cpf || "").includes(termo) ||
                         (c.cargo || c.perfilAcesso || "").toLowerCase().includes(termo);
      
      const isActive = c.ativo !== false; 
      
      if (filtroStatus === "ATIVOS") return bateuTexto && isActive;
      if (filtroStatus === "INATIVOS") return bateuTexto && !isActive;
      return bateuTexto;
    });
  }, [colaboradores, busca, filtroStatus]);

  const opcoesStatus = ["TODOS", "ATIVOS", "INATIVOS"];

  const colunas = useMemo(() => [
    {
      titulo: "Colaborador",
      campo: "nomeCompleto",
      render: (item) => (
        <div className="flex items-center gap-3 py-1 cursor-pointer hover:opacity-70 transition-opacity">
          <div className="p-3 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 hover:rotate-6 hover:scale-110 bg-[var(--border-color)] shrink-0">
            <div className="w-5 h-5 icon-dynamic-color bg-[var(--text-main)]" style={{ WebkitMaskImage: `url(${colabIcon})`, maskImage: `url(${colabIcon})` }} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black text-sm uppercase leading-tight line-clamp-1 text-[var(--text-main)]">
              {formatarTitleCase(item.nomeCompleto || item.nome)}
            </span>
            <span className="text-[10px] font-black opacity-40 line-clamp-1 mt-1 text-[var(--text-main)] uppercase tracking-widest">
              ID: {item.id || item.idFuncionario}
            </span>
          </div>
        </div>
      )
    },
    { 
      titulo: "Cargo", 
      campo: "cargo", 
      align: "center",
      render: (item) => {
        const cargoText = item.cargo || item.perfilAcesso || 'FUNCIONÁRIO';
        let corCargo = "bg-gray-500/10 text-gray-500 border-gray-500/20";
        if (cargoText.includes("DONO") || cargoText.includes("ADMIN")) corCargo = "bg-purple-500/10 text-purple-500 border-purple-500/20";
        else if (cargoText.includes("GERENTE")) corCargo = "bg-blue-500/10 text-blue-500 border-blue-500/20";
        
        return (
          <span className={`px-2.5 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border shadow-sm ${corCargo}`}>
            {cargoText.replace("_", " ")}
          </span>
        );
      } 
    },
    { 
      titulo: "E-mail de Acesso", 
      campo: "email", 
      render: (item) => (
        <span className="text-[12px] font-bold opacity-70 lowercase truncate max-w-[150px] md:max-w-[200px] text-[var(--text-main)]">
          {item.email || 'N/I'}
        </span>
      ) 
    },
    { 
      titulo: "Telefone", 
      campo: "telefone", 
      align: "center",
      render: (item) => (
        <span className="font-black text-sm text-[var(--text-main)]">
          {item.telefone || '---'}
        </span>
      )
    },
    { 
      titulo: "Status", 
      align: "center",
      render: (item) => <StatusBadge status={item.ativo !== false ? 'ATIVO' : 'INATIVO'} isDarkMode={isDarkMode} />
    }
  ], [isDarkMode]);

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent relative pb-24 lg:pb-4 px-3 lg:px-6 animate-in fade-in duration-500 overflow-hidden">
      
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center shrink-0 mt-4 mb-6 gap-4 xl:gap-6 w-full bg-transparent">
        
        <div className="flex items-center gap-4 shrink-0 w-full xl:w-auto">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundColor: 'var(--bg-sidebar)', 
                  WebkitMaskImage: `url(${colabIcon})`, 
                  WebkitMaskSize: "contain", 
                  WebkitMaskRepeat: "no-repeat",
                  maskImage: `url(${colabIcon})`, 
                  maskSize: "contain",
                  maskRepeat: "no-repeat"
                }} 
              />
            </div>
            <div className="flex flex-col">
                <h1 className="text-2xl font-black italic uppercase tracking-tight leading-none" style={{ color: 'var(--bg-sidebar)' }}>
                  Colaboradores
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
                  Gestão de equipe e permissões
                </p>
            </div>
        </div>

        <div className="flex-1 w-full flex justify-center xl:px-4">
            <div className="relative w-full max-w-2xl group">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Buscar por Nome, CPF ou Cargo..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)} 
                  className="w-full pl-12 pr-12 py-2 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-gray-400 outline-none placeholder:normal-case" 
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} 
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 transition-opacity" style={{ color: 'var(--text-main)' }} />
                <span className="hidden lg:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border border-[var(--border-color)] bg-black/5 text-[10px] font-black text-[var(--text-main)] opacity-40 pointer-events-none">
                  /
                </span>
            </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-start xl:justify-end gap-3 shrink-0 w-full xl:w-auto">
            <FiltroDropdown 
                label={filtroStatus === "TODOS" ? "STATUS" : filtroStatus} 
                opcoes={opcoesStatus} 
                isOpen={menuAberto === 'status'}
                onToggle={() => setMenuAberto(menuAberto === 'status' ? null : 'status')}
                onSelect={(v) => { setFiltroStatus(v || "TODOS"); setMenuAberto(null); }}
            />

            <button 
              onClick={() => { setDadosEdicao(null); setModalAberto(true); }} 
              className="w-full sm:w-[160px] h-[36px] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md active:scale-95 text-white outline-none shrink-0"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              <div className="w-3.5 h-3.5 shrink-0 bg-[#FFFFFF]" style={{ WebkitMaskImage: `url(${cadastroIcon})`, maskImage: `url(${cadastroIcon})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} />
              <span className="truncate">Novo Colaborador</span>
            </button>
        </div>
      </header>

      <section className="flex flex-col gap-6 flex-1 min-h-0 items-stretch mt-2 pb-4 w-full">
        <div className="flex-1 flex flex-col min-h-0 transition-all duration-300 bg-transparent">
            {loading ? (
                 <div className="flex-1 flex flex-col items-center justify-center bg-transparent">
                     <Loader2 className="animate-spin mb-2" style={{ color: 'var(--bg-sidebar)' }} size={32} />
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>SINCRONIZANDO QUADRO...</span>
                 </div>
            ) : erro ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-red-500 gap-2 border rounded-2xl border-dashed" style={{ borderColor: 'var(--border-color)' }}>
                     <AlertCircle size={32} className="opacity-80"/>
                     <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">{erro}</p>
                 </div>
            ) : dadosFiltrados.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-60 bg-transparent border rounded-2xl border-dashed" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="w-10 h-10 mb-4 opacity-40 icon-dynamic-color bg-[var(--text-main)]" style={{ WebkitMaskImage: `url(${colabIcon})`, maskImage: `url(${colabIcon})` }} />
                    <p className="font-black uppercase text-[10px] mt-2 tracking-widest text-center px-4" style={{ color: 'var(--text-main)' }}>Nenhum colaborador encontrado.</p>
                 </div>
            ) : (
                <div className="flex-1 bg-transparent flex flex-col overflow-hidden custom-slim-scroll">
                    <TabelaBase 
                      dados={dadosFiltrados} 
                      colunas={colunas} 
                      onEditar={(item) => { setDadosEdicao(item); setModalAberto(true); }}
                      onInativar={(item) => alternarStatus(item)}
                      onRemover={(item) => removerColaborador(item)}
                      initialMode="tabela"
                    />
                </div>
            )}
        </div>
      </section>

      {modalAberto && (
        <CadastroColaborador 
          isOpen={modalAberto} 
          onClose={() => setModalAberto(false)} 
          dadosIniciais={dadosEdicao} 
          onSalvo={() => { setModalAberto(false); buscarColaboradores(); }} 
        />
      )}
    </div>
  );
}

function FiltroDropdown({ label, opcoes, isOpen, onToggle, onSelect, icon: Icon = ChevronDown }) {
    return (
        <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={onToggle} 
              className="w-full sm:w-[160px] h-[36px] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md active:scale-95 text-white outline-none shrink-0"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
                <span className="truncate px-2">{label}</span>
                {Icon && <Icon size={12} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
            {isOpen && (
                <div className="absolute top-12 left-0 sm:right-0 sm:left-auto w-full sm:w-[160px] rounded-xl shadow-2xl border z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div onClick={() => onSelect(null)} className="px-5 py-2.5 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5" style={{ color: 'var(--text-main)' }}>TODOS</div>
                    {opcoes.filter(op => op !== "TODOS").map(op => (
                        <div key={op} onClick={() => onSelect(op)} className="px-5 py-2.5 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 border-t truncate" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} title={op}>
                           {op}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status, isDarkMode }) {
    const config = {
      ATIVO: { bg: isDarkMode ? 'bg-green-500/15' : 'bg-green-100', text: isDarkMode ? 'text-green-400' : 'text-green-700' },
      INATIVO: { bg: isDarkMode ? 'bg-slate-500/15' : 'bg-slate-100', text: isDarkMode ? 'text-slate-400' : 'text-slate-700' }
    };
    const style = config[status] || { bg: 'bg-gray-500/10', text: 'text-[var(--text-main)]' };
    
    return <span className={`px-2.5 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border border-[var(--border-color)] shadow-sm ${style.bg} ${style.text}`}>{status}</span>;
}