import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { ChevronDown } from "lucide-react"; 
import logo from "../assets/icons/logo.png";
import pesquisarIcon from "../assets/icons/pesquisar.png";
import homeIcon from "../assets/icons/home.png";
import agendaIcon from "../assets/icons/agenda.png"; 
import estoqueIcon from "../assets/icons/estoque.png";
import clientesIcon from "../assets/icons/clientes.png";
import financeiroIcon from "../assets/icons/financeiro.png";
import gerenciaIcon from "../assets/icons/gerencia.png";
import administrativoIcon from "../assets/icons/administrativo.png";
import relatoriosIcon from "../assets/icons/relatorios.png"; 
import avaliacaoIcon from "../assets/icons/avaliacao.png"; 
import sairIcon from "../assets/icons/sair.png";
import engrenagemIcon from "../assets/icons/engrenagem.png";
import solIcon from "../assets/icons/sol.png";
import luaIcon from "../assets/icons/lua.png";

const iconMap = { 
  homeIcon, agendaIcon, estoqueIcon, clientesIcon, 
  financeiroIcon, gerenciaIcon, administrativoIcon, 
  relatoriosIcon, avaliacaoIcon 
};

const scrollbarStyle = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(60, 60, 60, 0.5); border-radius: 10px; transition: background-color 0.3s ease; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #DC2626; }
  .custom-scrollbar::-webkit-scrollbar-button { display: none; }
  
  .hide-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; background: transparent !important; }
  .hide-scroll { -ms-overflow-style: none !important; scrollbar-width: none !important; overflow-y: scroll !important; }
`;

const TEMPO_INATIVIDADE_MS = 600000;
const ADMINS = ["DONO", "ADMIN", "GERENTE"];
const GESTAO_VENDAS = [...ADMINS, "LIDER_VENDA"];
const RECEPCAO = ["RECEPCIONISTA"];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const isExpanded = expanded || isMobile;
  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);
  
  const cargoUsuario = String(usuarioLogado.cargo || usuarioLogado.perfilAcesso || "VENDEDOR").toUpperCase();
  
  const efetuarLogout = useCallback(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("@CtrlBase:token");
    localStorage.removeItem("@CtrlBase:user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    let timeoutId;
    const resetarTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("A sua sessão expirou por inatividade. Faça login novamente.");
        efetuarLogout();
      }, TEMPO_INATIVIDADE_MS);
    };
    
    const eventos = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    eventos.forEach(evento => window.addEventListener(evento, resetarTimer));
    resetarTimer(); 

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      eventos.forEach(evento => window.removeEventListener(evento, resetarTimer));
    };
  }, [efetuarLogout]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menusPermitidos = useMemo(() => {
    const menus = [];
    const isAdmins = ADMINS.includes(cargoUsuario);
    const isGestaoVendas = GESTAO_VENDAS.includes(cargoUsuario);
    const isRecepcao = RECEPCAO.includes(cargoUsuario);

    menus.push({ name: "Home", icon: "homeIcon", path: "/home" });
    menus.push({ name: "Agenda", icon: "agendaIcon", path: "/agenda" });
    menus.push({ name: "Clientes", icon: "clientesIcon", path: "/clientes" });
    menus.push({ name: "Avaliação Física", icon: "avaliacaoIcon", path: "/avaliacoes" });

    if (isGestaoVendas) {
      menus.push({
        name: "Estoque",
        icon: "estoqueIcon",
        path: "/estoque",
        subpages: [{ name: "Vendas", path: "/vendas" }]
      });
    } else if (isRecepcao) {
      menus.push({ name: "Vendas", icon: "estoqueIcon", path: "/vendas" });
    }

    if (isGestaoVendas) {
      menus.push({
        name: "Financeiro",
        icon: "financeiroIcon",
        path: "/financeiro",
        subpages: [{ name: "Caixa", path: "/caixa" }]
      });
    } else if (isRecepcao) {
      menus.push({ name: "Caixa", icon: "financeiroIcon", path: "/caixa" });
    }

    if (isAdmins) {
      menus.push({
        name: "Gerência",
        icon: "gerenciaIcon",
        path: "/gerencia",
        subpages: [
          { name: "Lista de Compras", path: "/estoque/lista-compras" },
          { name: "Conferir Caixa", path: "/financeiro/conferencia" },
          { name: "Cupões", path: "/gerencia/cupons" }
        ]
      });

      menus.push({
        name: "Administrativo",
        icon: "administrativoIcon",
        path: "/admin/colaboradores",
        subpages: [{ name: "Colaboradores", path: "/admin/colaboradores" }]
      });

      menus.push({
        name: "Relatórios",
        icon: "relatoriosIcon",
        path: "/relatorios",
        subpages: [
          { name: "Vendas", path: "/relatorios/vendas" },
          { name: "Estoque", path: "/relatorios/estoque" },
          { name: "Financeiro", path: "/relatorios/financeiro" },
          { name: "Desempenho", path: "/relatorios/desempenho" },
          { name: "Unidades", path: "/relatorios/unidades" },
        ]
      });
    }

    return menus;
  }, [cargoUsuario]);

  const filteredMenus = menusPermitidos.filter(menu => 
    menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    menu.subpages?.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNavigation = (menu) => {
    navigate(menu.path);
    if (menu.subpages && isExpanded) {
      setOpenSubmenu(openSubmenu === menu.name ? null : menu.name);
    }
    if (isMobile && !menu.subpages) setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col md:flex-row bg-[var(--bg-body)] print:block print:h-auto print:overflow-visible print:bg-white">
      <style>{scrollbarStyle}</style>

      {isMobile && (
        <header className="h-16 flex items-center px-6 z-40 shrink-0 bg-[var(--bg-body)] print:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="text-3xl text-[var(--bg-sidebar)] outline-none">☰</button>
          <div className="flex-1 flex justify-center pr-8">
            <img src={logo} alt="Logo" className="h-8 opacity-80" />
          </div>
        </header>
      )}

      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] transition-opacity print:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed transition-all duration-300 z-[1000] flex flex-col justify-between shadow-2xl print:hidden
          ${isMobile ? (mobileMenuOpen ? 'left-0 top-0 h-full w-[260px]' : '-left-full top-0 h-full w-[260px]') 
                     : `left-5 top-5 h-[calc(100vh-2.5rem)] rounded-[24px] ${expanded ? 'w-[15rem]' : 'w-[5.5rem]'}`}`}
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
        onMouseEnter={() => !isMobile && setExpanded(true)}
        onMouseLeave={() => { 
          if(!isMobile) { 
            setExpanded(false); 
            setConfigModalOpen(false); 
            setOpenSubmenu(null);
          } 
        }}
      >
        <div className="flex-1 flex flex-col py-8 hide-scroll">
          <div className="flex justify-center mb-10 shrink-0">
            <img src={logo} alt="Logo" className="transition-all duration-300 brightness-0 invert" 
                 style={{ width: isExpanded ? '100px' : '40px' }} />
          </div>

          <div className={`mx-4 mb-6 flex transition-all cursor-pointer border-white/40 shrink-0 
            ${isExpanded ? 'flex-row items-center border-b pb-2 px-2' : 'flex-col items-center border-none'}`}
            onClick={() => !isMobile && setExpanded(true)}>
            <img src={pesquisarIcon} className="w-5 brightness-0 invert hover:scale-110 transition-transform shrink-0" alt="Busca" />
            {isExpanded ? (
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ml-3 bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/60" 
              />
            ) : (
              <span className="text-[9px] mt-2 uppercase font-bold text-white tracking-widest">Pesquisar</span>
            )}
          </div>

          <nav className="px-2 space-y-2">
            {filteredMenus.map((menu) => {
              const isSubmenuOpen = openSubmenu === menu.name;
              const isActive = location.pathname.startsWith(menu.path) || (menu.subpages && menu.subpages.some(sub => location.pathname.startsWith(sub.path)));

              return (
                <div key={menu.name} className="flex flex-col shrink-0">
                  <div 
                    onClick={() => handleNavigation(menu)}
                    className={`flex items-center cursor-pointer transition-all duration-300 text-white w-full outline-none
                      ${isActive ? 'opacity-100 font-bold scale-105' : 'opacity-75 hover:opacity-100 hover:scale-105'} 
                      ${isExpanded ? 'flex-row gap-4 px-4 py-3 justify-start' : 'flex-col gap-1 py-3 justify-center'}`}>
                    
                    <img src={iconMap[menu.icon]} className="brightness-0 invert w-5 h-5 md:w-6 md:h-6 object-contain shrink-0" alt={menu.name} />
                    
                    <span className={`truncate ${isExpanded ? 'text-[14px]' : 'text-[9px] uppercase font-bold text-center'}`}>
                      {menu.name}
                    </span>

                    {menu.subpages && isExpanded && (
                      <ChevronDown 
                        size={18} 
                        className={`ml-auto shrink-0 transition-transform duration-300 ${isSubmenuOpen ? "rotate-0" : "-rotate-90"}`} 
                      />
                    )}
                  </div>

                  {menu.subpages && isSubmenuOpen && isExpanded && (
                    <div className="flex flex-col ml-12 mt-2 space-y-2 border-l border-white/20">
                      {menu.subpages.map(sub => (
                        <span 
                          key={sub.name}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(sub.path); 
                            if(isMobile) setMobileMenuOpen(false); 
                          }}
                          className={`truncate text-xs text-white/70 hover:text-white hover:scale-105 origin-left cursor-pointer py-1 pl-4 transition-all outline-none
                            ${location.pathname === sub.path ? 'text-white font-bold scale-105' : ''}`}>
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="py-4 mb-2 shrink-0 relative border-t border-white/10 mx-4">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setConfigModalOpen(!configModalOpen);
              if (!isExpanded && !isMobile) setExpanded(true); 
            }}
            className={`flex items-center text-white cursor-pointer transition-all duration-300 hover:scale-105 outline-none
            ${isExpanded ? 'flex-row gap-4 px-2 justify-start' : 'flex-col gap-1 justify-center w-full'}`}>
            
            <img src={engrenagemIcon} className="brightness-0 invert w-6 h-6 object-contain shrink-0" alt="Configuração" />
            <span className={isExpanded ? 'text-[15px]' : 'text-[9px] uppercase font-bold text-center'}>
              Configuração
            </span>
          </div>

          {configModalOpen && isExpanded && (
            <div className={`absolute z-[1001] rounded-2xl shadow-2xl p-4 border border-black/5 dark:border-white/5 bg-[var(--bg-body)]
                ${isMobile ? 'bottom-24 left-0 right-0' : 'bottom-[105%] left-0 w-[190px]'}`}>
              <div className="flex flex-col gap-3">
                
                {ADMINS.includes(cargoUsuario) && (
                  <button 
                    onClick={() => { navigate("/ajustes"); setConfigModalOpen(false); }} 
                    className="flex items-center gap-3 w-full bg-transparent hover:scale-105 transition-transform outline-none"
                  >
                    <div className="w-5 h-5 bg-[var(--text-main)]" style={{ WebkitMask: `url(${engrenagemIcon}) center/contain no-repeat`, mask: `url(${engrenagemIcon}) center/contain no-repeat` }} />
                    <span className="text-sm font-bold text-[var(--text-main)]">Ajustes</span>
                  </button>
                )}

                <button onClick={toggleTheme} className="flex items-center gap-3 w-full bg-transparent hover:scale-105 transition-transform outline-none">
                  <div className="w-5 h-5 bg-[var(--text-main)]" style={{ WebkitMask: `url(${isDarkMode ? solIcon : luaIcon}) center/contain no-repeat`, mask: `url(${isDarkMode ? solIcon : luaIcon}) center/contain no-repeat` }} />
                  <span className="text-sm font-bold text-[var(--text-main)]">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
                
                <hr className="border-black/5 dark:border-white/10" />
                
                <button onClick={efetuarLogout} className="flex items-center gap-3 w-full bg-transparent hover:scale-105 transition-transform outline-none">
                  <div className="w-4 h-4 bg-[var(--text-main)]" style={{ WebkitMask: `url(${sairIcon}) center/contain no-repeat`, mask: `url(${sairIcon}) center/contain no-repeat` }} />
                  <span className="text-sm font-bold text-[var(--text-main)]">Sair</span>
                </button>
                
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={`flex-1 overflow-y-auto transition-all duration-300 custom-scrollbar print:m-0 print:p-0 print:w-full print:block print:overflow-visible print:bg-white
        ${isMobile ? 'p-4 pb-28' : 'my-5 mr-5 ml-[7.5rem] rounded-[24px]'}
        ${!isMobile && expanded ? 'md:ml-[17rem]' : ''}`}>
        <div className="h-full w-full print:h-auto print:w-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
}