import React, { useState, useEffect, useCallback } from "react";
import { 
  Settings, CalendarX, Shield, Lock, Plus, 
  Loader2, ArrowLeft, AlertCircle, Users, CheckCircle2, XCircle, Search,
  Target, Award
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";
import CadastroServico from "../../components/register/CadastroServico";
import CadastroExecao from "../../components/register/CadastroExecao"; 
import CadastroTarefa from "../../components/register/CadastroTarefa"; 
import TabelaBase from "../../components/common/TabelaBase";
import ModalConfirmacao from "../../components/modal/ModalConfirmacao";
import gerenciaIcon from "../../assets/icons/gerencia.png";

const normalizarBusca = (texto) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function Gerencia() {
  const { user } = useAuth();
  const cargoDoUsuario = String(user?.cargo || "").toUpperCase();
  const isAdmin = ["ADMIN", "DONO", "GERENTE"].includes(cargoDoUsuario);
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId || 1;
  const idOperador = user?.idFuncionario || user?.id || 1;
  const [abaAtiva, setAbaAtiva] = useState("SERVICOS");
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [busca, setBusca] = useState("");
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [modalExcecaoAberto, setModalExcecaoAberto] = useState(false); 
  const [modalTarefaAberto, setModalTarefaAberto] = useState(false); 
  const [modalConfirmacao, setModalConfirmacao] = useState({ isOpen: false, id: null });

  const [cargoSelecionado, setCargoSelecionado] = useState(null);

  const abas = [
    { id: "SERVICOS", label: "Serviços", icon: Settings },
    { id: "TAREFAS", label: "Tarefas", icon: Target }, 
    { id: "FERIADOS", label: "Exceções", icon: CalendarX },
    { id: "PERMISSOES", label: "Permissões", icon: Shield },
  ];

  const niveisAcesso = [
    { id: "ADMIN", nome: "Administrador / Dono", desc: "Acesso irrestrito a todas as configurações." },
    { id: "GERENTE", nome: "Gerente", desc: "Gestão operacional da unidade e controle de equipe." },
    { id: "LIDER_RECEPCAO", nome: "Líder de Recepção", desc: "Supervisão de agendamentos e caixa." },
    { id: "OPERADOR", nome: "Recepção / Operador", desc: "Acesso focado em vendas e atendimento." },
    { id: "INSTRUTOR", nome: "Instrutor / Personal", desc: "Visualização de agenda própria e avaliações." }
  ];

  const modulos = [
    { id: 'agenda', nome: 'Agenda & Reservas', desc: 'Criar, editar e cancelar agendamentos' },
    { id: 'clientes', nome: 'Gestão de Clientes', desc: 'Acessar e modificar dados de alunos' },
    { id: 'estoque', nome: 'Controle de Estoque', desc: 'Vendas, controle de inventário e quebras' },
    { id: 'financeiro', nome: 'Financeiro Avançado', desc: 'DRE, fluxo de caixa e estornos' },
    { id: 'configuracoes', nome: 'Configurações do Sistema', desc: 'Alterar regras de negócio e serviços' }
  ];

  const verificarPermissao = (cargoId, moduloId) => {
    if (cargoId === "ADMIN") return true;
    if (cargoId === "GERENTE") return moduloId !== "configuracoes";
    if (cargoId === "LIDER_RECEPCAO") return ["agenda", "clientes", "estoque"].includes(moduloId);
    if (cargoId === "OPERADOR") return ["agenda", "clientes"].includes(moduloId);
    if (cargoId === "INSTRUTOR") return ["agenda"].includes(moduloId);
    return false;
  };

  const carregarServicos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/servicos/unidade/${idUnidadeAtual}?size=100`, {
          headers: { "id-operador": String(idOperador) }
      });
      const data = await res.json();
      setServicos(Array.isArray(data) ? data : (data?.content || []));
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      setServicos([]); 
    } finally {
      setLoading(false);
    }
  }, [idUnidadeAtual, idOperador]);

  const carregarTarefas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/gamificacao/templates/unidade/${idUnidadeAtual}`, {
        headers: { "id-operador": String(idOperador) }
      });
      const data = await res.json();
      setTarefas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar tarefas da gamificação:", error);
      setTarefas([]);
    } finally {
      setLoading(false);
    }
  }, [idUnidadeAtual, idOperador]);

  useEffect(() => {
    if (abaAtiva === "SERVICOS") carregarServicos();
    if (abaAtiva === "TAREFAS") carregarTarefas(); 
  }, [abaAtiva, carregarServicos, carregarTarefas]);

  const excluirServico = async () => {
    if (!modalConfirmacao.id) return;
    try {
      await apiFetch(`/servicos/${modalConfirmacao.id}`, {
        method: "DELETE",
        headers: { "id-operador": String(idOperador) }
      });
      carregarServicos();
    } catch (err) {
      alert("Não foi possível excluir o serviço.");
    } finally {
      setModalConfirmacao({ isOpen: false, id: null });
    }
  };

  //FILTROS DE BUSCA

  const servicosFiltrados = servicos.filter(s => {
    const termo = normalizarBusca(busca);
    return normalizarBusca(s.nome).includes(termo) || normalizarBusca(s.descricao).includes(termo);
  });

  const tarefasFiltradas = tarefas.filter(t => {
    const termo = normalizarBusca(busca);
    return normalizarBusca(t.nome).includes(termo) || normalizarBusca(t.descricao).includes(termo);
  });

  const colunasServicos = [
    { 
      titulo: "Serviço", 
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-[var(--text-main)]">{s.nome}</span>
          <span className="text-[10px] text-[var(--text-main)] opacity-50 line-clamp-1">{s.descricao || "Sem descrição"}</span>
        </div>
      ) 
    },
    { 
      titulo: "Preço Base", 
      align: "right",
      render: (s) => <span className="font-black text-sm text-emerald-500">R$ {s.precoBase?.toFixed(2)}</span> 
    },
    { 
      titulo: "Duração", 
      align: "center",
      render: (s) => <span className="font-bold text-[11px] text-[var(--text-main)] uppercase tracking-widest">{s.duracaoMinutos} min</span> 
    },
    { 
      titulo: "Lotação", 
      align: "center",
      render: (s) => <span className="font-bold text-[11px] text-[var(--text-main)] uppercase tracking-widest">{s.limiteVagasSimultaneas} vagas</span> 
    },
  ];

  const renderServicos = () => (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 h-full">
      {loading ? (
        <div className="py-20 flex flex-col justify-center items-center">
          <Loader2 className="animate-spin mb-3 text-[var(--bg-sidebar)]" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Sincronizando...</span>
        </div>
      ) : servicosFiltrados.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] rounded-3xl bg-transparent opacity-60 mt-4">
          <Settings size={36} className="text-[var(--text-main)] opacity-30 mb-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] opacity-60">
            Nenhum serviço encontrado
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-slim-scroll pr-1 pb-10 mt-2">
          <TabelaBase 
            dados={servicosFiltrados} 
            colunas={colunasServicos}
            onRemover={isAdmin ? (srv) => setModalConfirmacao({ isOpen: true, id: srv.id }) : undefined}
          />
        </div>
      )}
    </div>
  );

  const renderTarefas = () => (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 h-full mt-2">
      {loading ? (
        <div className="py-20 flex flex-col justify-center items-center">
          <Loader2 className="animate-spin mb-3 text-[var(--bg-sidebar)]" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Carregando Gamificação...</span>
        </div>
      ) : tarefasFiltradas.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] rounded-3xl bg-transparent opacity-60 mt-4">
          <Target size={36} className="text-[var(--text-main)] opacity-30 mb-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] opacity-60">
            Nenhum molde de tarefa encontrado
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-slim-scroll pr-1 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tarefasFiltradas.map(t => (
              <div 
                key={t.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] p-5 flex flex-col gap-4 shadow-sm hover:border-[var(--bg-sidebar)] transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-sidebar)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-main)] group-hover:text-[var(--bg-sidebar)] group-hover:bg-[var(--bg-sidebar)]/10 transition-colors">
                      <Target size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-sm text-[var(--text-main)] leading-tight line-clamp-1">{t.nome}</h3>
                      <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${t.ativo ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.ativo ? "Molde Ativo" : "Molde Inativo"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 z-10">
                  <p className="text-xs font-medium text-[var(--text-main)] opacity-60 line-clamp-2 leading-relaxed">
                    {t.descricao || "Nenhuma instrução adicional fornecida para esta tarefa."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4 mt-2 z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] opacity-40">
                    Recompensa Base
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)] rounded-lg">
                    <Award size={14} strokeWidth={2.5} />
                    <span className="font-black text-sm tracking-tight">+{t.pontosRecompensa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFeriados = () => (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 pt-4">
      <div className="py-24 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] rounded-[24px] bg-transparent opacity-60">
        <CalendarX size={36} className="opacity-30 mb-4 text-[var(--text-main)]" />
        <span className="text-[10px] font-black text-[var(--text-main)] opacity-60 uppercase tracking-widest">Nenhum bloqueio programado</span>
      </div>
    </div>
  );

  const renderPermissoes = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 pb-10 pt-4">
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-sm">
        <AlertCircle size={20} strokeWidth={2.5} className="shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
          Módulo em desenvolvimento. Esta tela exibe o mapeamento estrutural de acessos.
        </p>
      </div>

      {!cargoSelecionado ? (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2 opacity-50 mb-2">
            <Shield size={16} className="text-[var(--text-main)]" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Selecione o Nível Hierárquico</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {niveisAcesso.map(cargo => (
              <button 
                key={cargo.id} 
                onClick={() => setCargoSelecionado(cargo)}
                className="flex flex-col items-start p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[24px] hover:border-[var(--bg-sidebar)] hover:shadow-md transition-all group outline-none text-left"
              >
                <div className="p-3 bg-[var(--bg-body)] rounded-xl mb-4 text-[var(--text-main)] transition-colors group-hover:text-[var(--bg-sidebar)]">
                  <Users size={24} strokeWidth={2} />
                </div>
                <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-tight mb-2 group-hover:text-[var(--bg-sidebar)] transition-colors">
                  {cargo.nome}
                </h3>
                <p className="text-[10px] font-bold text-[var(--text-main)] opacity-50 uppercase tracking-widest leading-relaxed">
                  {cargo.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 flex flex-col gap-6 mt-2">
          <div className="flex items-center gap-4 border-b border-[var(--border-color)] pb-4">
            <button 
              onClick={() => setCargoSelecionado(null)}
              className="p-2 bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl hover:opacity-80 transition-opacity outline-none text-[var(--text-main)]"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg font-black uppercase tracking-tighter text-[var(--text-main)]">
                Permissões: {cargoSelecionado.nome}
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">
                Matriz de Acesso Operacional
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {modulos.map((mod) => {
              const possuiAcesso = verificarPermissao(cargoSelecionado.id, mod.id);
              return (
                <div 
                  key={mod.id} 
                  className={`p-6 bg-[var(--bg-card)] rounded-[24px] border transition-colors flex items-center justify-between shadow-sm ${possuiAcesso ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-60'}`}
                >
                  <div className="flex flex-col gap-1.5 pr-4">
                    <span className="font-black text-sm text-[var(--text-main)] flex items-center gap-2">
                      {mod.nome}
                      {!possuiAcesso && <span className="px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest bg-[var(--bg-body)] text-[var(--text-main)] border border-[var(--border-color)]">Bloqueado</span>}
                    </span>
                    <span className="text-xs font-medium opacity-60 text-[var(--text-main)]">
                      {mod.desc}
                    </span>
                  </div>
                  
                  <div className="shrink-0 flex items-center justify-center">
                    {possuiAcesso ? (
                      <CheckCircle2 size={24} className="text-emerald-500" strokeWidth={2.5} />
                    ) : (
                      <XCircle size={24} className="text-red-500 opacity-50" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="w-full h-[100dvh] font-sans flex flex-col transition-colors duration-300 bg-transparent gap-4 px-3 overflow-hidden animate-in fade-in duration-500 pb-20 lg:pb-0">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 mt-4 mb-2 gap-4 lg:gap-6 w-full">
          
          <div className="flex items-center gap-4 shrink-0">
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <div 
                  className="w-10 h-10 bg-[var(--bg-sidebar)]" 
                  style={{ 
                    WebkitMaskImage: `url(${gerenciaIcon})`, 
                    WebkitMaskSize: "contain", 
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskImage: `url(${gerenciaIcon})`, 
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center"
                  }} 
                />
              </div>
              
              <div className="flex flex-col">
                  <h1 className="text-[28px] sm:text-[32px] font-black italic uppercase tracking-tighter leading-none text-[var(--bg-sidebar)]">
                    Gerência
                  </h1>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 mt-1.5 text-[var(--text-main)]">
                    Configurações Operacionais
                  </p>
              </div>
          </div>

          <div className="flex-1 w-full max-w-2xl flex justify-center lg:px-8">
            {(abaAtiva === "SERVICOS" || abaAtiva === "TAREFAS") && (
                <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder={`Pesquisar ${abaAtiva === "SERVICOS" ? "serviços" : "tarefas"}...`}
                    value={busca} 
                    onChange={e => setBusca(e.target.value)} 
                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-[var(--bg-sidebar)] outline-none bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] placeholder-gray-400" 
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)]" />
                </div>
            )}
          </div>

          <div className="shrink-0 w-full lg:w-auto flex justify-end">
            {abaAtiva === "SERVICOS" && (
              <button 
                onClick={() => setModalServicoAberto(true)}
                disabled={!isAdmin}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--bg-sidebar)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={18} strokeWidth={3} /> Novo Serviço
              </button>
            )}

            {abaAtiva === "TAREFAS" && (
              <button 
                onClick={() => setModalTarefaAberto(true)}
                disabled={!isAdmin}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--bg-sidebar)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={18} strokeWidth={3} /> Nova Tarefa
              </button>
            )}

            {abaAtiva === "FERIADOS" && (
              <button 
                onClick={() => setModalExcecaoAberto(true)}
                disabled={!isAdmin}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--bg-sidebar)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={18} strokeWidth={3} /> Adicionar Exceção
              </button>
            )}
          </div>
        </header>

        <div className="flex w-full overflow-x-auto custom-slim-scroll gap-2 shrink-0 border-b border-[var(--border-color)] mt-2">
          {abas.map((aba) => {
            const isActive = abaAtiva === aba.id;
            const Icon = aba.icon;
            
            return (
              <button
                key={aba.id}
                onClick={() => {
                  setAbaAtiva(aba.id);
                  setBusca(""); 
                  if (aba.id !== "PERMISSOES") setCargoSelecionado(null);
                }}
                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-t-xl transition-all font-black uppercase text-[10px] tracking-widest outline-none shrink-0 relative ${
                  isActive 
                    ? 'bg-[var(--bg-sidebar)] text-white shadow-md' 
                    : 'bg-transparent text-[var(--text-main)] opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-color)]'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 3 : 2} /> 
                {aba.label}
                {aba.id === "PERMISSOES" && !isAdmin && <Lock size={10} className="ml-1 opacity-50" />}
              </button>
            );
          })}
        </div>

        <main className="flex-1 w-full relative min-h-0 z-10 flex flex-col overflow-hidden">
          {abaAtiva === "SERVICOS" && renderServicos()}
          {abaAtiva === "TAREFAS" && renderTarefas()}
          {abaAtiva === "FERIADOS" && renderFeriados()}
          {abaAtiva === "PERMISSOES" && renderPermissoes()}
        </main>
      </div>

      {modalServicoAberto && (
        <CadastroServico 
          isOpen={modalServicoAberto} 
          onClose={() => setModalServicoAberto(false)} 
          onSucesso={() => {
            setModalServicoAberto(false);
            carregarServicos(); 
          }}
        />
      )}

      {modalTarefaAberto && CadastroTarefa && (
        <CadastroTarefa 
          isOpen={modalTarefaAberto} 
          onClose={() => setModalTarefaAberto(false)} 
          onSucesso={() => {
            setModalTarefaAberto(false);
            carregarTarefas(); 
          }}
        />
      )}

      {modalExcecaoAberto && (
        <CadastroExecao 
          isOpen={modalExcecaoAberto} 
          onClose={() => setModalExcecaoAberto(false)} 
          onSucesso={() => {
            setModalExcecaoAberto(false);
          }}
        />
      )}

      <ModalConfirmacao 
        isOpen={modalConfirmacao.isOpen} 
        onClose={() => setModalConfirmacao({ isOpen: false, id: null })} 
        onConfirm={excluirServico} 
        titulo="Excluir Serviço" 
        mensagem="Tem certeza que deseja remover este serviço permanentemente?" 
        textoBotaoConfirmar="Excluir" 
      />
    </>
  );
}