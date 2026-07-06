import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Key, Ticket, CircleDollarSign, 
  Briefcase, Building2, ClipboardCheck, Settings,
  ChevronRight
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const MENU_ADMIN = [
  {
    categoria: "Equipe & Acessos",
    itens: [
      {
        titulo: "Colaboradores",
        descricao: "Gestão de funcionários, RH e dados",
        icone: <Users size={24} />,
        path: "/usuario/colaboradores",
        cor: "text-blue-400"
      },
      {
        titulo: "Permissões de Acesso",
        descricao: "Controle de perfis e hierarquia",
        icone: <Key size={24} />,
        path: "/admin/permissoes",
        cor: "text-purple-400"
      }
    ]
  },
  {
    categoria: "Financeiro & Vendas",
    itens: [
      {
        titulo: "Comissões",
        descricao: "Cálculo e repasse para equipe",
        icone: <CircleDollarSign size={24} />,
        path: "/admin/comissoes",
        cor: "text-green-400"
      },
      {
        titulo: "Vouchers Promocionais",
        descricao: "Criação de cupons de desconto",
        icone: <Ticket size={24} />,
        path: "/admin/vouchers",
        cor: "text-orange-400"
      }
    ]
  },
  {
    categoria: "Operacional & Sistema",
    itens: [
      {
        titulo: "Catálogo de Serviços",
        descricao: "Preços, carência e durações",
        icone: <Briefcase size={24} />,
        path: "/admin/servicos",
        cor: "text-pink-400"
      },
      {
        titulo: "Modelos de Tarefas",
        descricao: "Templates para o mural diário",
        icone: <ClipboardCheck size={24} />,
        path: "/admin/tarefas-template",
        cor: "text-teal-400"
      },
      {
        titulo: "Minhas Filiais",
        descricao: "Gestão de múltiplas unidades",
        icone: <Building2 size={24} />,
        path: "/admin/unidades",
        cor: "text-yellow-400"
      },
      {
        titulo: "Configurações Gerais",
        descricao: "Parâmetros, prazos e cancelamentos",
        icone: <Settings size={24} />,
        path: "/admin/configuracoes",
        cor: "text-gray-400"
      }
    ]
  }
];

export default function Administrativo() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen w-full p-8 transition-colors duration-300 ${isDarkMode ? "bg-[#121212] text-white" : "bg-gray-50 text-gray-900"}`}>
      
      <div className="max-w-6xl mx-auto flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Administração</h1>
          <p className={`text-sm font-semibold tracking-wide ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
            Central de controle do negócio. Selecione um módulo para gerenciar.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {MENU_ADMIN.map((secao, index) => (
            <div key={index} className="flex flex-col gap-4">
              
              <h2 className={`text-xs font-black uppercase tracking-[0.2em] border-b pb-2 ${isDarkMode ? "text-white/30 border-white/10" : "text-gray-400 border-gray-200"}`}>
                {secao.categoria}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {secao.itens.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className={`group relative flex flex-col items-start p-6 rounded-3xl text-left transition-all duration-300 outline-none
                      ${isDarkMode 
                        ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20" 
                        : "bg-white border border-gray-200 hover:shadow-xl hover:-translate-y-1"
                      }
                    `}
                  >
                    {isDarkMode && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none" />
                    )}

                    <div className="flex w-full justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${isDarkMode ? "bg-black/30" : "bg-gray-50"} ${item.cor} transition-transform duration-300 group-hover:scale-110`}>
                        {item.icone}
                      </div>
                      <ChevronRight size={18} className={`opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0 ${isDarkMode ? "text-white/50" : "text-gray-400"}`} />
                    </div>
                    
                    <h3 className={`text-base font-bold tracking-tight mb-1 ${isDarkMode ? "text-white/90" : "text-gray-800"}`}>
                      {item.titulo}
                    </h3>
                    <p className={`text-[11px] font-semibold leading-relaxed ${isDarkMode ? "text-white/40" : "text-gray-500"}`}>
                      {item.descricao}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}