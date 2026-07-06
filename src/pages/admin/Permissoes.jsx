import React, { useState, useEffect } from "react";
import { Shield, ShieldAlert, Plus, Copy, Users, Edit2, Save, Loader2, Search } from "lucide-react";

const MODULOS_SISTEMA = [
  { id: 'dashboard', nome: 'Dashboard', acoes: ['Visualizar'] },
  { id: 'produtos', nome: 'Produtos', acoes: ['Visualizar', 'Criar', 'Editar', 'Excluir'] },
  { id: 'estoque', nome: 'Estoque', acoes: ['Visualizar', 'Movimentar', 'Ajustar'] },
  { id: 'vendas', nome: 'Vendas', acoes: ['Visualizar', 'Criar', 'Estornar'] },
  { id: 'configuracoes', nome: 'Configurações', acoes: ['Visualizar', 'Gerenciar Permissões'] }
];

const PERFIS_INICIAIS = [
  { id: 1, nome: 'Administrador Geral', isFixo: true, permissoes: ['dashboard_Visualizar', 'produtos_Visualizar', 'produtos_Criar', 'produtos_Editar', 'produtos_Excluir', 'estoque_Visualizar', 'estoque_Movimentar', 'estoque_Ajustar', 'vendas_Visualizar', 'vendas_Criar', 'vendas_Estornar', 'configuracoes_Visualizar', 'configuracoes_Gerenciar Permissões'] },
  { id: 2, nome: 'Gerente de Loja', isFixo: false, permissoes: ['dashboard_Visualizar', 'produtos_Visualizar', 'produtos_Criar', 'produtos_Editar', 'estoque_Visualizar', 'estoque_Movimentar', 'vendas_Visualizar', 'vendas_Estornar'] },
  { id: 3, nome: 'Operador de Caixa', isFixo: false, permissoes: ['vendas_Visualizar', 'vendas_Criar'] },
  { id: 4, nome: 'Estoquista', isFixo: false, permissoes: ['produtos_Visualizar', 'estoque_Visualizar', 'estoque_Movimentar'] }
];

export default function TelaPermissoes() {
  const [perfis, setPerfis] = useState([]);
  const [perfilAtivoId, setPerfilAtivoId] = useState(null);
  const [permissoesEditaveis, setPermissoesEditaveis] = useState([]);
  const [isEditando, setIsEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setPerfis(PERFIS_INICIAIS);
    setPerfilAtivoId(PERFIS_INICIAIS[0].id);
  }, []);

  const perfilAtivo = perfis.find(p => p.id === perfilAtivoId) || null;


  useEffect(() => {
    if (perfilAtivo) {
      setPermissoesEditaveis(perfilAtivo.permissoes);
      setIsEditando(false);
    }
  }, [perfilAtivoId]);

  const handleTogglePermissao = (permissaoKey) => {
    if (!isEditando || perfilAtivo?.isFixo) return;

    setPermissoesEditaveis(prev => 
      prev.includes(permissaoKey) 
        ? prev.filter(p => p !== permissaoKey)
        : [...prev, permissaoKey]
    );
  };

  const handleDuplicarPerfil = () => {
    if (!perfilAtivo) return;
    const novoNome = `${perfilAtivo.nome} (Cópia)`;
    const novoPerfil = {
      id: Date.now(),
      nome: novoNome,
      isFixo: false,
      permissoes: [...permissoesEditaveis]
    };
    setPerfis([...perfis, novoPerfil]);
    setPerfilAtivoId(novoPerfil.id);
    setIsEditando(true);
  };

  const handleSalvar = async () => {
    setLoading(true);
    try {
      
      setTimeout(() => {
        setPerfis(prev => prev.map(p => p.id === perfilAtivoId ? { ...p, permissoes: permissoesEditaveis } : p));
        setIsEditando(false);
        setLoading(false);
      }, 600);
    } catch (error) {
      alert("Erro ao salvar permissões");
      setLoading(false);
    }
  };

  const perfisFiltrados = perfis.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="w-full h-full min-h-screen bg-[#0A0A0A] flex flex-col text-white font-sans p-8">
      
      <header className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/5 border border-white/20 rounded-full flex items-center justify-center shadow-inner">
              <Shield size={24} className="text-white opacity-80" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Controle de Acesso</h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 ml-16 mt-[-10px]">
            Defina as telas e funcionalidades que os colaboradores podem acessar
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-6 py-3 border border-white/20 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
            <Users size={16} /> Adicionar Colaborador
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-8 overflow-hidden h-[calc(100vh-160px)]">
        
        <aside className="w-80 flex flex-col gap-6">
          
          <div className="relative w-full border-b border-white/20 focus-within:border-white transition-all duration-300 pb-2 flex items-center">
            <Search size={16} className="opacity-40 mr-3" />
            <input 
              type="text" 
              placeholder="Buscar cargo..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-white placeholder:opacity-30"
            />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pr-2">
            {perfisFiltrados.map(perfil => (
              <button
                key={perfil.id}
                onClick={() => setPerfilAtivoId(perfil.id)}
                className={`w-full text-left p-5 rounded-[20px] transition-all border flex items-center justify-between group
                  ${perfilAtivoId === perfil.id 
                    ? 'bg-white/10 border-white/30 shadow-lg' 
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}`}
              >
                <div>
                  <h3 className="font-bold text-sm">{perfil.nome}</h3>
                  <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold mt-1 block">
                    {perfil.permissoes.length} Permissões
                  </span>
                </div>
                {perfil.isFixo && <ShieldAlert size={14} className="opacity-40" title="Perfil Fixo do Sistema" />}
              </button>
            ))}
          </div>

        </aside>

        <main className="flex-1 bg-white/[0.02] border border-white/10 rounded-[35px] p-10 flex flex-col relative overflow-hidden">
          
          {perfilAtivo ? (
            <>
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                    {perfilAtivo.nome}
                    {perfilAtivo.isFixo && <span className="px-2 py-1 bg-white/10 rounded-md text-[9px] font-bold tracking-widest">Padrão do Sistema</span>}
                  </h2>
                  <p className="text-xs opacity-50 mt-2">Personalize os níveis de acesso para usuários deste grupo.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleDuplicarPerfil} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-all" title="Duplicar Permissões">
                    <Copy size={16} />
                  </button>

                  {!perfilAtivo.isFixo && (
                    <button 
                      onClick={() => isEditando ? handleSalvar() : setIsEditando(true)} 
                      disabled={loading}
                      className={`px-6 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all flex items-center gap-2
                        ${isEditando ? 'bg-white text-black hover:scale-105' : 'border border-white/20 hover:bg-white/10'}`}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : isEditando ? <Save size={16} /> : <Edit2 size={16} />}
                      {isEditando ? "Salvar Alterações" : "Editar Permissões"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-4">
                <div className="flex flex-col gap-8">
                  {MODULOS_SISTEMA.map(modulo => (
                    <div key={modulo.id} className="bg-black/20 p-6 rounded-[24px] border border-white/5">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/40" /> {modulo.nome}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {modulo.acoes.map(acao => {
                          const permissaoKey = `${modulo.id}_${acao}`;
                          const isLiberado = permissoesEditaveis.includes(permissaoKey);
                          
                          return (
                            <div key={acao} className="flex items-center justify-between gap-4 group">
                              <span className={`text-xs font-semibold transition-opacity ${isLiberado ? 'opacity-100' : 'opacity-40'}`}>
                                {acao}
                              </span>
                              <Toggle
                                checked={isLiberado} 
                                onChange={() => handleTogglePermissao(permissaoKey)} 
                                disabled={!isEditando || perfilAtivo.isFixo}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col opacity-40">
              <Shield size={48} className="mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Selecione um cargo para visualizar as permissões</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <div 
      onClick={() => !disabled && onChange()}
      className={`w-10 h-[22px] rounded-full flex items-center px-[3px] transition-all duration-300 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${checked ? 'bg-white' : 'bg-white/20 hover:bg-white/30'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-[#0A0A0A] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
    </div>
  );
}