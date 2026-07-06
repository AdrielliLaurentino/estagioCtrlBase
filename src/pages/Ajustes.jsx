import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Bell, Users, ShieldCheck, MonitorSmartphone, 
  CreditCard, FileText, HardDrive, ChevronRight, ShieldAlert, ArrowLeft
} from "lucide-react";

export default function Administrativo() {
  const navigate = useNavigate();
  const getUsuarioLogado = () => { 
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; } 
  };
  
  const usuarioLogado = getUsuarioLogado();
  const cargoUsuario = String(usuarioLogado.cargo || usuarioLogado.perfilAcesso || "").toUpperCase();
  const temPermissaoAdmin = ["ADMIN", "GERENTE", "DONO", "PROPRIETARIO"].includes(cargoUsuario);

  const modulos = [
    { titulo: "DADOS DO NEGÓCIO", descricao: "Gerencie CNPJ, endereço, razão social e logotipo.", icone: Building2, rota: "/admin/dados-negocio", corBorda: "border-l-orange-500", corIcone: "text-orange-500", bgIcone: "bg-orange-500/10" },
    { titulo: "NOTIFICAÇÕES", descricao: "Alertas de estoque baixo e avisos operacionais.", icone: Bell, rota: "/admin/notificacoes", corBorda: "border-l-yellow-500", corIcone: "text-yellow-500", bgIcone: "bg-yellow-500/10" },
    { titulo: "USUÁRIOS", descricao: "Cadastre novos funcionários, redefina senhas e gerencie a equipe.", icone: Users, rota: "/admin/usuarios", corBorda: "border-l-blue-500", corIcone: "text-blue-500", bgIcone: "bg-blue-500/10" },
    { titulo: "PERMISSÕES", descricao: "Defina níveis de acesso e restrições de estorno no PDV.", icone: ShieldCheck, rota: "/admin/permissoes", corBorda: "border-l-cyan-500", corIcone: "text-cyan-500", bgIcone: "bg-cyan-500/10" },
    { titulo: "DISPOSITIVOS", descricao: "Configuração de impressoras térmicas, balanças e leitores.", icone: MonitorSmartphone, rota: "/admin/dispositivos", corBorda: "border-l-emerald-500", corIcone: "text-emerald-500", bgIcone: "bg-emerald-500/10" },
    { titulo: "INTEGRAÇÃO PAGAMENTO", descricao: "Configure TEF, APIs de pagamento, taxas e maquininhas.", icone: CreditCard, rota: "/admin/integracao-pagamento", corBorda: "border-l-green-500", corIcone: "text-green-500", bgIcone: "bg-green-500/10" },
    { titulo: "PRIVACIDADE (LGPD)", descricao: "Portal de transparência, termos de uso e exclusão de contas.", icone: FileText, rota: "/admin/privacidade", corBorda: "border-l-purple-500", corIcone: "text-purple-500", bgIcone: "bg-purple-500/10" },
    { titulo: "BACKUP DO SISTEMA", descricao: "Programe rotinas na nuvem e restaure versões do banco de dados.", icone: HardDrive, rota: "/admin/backup", corBorda: "border-l-pink-500", corIcone: "text-pink-500", bgIcone: "bg-pink-500/10" },
  ];

  if (!temPermissaoAdmin) {
    return (
      <div className="flex w-full h-[calc(100vh-80px)] flex-col items-center justify-center px-4 bg-transparent">
        <ShieldAlert size={56} strokeWidth={1.5} className="mb-6 text-[#DC2626]" />
        <h1 className="text-xl font-bold mb-2 uppercase tracking-wider text-[var(--text-main)]">Acesso Restrito</h1>
        <p className="text-sm mb-10 text-center max-w-md text-[var(--text-main)] opacity-60">
          A parametrização do sistema é exclusiva para a gestão.
        </p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-6 py-3 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar bg-transparent">
      
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#DC2626] uppercase tracking-wide">
          ADMINISTRAÇÃO
        </h1>
        <p className="text-xs font-bold uppercase tracking-widest mt-1 text-[var(--text-main)] opacity-50">
          CONFIGURAÇÕES GERAIS E PARAMETRIZAÇÃO DO SISTEMA
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {modulos.map((modulo, index) => (
          <div 
            key={index}
            onClick={() => navigate(modulo.rota)}
            className={`relative flex flex-col p-6 rounded-2xl cursor-pointer transition-all duration-300 group border-l-[3px] ${modulo.corBorda} bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#DC2626]`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-xl ${modulo.bgIcone} transition-transform group-hover:scale-105`}>
                <modulo.icone className={modulo.corIcone} size={22} strokeWidth={2} />
              </div>
              <ChevronRight size={20} className="transition-colors text-[var(--text-main)] opacity-30 group-hover:opacity-100 group-hover:text-[#DC2626]" />
            </div>
            
            <h2 className="text-sm font-bold uppercase tracking-wider mb-2 transition-colors text-[var(--text-main)]">
              {modulo.titulo}
            </h2>
            
            <p className="text-xs leading-relaxed font-medium transition-colors text-[var(--text-main)] opacity-60">
              {modulo.descricao}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}