import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Mail, KeyRound, 
  Edit3, Camera, ChevronRight,
  FileSignature, Hash, Smartphone, ChevronDown, Store,
  X, Delete, Lock, CheckCircle2, AlertCircle
} from "lucide-react";
import CarrinhoCompras from "../../components/pdv/CarrinhoCompras";
import MenuInferior from "../../layouts/MenuInferior";
import CadastroColaborador from "../../components/register/CadastroColaborador";
import iconVenda from "../../assets/icons/carrinho.png";
import iconCaixa from "../../assets/icons/caixa.png";
import iconColab from "../../assets/icons/colab.png";
import iconHome from "../../assets/icons/home.png";
import iconPerfil from "../../assets/icons/clientes.png";

const MenuIcon = ({ src }) => (
  <div className="w-6 h-6 bg-current transition-colors" style={{ 
    WebkitMaskImage: `url(${src})`, WebkitMaskSize: "contain", WebkitMaskPosition: "center", WebkitMaskRepeat: "no-repeat",
    maskImage: `url(${src})`, maskSize: "contain", maskPosition: "center", maskRepeat: "no-repeat"
  }} />
);

export default function PerfilColaborador() {
  const navigate = useNavigate();
  const [abrirCarrinho, setAbrirCarrinho] = useState(false);
  const [abrirEdicao, setAbrirEdicao] = useState(false);
  const [abrirModalPin, setAbrirModalPin] = useState(false); // Estado para o modal do PIN
  
  const [usuario, setUsuario] = useState({ 
    id: null,
    nome: "Carregando...", 
    nomeRegistro: "Carregando...",
    email: "carregando@sistema.com", 
    perfilAcesso: "Buscando...", 
    idUnidadeAtual: 1
  });

  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([
    { id: 1, nome: "Matriz - Sede" },
    { id: 2, nome: "Filial Centro" }
  ]);

  const [menuMobileIndex, setMenuMobileIndex] = useState(4);

  const menuItems = [
    { icon: <MenuIcon src={iconCaixa} />, label: "Caixa", action: () => navigate('/caixa') },
    { icon: <MenuIcon src={iconVenda} />, label: "Venda", action: () => setAbrirCarrinho(true) }, 
    { icon: <MenuIcon src={iconHome} />, label: "Início", action: () => navigate('/home') },
    { icon: <MenuIcon src={iconColab} />, label: "Cliente", action: () => navigate('/clientes') },
    { icon: <MenuIcon src={iconPerfil} />, label: "Perfil", action: () => {} } 
  ];

  useEffect(() => {
    const buscarDadosDoPerfil = async () => {
      const usuarioSalvo = localStorage.getItem("usuario");
      
      if (usuarioSalvo) {
        const u = JSON.parse(usuarioSalvo);
        
        try {
          const res = await fetch(`http://localhost:8080/funcionarios/${u.id || u.idFuncionario}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${u.token}`,
              "id-operador": String(u.id || u.idFuncionario)
            }
          });

          if (res.ok) {
            const dadosCompletos = await res.json();
            setUsuario({
              ...dadosCompletos,
              id: dadosCompletos.idFuncionario,
              nome: dadosCompletos.nomeCompleto,
              nomeRegistro: dadosCompletos.nomeRegistro || dadosCompletos.nomeCompleto,
              perfilAcesso: dadosCompletos.cargo || "COLABORADOR",
              idUnidadeAtual: dadosCompletos.unidade ? dadosCompletos.unidade.idUnidade : 1
            });
          } else {
            setUsuario(prev => ({
              ...prev,
              nomeRegistro: u.nome,
              perfilAcesso: u.cargo || "COLABORADOR"
            }));
          }
        } catch (error) {
          console.error("Erro de conexão ao buscar perfil:", error);
          setUsuario(prev => ({ ...prev, nomeRegistro: u.nome, perfilAcesso: u.cargo }));
        }
      }
    };

    buscarDadosDoPerfil();
  }, []);

  const handleTrocarUnidade = (e) => {
    const novaUnidadeId = Number(e.target.value);
    setUsuario(prev => ({ ...prev, idUnidadeAtual: novaUnidadeId }));
    console.log("Trocando para unidade ID:", novaUnidadeId);
  };

  const handleVisaoCliente = () => {
    alert("Trocando interface para o App do Aluno...");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8 font-sans transition-colors duration-300 relative pb-28 lg:pb-8" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}>
      
      <div className="flex-none lg:flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-0">
        
        <div className="col-span-4 rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm flex flex-col items-center text-center border h-max" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          
          <div className="relative group cursor-pointer mb-6 mt-4">
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center border-4" style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--bg-card)' }}>
              <User size={60} className="opacity-20" />
            </div>
            <div className="absolute bottom-0 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
              <Camera size={16} />
            </div>
          </div>

          <h2 className="text-2xl font-black mb-1">{usuario.nomeRegistro}</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg mb-6" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--bg-sidebar)' }}>
            {usuario.perfilAcesso}
          </span>

          <div className="w-full relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: 'var(--text-main)' }}>
              <Store size={16} />
            </div>
            <select
              value={usuario.idUnidadeAtual}
              onChange={handleTrocarUnidade}
              className="w-full appearance-none border border-transparent hover:border-[var(--border-color)] text-[13px] font-bold rounded-[16px] pl-12 pr-10 py-4 outline-none transition-all cursor-pointer shadow-sm"
              style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}
            >
              {unidadesDisponiveis.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: 'var(--text-main)' }} />
          </div>

          <div className="w-full flex flex-col gap-3">
            <InfoItem icon={<Mail size={16} />} text={usuario.email} />
          </div>

        </div>

        <div className="col-span-8 flex flex-col gap-4 lg:gap-6 min-h-0">
          
          {/*CONTA E CONTRATOS*/}
          <div className="rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm flex flex-col border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-5">Conta e Contratos</h3>
            <div className="flex flex-col gap-3">
              <ConfigButton 
                icon={<Edit3 size={18} />} 
                title="Editar Dados Pessoais" 
                subtitle="Atualize seu telefone, endereço e informações base." 
                onClick={() => setAbrirEdicao(true)} 
              />
              <ConfigButton 
                icon={<FileSignature size={18} />} 
                title="Termos e Assinaturas" 
                subtitle="Visualize e assine seus termos de responsabilidade jurídica." 
                onClick={() => {}} 
              />
            </div>
          </div>

          {/*SEGURANÇA E ACESSO */}
          <div className="rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm flex flex-col border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-5">Segurança e Acesso</h3>
            <div className="flex flex-col gap-3">
              <ConfigButton 
                icon={<KeyRound size={18} />} 
                title="Alterar Senha do Sistema" 
                subtitle="Modifique a senha utilizada para acessar o painel." 
                onClick={() => {}} 
              />
              <ConfigButton 
                icon={<Hash size={18} />} 
                title="PIN do Crediário" 
                subtitle="Cadastre ou altere sua senha numérica para compras na loja." 
                onClick={() => setAbrirModalPin(true)}
              />
            </div>
          </div>

          <button 
            onClick={handleVisaoCliente}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] lg:rounded-[32px] font-bold text-sm uppercase tracking-widest transition-all hover:-translate-y-1 shadow-sm border border-transparent hover:border-[var(--border-color)]" 
            style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}
          >
            <Smartphone size={18} /> Acessar Visão do Cliente
          </button>

        </div>

      </div>

      <div className="lg:hidden">
        <MenuInferior activeIndex={menuMobileIndex} setActiveIndex={setMenuMobileIndex} items={menuItems} />
      </div>

      {abrirCarrinho && <CarrinhoCompras onClose={() => setAbrirCarrinho(false)} />}
      
      {abrirEdicao && (
        <CadastroColaborador 
          onClose={() => setAbrirEdicao(false)} 
          colaboradorEdit={usuario} 
        />
      )}

      {abrirModalPin && (
        <ModalPinCrediario 
          usuario={usuario} 
          onClose={() => setAbrirModalPin(false)} 
        />
      )}
      
    </div>
  );
}

function ConfigButton({ icon, title, subtitle, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 lg:p-5 rounded-[20px] border border-transparent hover:border-[var(--border-color)] transition-all group" 
      style={{ backgroundColor: 'var(--bg-body)' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-[12px] opacity-70" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
          {icon}
        </div>
        <div className="text-left">
          <h4 className="text-sm font-bold leading-none">{title}</h4>
          <p className="text-[11px] opacity-60 font-medium mt-1">{subtitle}</p>
        </div>
      </div>
      <ChevronRight size={18} className="opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function InfoItem({ icon, text }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[16px] border border-transparent" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="opacity-50" style={{ color: 'var(--text-main)' }}>{icon}</div>
      <span className="text-xs font-bold opacity-80 truncate">{text}</span>
    </div>
  );
}

function ModalPinCrediario({ usuario, onClose }) {
  const [passo, setPasso] = useState(1);
  const [pin, setPin] = useState("");
  const [confirmacaoPin, setConfirmacaoPin] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const tamanhoPin = 4;

  const handleTecla = (num) => {
    setErro("");
    if (passo === 1) {
      if (pin.length < tamanhoPin) setPin(prev => prev + num);
    } else if (passo === 2) {
      if (confirmacaoPin.length < tamanhoPin) setConfirmacaoPin(prev => prev + num);
    }
  };

  const handleApagar = () => {
    if (passo === 1) {
      setPin(prev => prev.slice(0, -1));
    } else if (passo === 2) {
      setConfirmacaoPin(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    if (passo === 1 && pin.length === tamanhoPin) {
      const timer = setTimeout(() => setPasso(2), 300);
      return () => clearTimeout(timer);
    }
    if (passo === 2 && confirmacaoPin.length === tamanhoPin) {
      const timer = setTimeout(() => salvarPin(), 300);
      return () => clearTimeout(timer);
    }
  }, [pin, confirmacaoPin]);

  const salvarPin = async () => {
    if (pin !== confirmacaoPin) {
      setErro("Os PINs informados não coincidem.");
      setConfirmacaoPin("");
      return;
    }

    setCarregando(true);
    const dadosSessao = localStorage.getItem("usuario");
    const u = dadosSessao ? JSON.parse(dadosSessao) : {};

    try {
      const response = await fetch(`http://localhost:8080/funcionarios/${usuario.id || u.id || u.idFuncionario}/alterar-pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${u.token}`,
          "id-operador": String(u.id || u.idFuncionario)
        },
        body: JSON.stringify({ pin: pin })
      });

      if (response.ok) {
        setPasso(3);
      } else {
        setErro("Não foi possível salvar o PIN. Tente novamente.");
        resetarModal();
      }
    } catch (e) {
      setErro("Erro de conexão ao salvar novo PIN.");
      resetarModal();
    } finally {
      setCarregando(false);
    }
  };

  const resetarModal = () => {
    setPasso(1);
    setPin("");
    setConfirmacaoPin("");
  };

  const pinAtual = passo === 1 ? pin : confirmacaoPin;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 animate-fadeIn" style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div 
        className="w-full lg:max-w-md rounded-t-[32px] lg:rounded-[32px] p-6 flex flex-col justify-between border shadow-2xl transition-all h-[85vh] lg:h-auto"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-4 mb-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Lock size={18} className="opacity-70" />
            <h3 className="font-black text-base">PIN de Compras</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-body)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 text-center px-4">
          {passo === 1 && (
            <>
              <h4 className="text-lg font-extrabold mb-1">Crie seu PIN de Segurança</h4>
              <p className="text-xs opacity-60 max-w-[280px]">Este PIN será solicitado para autorizar transações no crediário.</p>
            </>
          )}

          {passo === 2 && (
            <>
              <h4 className="text-lg font-extrabold mb-1 text-[var(--bg-sidebar)]">Confirme seu PIN</h4>
              <p className="text-xs opacity-60 max-w-[280px]">Insira os mesmos {tamanhoPin} dígitos para validação.</p>
            </>
          )}

          {passo === 3 && (
            <div className="flex flex-col items-center py-6 animate-scaleUp">
              <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
              <h4 className="text-xl font-black text-emerald-500 mb-2">PIN Cadastrado!</h4>
              <p className="text-xs opacity-70 mb-6 max-w-[260px]">Sua senha de segurança do crediário foi salva e está pronta para uso.</p>
              <button 
                onClick={onClose} 
                className="px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md w-full"
                style={{ backgroundColor: 'var(--bg-sidebar)' }}
              >
                Concluir
              </button>
            </div>
          )}

          {passo !== 3 && (
            <>
              {/* INDICADORES VISUAIS DOS DÍGITOS (Bolinhas) */}
              <div className="flex gap-4 my-8 justify-center items-center h-8">
                {Array.from({ length: tamanhoPin }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      idx < pinAtual.length 
                        ? 'scale-110' 
                        : 'bg-transparent'
                    }`}
                    style={{ 
                      borderColor: 'var(--text-main)',
                      backgroundColor: idx < pinAtual.length ? 'var(--text-main)' : 'transparent'
                    }}
                  />
                ))}
              </div>

              {/* MENSAGEM DE ERRO OU LOADING */}
              <div className="h-6 flex items-center justify-center">
                {erro && (
                  <span className="text-red-500 text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={14} /> {erro}
                  </span>
                )}
                {carregando && <span className="text-xs font-bold opacity-50 animate-pulse">Processando criptografia...</span>}
              </div>
            </>
          )}
        </div>

        {/* TECLADO NUMÉRICO VIRTUAL (MOBILE INTEGRATED) */}
        {passo !== 3 && (
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full mb-2 animate-fadeIn">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                disabled={carregando}
                onClick={() => handleTecla(String(num))}
                className="h-14 rounded-2xl text-xl font-extrabold flex items-center justify-center border active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--border-color)' }}
              >
                {num}
              </button>
            ))}
            <div className="h-14" /> {/* Espaço vazio para alinhar o 0 ao centro */}
            <button
              disabled={carregando}
              onClick={() => handleTecla("0")}
              className="h-14 rounded-2xl text-xl font-extrabold flex items-center justify-center border active:scale-95 transition-all shadow-sm"
              style={{ backgroundColor: 'var(--bg-body)', borderColor: 'var(--border-color)' }}
            >
              0
            </button>
            <button
              disabled={carregando}
              onClick={handleApagar}
              className="h-14 rounded-2xl flex items-center justify-center text-red-500 active:scale-95 transition-all"
            >
              <Delete size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}