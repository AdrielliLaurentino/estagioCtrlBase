import React, { useState, useEffect } from "react";
import { Eye, EyeOff, AlertCircle, Search, ArrowLeft, ChevronDown, CheckCircle, Lock, ShieldCheck, XCircle, UserPlus, UserCheck, Calendar, Type } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import logoImage from "../../assets/icons/logobase.png";
import { validarCPF } from "../../utils/validadores";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = import.meta.env?.VITE_API_URL || process.env?.REACT_APP_API_URL || "";
const API_BASE = `${BASE_URL}/api/auth`;

const limparFormatacao = (valor) => (valor ? String(valor).replace(/\D/g, "") : "");

const limparPuntuacaoLogin = (valor) => {
  if (!valor) return "";
  const str = String(valor).trim();
  if (str.includes("@")) return str;
  return str.replace(/[^a-zA-Z0-9]/g, "");
};

const aplicarMascara = (campo, valor) => {
  if (!valor) return "";
  let v = String(valor).replace(/\D/g, "");
  
  if (campo === "documentoNumero") {
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      v = v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v.slice(0, 18);
  }
  
  if (campo === "cpf") { 
    v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); 
    return v.slice(0, 14); 
  }
  
  if (campo.includes("telefone") || campo === "telefoneSocio") { 
    v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); 
    return v.slice(0, 15); 
  }
  
  if (campo === "cep") { 
    v = v.replace(/^(\d{5})(\d)/, "$1-$2"); 
    return v.slice(0, 9); 
  }
  
  if (campo === "dataNascimento") {
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,4})/, "$1/$2");
    return v;
  }
  
  return valor;
};

const tratarErroBackend = async (response) => {
  try {
    const errData = await response.json();
    if (errData.errors && Array.isArray(errData.errors)) return errData.errors.map(e => e.mensagem || e.defaultMessage).join(" | ");
    if (errData.message) return errData.message;
    if (errData.erro) return errData.erro;
    if (response.status === 400) return "Dados inválidos. Verifique os campos preenchidos e tente novamente.";
    if (response.status === 401) return "Credenciais inválidas ou não autorizadas.";
    if (response.status === 403) return "Acesso bloqueado. O token pode estar expirado ou a rota não permite esta ação.";
    return "Erro inesperado ao processar a requisição.";
  } catch {
    return `Erro de comunicação com o servidor: Status ${response.status}`;
  }
};

const CustomInput = ({ name, control, label, type = "text", mask, isPassword, showPassState, setShowPassState, onSearch, showSearchBtn, required, loadingCnpj, onBlurCustom }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <Controller
      name={name} 
      control={control}
      render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => {
        const hasValue = value && value.length > 0;
        return (
          <div className="floating-group">
            <input
              id={fieldName} 
              name={fieldName}
              type={isPassword ? (showPassState ? "text" : "password") : type}
              className={`floating-input ${error ? "error" : ""}`} 
              placeholder=" "
              value={value || ""} 
              onChange={e => onChange(mask ? aplicarMascara(mask === true ? fieldName : mask, e.target.value) : e.target.value)}
              onFocus={() => setIsFocused(true)} 
              onBlur={(e) => { setIsFocused(false); onBlur(e); if(onBlurCustom) onBlurCustom(e.target.value); }}
              autoComplete={isPassword ? "current-password" : "off"}
            />
            <label htmlFor={fieldName} className={`floating-label ${hasValue || isFocused ? "active" : ""} ${error ? "error" : ""}`}>
              {label} {required && <span className="required-mark">*</span>}
            </label>
            {isPassword && hasValue && (
              <button type="button" className="action-btn-inside" onClick={() => setShowPassState(!showPassState)}>
                {showPassState ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            {onSearch && showSearchBtn && hasValue && (
              <button type="button" className="action-btn-inside flex items-center justify-center" onClick={() => onSearch(value)} disabled={loadingCnpj} title="Buscar Dados">
                {loadingCnpj ? (
                  <div className="w-[18px] h-[18px] border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search size={18} color="#c40000" />
                )}
              </button>
            )}
            {error && <span className="field-error-text" style={{position: "absolute", bottom: "-15px", left: 0, fontSize: "10px", color: "#c40000"}}>{error.message}</span>}
          </div>
        );
      }}
    />
  );
};

const CustomInputData = ({ name, control, label, required }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [usarCalendario, setUsarCalendario] = useState(false);

  return (
    <Controller
      name={name} 
      control={control}
      render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => {
        const hasValue = value && value.length > 0;
        
        const valorNativo = () => {
            if (value && value.length === 10) {
                const [dia, mes, ano] = value.split("/");
                return `${ano}-${mes}-${dia}`;
            }
            return "";
        };

        return (
          <div className="floating-group">
            <div className="relative flex items-center w-full">
              {!usarCalendario ? (
                <input
                  id={fieldName} 
                  name={fieldName} 
                  type="text"
                  className={`floating-input ${error ? "error" : ""} pr-10`} 
                  placeholder=" "
                  value={value || ""} 
                  onChange={e => onChange(aplicarMascara("dataNascimento", e.target.value))}
                  onFocus={() => setIsFocused(true)} 
                  onBlur={(e) => { setIsFocused(false); onBlur(e); }}
                />
              ) : (
                <input
                  id={fieldName} 
                  name={fieldName} 
                  type="date"
                  className={`floating-input ${error ? "error" : ""} pr-10`}
                  value={valorNativo()} 
                  onFocus={() => setIsFocused(true)} 
                  onBlur={(e) => { setIsFocused(false); onBlur(e); }}
                  onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return onChange("");
                      const [ano, mes, dia] = val.split("-");
                      onChange(`${dia}/${mes}/${ano}`);
                  }}
                />
              )}
              <label htmlFor={fieldName} className={`floating-label ${hasValue || isFocused ? "active" : ""} ${error ? "error" : ""}`}>
                {label} {required && <span className="required-mark">*</span>}
              </label>
              <button type="button" onClick={() => setUsarCalendario(!usarCalendario)} className="action-btn-inside outline-none">
                 {usarCalendario ? <Type size={16} /> : <Calendar size={16} />}
              </button>
            </div>
            {error && <span className="field-error-text" style={{position: "absolute", bottom: "-15px", left: 0, fontSize: "10px", color: "#c40000"}}>{error.message}</span>}
          </div>
        );
      }}
    />
  );
};

const STYLES = `
  .login-fullscreen-wrapper { position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background-color: #fff; overflow: hidden; display: flex; font-family: 'Segoe UI', sans-serif; z-index: 9999; margin: 0; padding: 0; text-align: left; }
  input:invalid, input:-moz-ui-invalid { box-shadow: none !important; }
  input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px white inset !important; -webkit-text-fill-color: #333 !important; transition: background-color 5000s ease-in-out 0s; }
  .black-cover { position: absolute; top: 0; width: 75vw; height: 100vh; background-color: #000; z-index: 10; will-change: left, clip-path; left: 35vw; clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%); }
  .black-shape { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .logo-on-cover { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40%; max-width: 1200px; height: auto; z-index: 12; filter: drop-shadow(0 0 20px rgba(0,0,0,0.5)); }
  .anim-go-left { animation: cycleToLeft 1.2s forwards cubic-bezier(0.645, 0.045, 0.355, 1); }
  .anim-go-right { animation: cycleToRight 1.2s forwards cubic-bezier(0.645, 0.045, 0.355, 1); }
  @keyframes cycleToLeft { 0% { left: 35vw; clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%); } 45% { left: 100vw; clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%); } 46% { left: -100vw; clip-path: polygon(0 0, 85% 0, 100% 100%, 0% 100%); } 100% { left: -15vw; clip-path: polygon(0 0, 85% 0, 100% 100%, 0% 100%); } }
  @keyframes cycleToRight { 0% { left: -15vw; clip-path: polygon(0 0, 85% 0, 100% 100%, 0% 100%); } 45% { left: -100vw; clip-path: polygon(0 0, 85% 0, 100% 100%, 0% 100%); } 46% { left: 100vw; clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%); } 100% { left: 35vw; clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%); } }
  .form-wrapper { position: absolute; top: 0; height: 100vh; width: 40vw; display: flex; align-items: center; justify-content: center; z-index: 5; transition: all 0.8s ease-in-out; flex-direction: column; }
  .left-panel { left: 0; } .right-panel { right: 0; } 
  .active-content { opacity: 1; pointer-events: all; transform: scale(1); transition-delay: 0.7s; }
  .inactive-content { opacity: 0; pointer-events: none; transform: scale(0.9); transition-delay: 0s; }
  .form-content { width: 85%; max-width: 400px; padding: 20px; }
  .mobile-logo-wrapper { display: none; text-align: center; width: 100%; margin-bottom: 24px; }
  .mobile-logo-form { width: 90px; height: auto; filter: brightness(0); opacity: 0.85; margin: 0 auto; }
  .scrollable { max-height: 90vh; overflow-y: auto; padding-right: 15px; padding-top: 10px; }
  .title-red { color: #c40000; font-size: 2.2rem; font-weight: 800; margin-bottom: 5px; line-height: 1.1; }
  .subtitle { color: #666; margin-bottom: 30px; font-size: 1rem; }
  .form-grid { display: flex; flex-direction: column; gap: 24px; width: 100%; }
  .floating-group { position: relative; width: 100%; }
  .floating-input { width: 100%; padding: 10px 0 5px 0; font-size: 1rem; color: #333; border: none; border-bottom: 1.5px solid #ccc; background: transparent; outline: none; transition: border-color 0.3s ease; border-radius: 0; }
  .floating-input:focus { border-bottom-color: #c40000; }
  .floating-input.error { border-bottom-color: #c40000; }
  .floating-label { position: absolute; left: 0; top: 10px; font-size: 1rem; color: #888; pointer-events: none; transition: all 0.2s ease; display: flex; align-items: center; }
  .floating-label.active { top: -12px; font-size: 0.75rem; color: #c40000; font-weight: 600; }
  .floating-label.error { color: #c40000; }
  .action-btn-inside { position: absolute; right: 0; top: 50%; transform: translateY(-30%); background: none; border: none; cursor: pointer; padding: 5px; color: #999; outline: none; }
  .action-btn-inside:hover { color: #c40000; }
  .forgot-wrapper { display: flex; justify-content: space-between; margin-top: -10px; }
  .forgot-link { font-size: 0.85rem; color: #888; cursor: pointer; font-weight: 500; transition: color 0.2s; }
  .forgot-link:hover { color: #c40000; text-decoration: underline; }
  .btn-red { width: 100%; padding: 14px; background-color: #c40000; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; outline: none; }
  .btn-red:hover { background-color: #a00000; }
  .btn-red:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-outline { width: 100%; padding: 14px; background-color: transparent; color: #c40000; border: 1px solid #c40000; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; outline: none; }
  .button-row { display: flex; gap: 15px; width: 100%; margin-top: 5px; }
  .switch-text { margin-top: 25px; text-align: center; color: #555; }
  .switch-text span { color: #c40000; font-weight: bold; cursor: pointer; margin-left: 5px; }
  .feedback-box { padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
  .error-box { color: #8B0000; background: #ffe6e6; border: 1px solid #ffcccc; word-break: break-word; }
  .success-box { color: #006600; background: #e6ffe6; border: 1px solid #ccffcc; }
  .stepper { display: flex; justify-content: center; gap: 12px; margin-bottom: 25px; }
  .step-dot { width: 12px; height: 12px; border-radius: 50%; background: #ddd; transition: 0.3s; }
  .step-dot.active { background: #c40000; transform: scale(1.2); }
  .type-selector { display: flex; gap: 10px; margin-bottom: 25px; background: #f5f5f5; padding: 4px; border-radius: 8px; }
  .type-btn { flex: 1; padding: 10px; border: none; background: transparent; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .type-btn.active { background: #fff; color: #c40000; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

  @media (max-width: 768px) {
    .login-fullscreen-wrapper { background-color: #ffffff; display: block; overflow-y: auto; overflow-x: hidden; }
    .black-cover { display: none; }
    .form-wrapper { width: 100vw; position: absolute; top: 0; height: auto; min-height: 100vh; align-items: flex-start; justify-content: center; background: transparent; padding: 6vh 0 10vh 0; }
    .form-content { width: 90%; max-width: 420px; padding: 20px; background: transparent; box-shadow: none; border-radius: 0; position: relative; z-index: 10; margin: 0 auto; }
    .mobile-logo-wrapper { display: block; }
    .title-red, .subtitle { text-align: center; }
  }
`;

const loginSchema = yup.object({ 
  login: yup.string().required("Campo obrigatório"), 
  senha: yup.string().required("Campo obrigatório") 
});

const empresaPasso1Schema = yup.object({
  documentoNumero: yup.string().required("Obrigatório").test("cpf-ou-cnpj", "Inválido", val => { 
    const cleanVal = val ? val.replace(/\D/g, "") : ""; 
    return cleanVal.length === 11 || cleanVal.length === 14; 
  }),
  razaoSocial: yup.string().required("Obrigatório"),
  nomeFantasia: yup.string().required("Obrigatório"),
  emailContato: yup.string().email("E-mail inválido").required("Obrigatório"),
  telefoneEmpresa: yup.string().required("Obrigatório"),
});

const empresaPasso2Schema = yup.object({
  cep: yup.string().required("Obrigatório"),
  logradouro: yup.string().required("Obrigatório"),
  numero: yup.string().required("Obrigatório"),
  bairro: yup.string().required("Obrigatório"),
  cidade: yup.string().required("Obrigatório"),
  uf: yup.string().required("Obrigatório"),
});

const socioSchema = yup.object({
  nomeCompleto: yup.string().required("Obrigatório").min(5, "Nome curto"),
  cpf: yup.string().required("Obrigatório").test("cpf", "CPF inválido", val => validarCPF(val || "")),
  dataNascimento: yup.string().required("Obrigatório").length(10, "Data inválida"),
  sexoBiologico: yup.string().required("Obrigatório"),
  emailSocio: yup.string().email("E-mail inválido").required("Obrigatório"),
  telefoneSocio: yup.string().required("Obrigatório"),
  senhaSocio: yup.string().required("Obrigatório").min(6, "Mín. 6 dígitos"),
  confirmarSenha: yup.string().required("Obrigatório").oneOf([yup.ref('senhaSocio')], "Senhas não conferem"),
});

export default function LoginCadastro() {
  const { signIn, handleLoginSuccess } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [regStep, setRegStep] = useState(1); 
  const [isNovoTitular, setIsNovoTitular] = useState(true);
  const [isActivationView, setIsActivationView] = useState(false);
  const [activationEmail, setActivationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpFocused, setOtpFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [isTrocaSenhaView, setIsTrocaSenhaView] = useState(false);
  const [tempAuthData, setTempAuthData] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmNovaSenha, setShowConfirmNovaSenha] = useState(false);
  const [senhaFocused, setSenhaFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showSocioPass, setShowSocioPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");
  
  const { control: controlLogin, handleSubmit: handleSubmitLogin } = useForm({ resolver: yupResolver(loginSchema), mode: "all" });
  const { control: controlStep1, trigger: triggerStep1, setValue: setStep1Value, getValues: getStep1Values } = useForm({ resolver: yupResolver(empresaPasso1Schema), mode: "all" });
  const { control: controlStep2, trigger: triggerStep2, setValue: setStep2Value, getValues: getStep2Values } = useForm({ resolver: yupResolver(empresaPasso2Schema), mode: "all" });
  const { control: controlSocio, handleSubmit: handleSubmitSocio, getValues: getSocioValues } = useForm({ resolver: yupResolver(socioSchema), mode: "all" });

  useEffect(() => {
    if (window.innerWidth > 768) {
      const cover = document.querySelector(".black-cover");
      if (cover) { 
        cover.style.clipPath = "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)"; 
        cover.style.left = "35vw"; 
      }
    }
  }, []);

  const onErrorSubmit = () => setErroGeral("Preencha todos os campos obrigatórios para prosseguir.");

  const complementarDadosUnidade = async (dadosUsuario) => {
    try {
      const res = await fetch(`${BASE_URL}/api/unidades/dados-negocio`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dadosUsuario.token}`,
          'id-operador': String(dadosUsuario.id)
        }
      });

      if (res.ok) {
        const unidadeInfo = await res.json();
        if (unidadeInfo && (unidadeInfo.idUnidade || unidadeInfo.id)) {
          dadosUsuario.idUnidade = unidadeInfo.idUnidade || unidadeInfo.id;
          dadosUsuario.idUnidadeSessao = unidadeInfo.idUnidade || unidadeInfo.id;
        }
      }
    } catch (e) {
      console.warn("Não foi possível resolver o ID da Unidade após o login.", e);
    }
    return dadosUsuario;
  };

  const processarDadosUnidade = (dadosUsuario) => {
    const unidades = dadosUsuario.unidades || dadosUsuario.unidadesVinculadas || [];
    const unidadeDiretaId = dadosUsuario.idUnidade || dadosUsuario.unidadeId;

    if (unidadeDiretaId) {
        dadosUsuario.idUnidade = unidadeDiretaId;
        dadosUsuario.idUnidadeSessao = unidadeDiretaId;
    } else if (unidades.length === 1) {
        dadosUsuario.idUnidade = unidades[0].id || unidades[0].idUnidade;
        dadosUsuario.idUnidadeSessao = dadosUsuario.idUnidade;
    }

    if (unidades.length > 1) {
      window.dispatchEvent(new CustomEvent('modal:selecao-unidade', { detail: { dadosUsuario } }));
    } else {
      handleLoginSuccess(dadosUsuario);
    }
  };

  const onSubmitLogin = async (data) => {
    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");
    
    try {
      const loginLimpo = limparPuntuacaoLogin(data.login);
      let dadosUsuario = await signIn(loginLimpo, data.senha);
      
      if (dadosUsuario.requerTrocaSenha) {
        setTempAuthData({ ...dadosUsuario, loginUtilizado: loginLimpo });
        setIsTrocaSenhaView(true);
      } else {
        dadosUsuario = await complementarDadosUnidade(dadosUsuario);
        processarDadosUnidade(dadosUsuario);
      }
    } catch (err) { 
      const msg = err.message.toLowerCase();
      if (msg.includes("inativa") || msg.includes("não ativada") || msg.includes("ativação")) {
        setActivationEmail(data.login);
        setIsActivationView(true);
      } else {
        setErroGeral(err.message || "Conta inativa. Verifique o seu e-mail para ativação.");
      }
    } finally { 
      setLoading(false); 
    } 
  };

  const onSubmitCadastroNovoUsuario = async (socioData) => {
    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");
    
    const step1Data = getStep1Values();
    const step2Data = getStep2Values();
    const donoEmailForm = socioData.emailSocio.toLowerCase().trim();

    let dataNascimentoFormatada = "";
    if (socioData.dataNascimento) {
        const [dia, mes, ano] = socioData.dataNascimento.split("/");
        dataNascimentoFormatada = `${dia}-${mes}-${ano}`;
    }

    try {
      const payload = {
        empresa: { 
          razaoSocial: step1Data.razaoSocial, 
          nomeFantasia: step1Data.nomeFantasia, 
          documentoNumero: limparFormatacao(step1Data.documentoNumero), 
          tipoDocumento: limparFormatacao(step1Data.documentoNumero).length === 11 ? "CPF" : "CNPJ", 
          emailContato: step1Data.emailContato, 
          telefone: limparFormatacao(step1Data.telefoneEmpresa),
          cep: limparFormatacao(step2Data.cep), 
          logradouro: step2Data.logradouro,
          numero: step2Data.numero, 
          bairro: step2Data.bairro,
          cidade: step2Data.cidade, 
          uf: step2Data.uf
        },
        dono: { 
          nomeCompleto: socioData.nomeCompleto.trim().replace(/\s+/g, ' '), 
          cpf: limparFormatacao(socioData.cpf), 
          email: donoEmailForm, 
          login: limparFormatacao(socioData.cpf), 
          senha: socioData.senhaSocio, 
          telefone: limparFormatacao(socioData.telefoneSocio), 
          sexoBiologico: socioData.sexoBiologico.toUpperCase(),
          dataNascimento: dataNascimentoFormatada 
        }
      };

      const response = await fetch(`${API_BASE}/register`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!response.ok) throw new Error(await tratarErroBackend(response));

      setActivationEmail(payload.dono.email);
      setIsActivationView(true);
    } catch (err) { 
      const msg = err.message || "";
      if (msg.includes("unidade_documento_numero_key") || msg.toLowerCase().includes("já existe")) {
        setErroGeral("Este CNPJ/CPF já está registado. Tente recuperar o acesso ou utilizar outro documento.");
      } else {
        setErroGeral(msg);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const handleCadastroUsuarioExistente = async () => {
    const cpf = getSocioValues("cpf");
    const senha = getSocioValues("senhaSocio");

    if (!cpf || !senha) {
      setErroGeral("Para vincular uma nova unidade, insira o seu CPF e Palavra-passe registados.");
      return;
    }

    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");
    
    const step1Data = getStep1Values();
    const step2Data = getStep2Values();

    try {
      const payload = {
        empresa: { 
          razaoSocial: step1Data.razaoSocial, 
          nomeFantasia: step1Data.nomeFantasia, 
          documentoNumero: limparFormatacao(step1Data.documentoNumero), 
          tipoDocumento: limparFormatacao(step1Data.documentoNumero).length === 11 ? "CPF" : "CNPJ", 
          emailContato: step1Data.emailContato, 
          telefone: limparFormatacao(step1Data.telefoneEmpresa),
          cep: limparFormatacao(step2Data.cep), 
          logradouro: step2Data.logradouro,
          numero: step2Data.numero, 
          bairro: step2Data.bairro,
          cidade: step2Data.cidade, 
          uf: step2Data.uf
        },
        donoExistente: { 
          login: limparFormatacao(cpf), 
          senha: senha 
        }
      };

      const response = await fetch(`${API_BASE}/register-unit-existing`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("O suporte a múltiplas unidades ainda está em desenvolvimento. Por favor, aguarde as próximas atualizações do sistema.");
        }
        throw new Error(await tratarErroBackend(response));
      }

      setSucessoMsg("Unidade vinculada com sucesso ao seu utilizador!");
      setTimeout(() => handleSwitch(true), 2000);
    } catch (err) {
      setErroGeral(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  const onSubmitStep3Form = (e) => {
    e.preventDefault();
    if (isNovoTitular) handleSubmitSocio(onSubmitCadastroNovoUsuario, onErrorSubmit)(e);
    else handleCadastroUsuarioExistente();
  };

  const handleAtivarConta = async () => {
    if(!activationEmail) { setErroGeral("O campo E-mail é obrigatório."); return; }
    if(otpCode.length < 6) { setErroGeral("Digite o código de 6 dígitos."); return; }
    
    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");

    try {
      const res = await fetch(`${API_BASE}/validate-otp`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email: activationEmail, codigo: otpCode }) 
      });
      
      if (!res.ok) throw new Error(await tratarErroBackend(res));
      
      setSucessoMsg("Conta ativada com sucesso! A redirecionar para o login...");
      
      setTimeout(() => { 
        setIsActivationView(false); 
        setOtpCode(""); 
        setSucessoMsg(""); 
        if(!isLogin) handleSwitch(true); 
      }, 2000);
    } catch (err) { 
      setErroGeral(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleResendOtp = async () => {
    if(!activationEmail) { setErroGeral("Informe o E-mail para podermos reenviar o código."); return; }
    
    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");
    
    try {
      const res = await fetch(`${API_BASE}/resend-otp`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email: activationEmail }) 
      });
      
      if (!res.ok) throw new Error(await tratarErroBackend(res));
      
      setSucessoMsg("Um novo código foi enviado para o seu e-mail.");
      setTimeout(() => setSucessoMsg(""), 4000);
    } catch (err) { 
      setErroGeral(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleTrocarSenhaProvisoria = async () => {
    const temSeisCaracteres = novaSenha.length >= 6;
    const senhasBatem = novaSenha.length > 0 && novaSenha === confirmarNovaSenha;
    if (loading || !temSeisCaracteres || !senhasBatem) return;
    
    setLoading(true); 
    setErroGeral(""); 
    setSucessoMsg("");

    try {
      const payload = { 
        login: tempAuthData?.loginUtilizado || tempAuthData?.login, 
        novaSenha: novaSenha 
      };
      
      const res = await fetch(`${API_BASE}/change-temp-password`, { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${tempAuthData.token}` 
        }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) throw new Error(await tratarErroBackend(res));
      
      setSucessoMsg("Palavra-passe atualizada! A finalizar o login...");
      
      setTimeout(async () => {
        const dadosCompletos = await complementarDadosUnidade(tempAuthData);
        processarDadosUnidade(dadosCompletos);
      }, 1500);

    } catch (err) { 
      setErroGeral(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSwitch = (isLoginMode) => {
    setIsActivationView(false); 
    setIsTrocaSenhaView(false); 
    setOtpCode(""); 
    setNovaSenha(""); 
    setConfirmarNovaSenha("");
    
    if (window.innerWidth > 768) {
      const cover = document.querySelector(".black-cover");
      if(cover) {
         cover.classList.remove("anim-go-left", "anim-go-right");
         if (isLoginMode) { 
           cover.classList.add("anim-go-right"); 
           cover.style.clipPath = "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)"; 
         } else { 
           cover.classList.add("anim-go-left"); 
           cover.style.clipPath = "polygon(0 0, 85% 0, 100% 100%, 0% 100%)"; 
         }
      }
    }
    setTimeout(() => { 
      setIsLogin(isLoginMode); 
      setErroGeral(""); 
      setSucessoMsg(""); 
      setRegStep(1); 
    }, window.innerWidth > 768 ? 300 : 100);
  };

  const buscarCNPJ = async (inputValue) => {
    const docLimpo = limparFormatacao(inputValue);
    if (docLimpo.length !== 14) { 
      setErroGeral("Para buscar, digite um CNPJ completo (14 dígitos)."); 
      return; 
    }
    
    setLoadingCnpj(true); 
    setErroGeral(""); 
    setSucessoMsg("");
    
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docLimpo}`);
      if (!res.ok) throw new Error("CNPJ não localizado na Receita Federal.");
      const data = await res.json();
      
      setStep1Value("razaoSocial", data.razao_social || "", { shouldValidate: true });
      setStep1Value("nomeFantasia", data.nome_fantasia || data.razao_social || "", { shouldValidate: true });
      if(data.ddd_telefone_1) setStep1Value("telefoneEmpresa", aplicarMascara("telefoneEmpresa", data.ddd_telefone_1), { shouldValidate: true });
      if(data.email) setStep1Value("emailContato", data.email, { shouldValidate: true });
      
      setStep2Value("cep", aplicarMascara("cep", data.cep || ""), { shouldValidate: true });
      setStep2Value("logradouro", data.logradouro || "", { shouldValidate: true });
      setStep2Value("numero", data.numero || "", { shouldValidate: true });
      setStep2Value("bairro", data.bairro || "", { shouldValidate: true });
      setStep2Value("cidade", data.municipio || "", { shouldValidate: true });
      setStep2Value("uf", data.uf || "", { shouldValidate: true });
      
      setSucessoMsg("Dados da empresa importados com sucesso!"); 
      setTimeout(() => setSucessoMsg(""), 4000);
    } catch (err) { 
      setErroGeral(err.message); 
    } finally { 
      setLoadingCnpj(false); 
    }
  };

  const avancarParaPasso2 = async () => { 
    const isValid = await triggerStep1(); 
    if (isValid) { 
      setErroGeral(""); 
      setRegStep(2); 
    } else {
      setErroGeral("Preencha os dados básicos da empresa."); 
    }
  };
  
  const avancarParaPasso3 = async () => { 
    const isValid = await triggerStep2(); 
    if (isValid) { 
      setErroGeral(""); 
      setRegStep(3); 
    } else {
      setErroGeral("Preencha todos os campos do endereço.");
    } 
  };

  const temSeisCaracteres = novaSenha.length >= 6;
  const senhasBatem = novaSenha.length > 0 && novaSenha === confirmarNovaSenha;
  const btnTrocaSenhaDesativado = !temSeisCaracteres || !senhasBatem;

  return (
    <div className="login-fullscreen-wrapper">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="black-cover">
        <div className="black-shape">
          <img src={logoImage} alt="CtrlBase Logo" className="logo-on-cover" />
        </div>
      </div>

      <div className={`form-wrapper left-panel ${isLogin ? "active-content" : "inactive-content"}`}>
        <div className="form-content">
          <div className="mobile-logo-wrapper">
            <img src={logoImage} alt="Logo" className="mobile-logo-form" />
          </div>
          
          {isActivationView ? (
            <div className="flex flex-col w-full animate-[fadeIn_0.5s_ease-out]">
              <h2 className="title-red">Ativar Acesso</h2>
              <p className="subtitle !mb-8">Um código foi encaminhado para ({activationEmail}). Insira-o abaixo para liberar o seu acesso.</p>
              
              {erroGeral && <div className="feedback-box error-box"><AlertCircle size={18} /> {erroGeral}</div>}
              {sucessoMsg && <div className="feedback-box success-box"><CheckCircle size={18} /> {sucessoMsg}</div>}

              <div className="form-grid mb-6">
                <div className="floating-group">
                  <input 
                    id="activationEmailLogin" 
                    type="email" 
                    className="floating-input" 
                    placeholder=" " 
                    value={activationEmail} 
                    onChange={(e) => setActivationEmail(e.target.value)} 
                    onFocus={() => setEmailFocused(true)} 
                    onBlur={() => setEmailFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                  />
                  <label htmlFor="activationEmailLogin" className={`floating-label ${activationEmail || emailFocused ? 'active' : ''}`}>E-mail registado</label>
                </div>
                
                <div className="floating-group">
                  <input 
                    id="otpCodeLogin" 
                    type="text" 
                    className="floating-input" 
                    placeholder=" " 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    onFocus={() => setOtpFocused(true)} 
                    onBlur={() => setOtpFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                    autoComplete="one-time-code" 
                  />
                  <label htmlFor="otpCodeLogin" className={`floating-label ${otpCode || otpFocused ? 'active' : ''}`}>Código (6 dígitos)</label>
                </div>
              </div>
              
              <button onClick={handleAtivarConta} disabled={loading || !!sucessoMsg} className="btn-red w-full mt-2">
                {loading ? "A processar..." : "Confirmar"}
              </button>
              
              <div className="mt-5 text-center flex flex-col gap-2">
                <button type="button" onClick={handleResendOtp} disabled={loading} className="text-xs font-semibold text-gray-400 hover:text-red-700 transition-colors outline-none">
                  Não recebeu o código? Reenviar
                </button>
                <button type="button" onClick={() => setIsActivationView(false)} disabled={loading} className="text-sm font-semibold text-gray-400 hover:text-red-700 transition-colors mt-2 outline-none">
                  Voltar
                </button>
              </div>
            </div>
          ) : isTrocaSenhaView ? (
            <div className="flex flex-col w-full animate-[fadeIn_0.5s_ease-out]">
              <h2 className="title-red">Primeiro Acesso</h2>
              <p className="subtitle !mb-4">Por segurança, crie a sua palavra-passe definitiva antes de continuar.</p>
              
              {erroGeral && <div className="feedback-box error-box"><AlertCircle size={18} /> {erroGeral}</div>}
              {sucessoMsg && <div className="feedback-box success-box"><CheckCircle size={18} /> {sucessoMsg}</div>}

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Requisitos de Segurança:</span>
                 <div className="flex flex-col gap-2">
                    <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${temSeisCaracteres ? "text-green-600" : "text-gray-400"}`}>
                       {temSeisCaracteres ? <ShieldCheck size={16} /> : <XCircle size={16} />}
                       <span>Mínimo de 6 dígitos inseridos</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${senhasBatem ? "text-green-600" : "text-gray-400"}`}>
                       {senhasBatem ? <ShieldCheck size={16} /> : <XCircle size={16} />}
                       <span>As palavras-passe coincidem</span>
                    </div>
                 </div>
              </div>

              <div className="form-grid mb-6">
                <div className="floating-group">
                  <input 
                    id="novaSenha" 
                    type={showNovaSenha ? "text" : "password"} 
                    className="floating-input" 
                    placeholder=" " 
                    value={novaSenha} 
                    onChange={(e) => setNovaSenha(e.target.value)} 
                    onFocus={() => setSenhaFocused(true)} 
                    onBlur={() => setSenhaFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                  />
                  <label htmlFor="novaSenha" className={`floating-label ${novaSenha || senhaFocused ? 'active' : ''}`}>Nova Palavra-passe *</label>
                  <button type="button" className="action-btn-inside" onClick={() => setShowNovaSenha(!showNovaSenha)}>
                    {showNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="floating-group mt-2">
                  <input 
                    id="confirmarNovaSenha" 
                    type={showConfirmNovaSenha ? "text" : "password"} 
                    className="floating-input" 
                    placeholder=" " 
                    value={confirmarNovaSenha} 
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)} 
                    onFocus={() => setConfirmFocused(true)} 
                    onBlur={() => setConfirmFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                  />
                  <label htmlFor="confirmarNovaSenha" className={`floating-label ${confirmarNovaSenha || confirmFocused ? 'active' : ''}`}>Confirmar Nova Palavra-passe *</label>
                  <button type="button" className="action-btn-inside" onClick={() => setShowConfirmNovaSenha(!showConfirmNovaSenha)}>
                    {showConfirmNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button onClick={handleTrocarSenhaProvisoria} disabled={loading || !!sucessoMsg || btnTrocaSenhaDesativado} className="btn-red w-full mt-2 flex items-center justify-center gap-2">
                <Lock size={18} /> {loading ? "A Guardar..." : "Guardar e Entrar"}
              </button>

              <div className="mt-5 text-center flex flex-col gap-2">
                <button type="button" onClick={() => { setIsTrocaSenhaView(false); setTempAuthData(null); }} disabled={loading} className="text-sm font-semibold text-gray-400 hover:text-red-700 transition-colors mt-2 outline-none">
                  Cancelar e Voltar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="title-red">Conecte-se</h2>
              <p className="subtitle">Assuma o controlo. Eleve o seu padrão.</p>
              
              {erroGeral && <div className="feedback-box error-box"><AlertCircle size={18} /> {erroGeral}</div>}
              {sucessoMsg && <div className="feedback-box success-box"><CheckCircle size={18} /> {sucessoMsg}</div>}
              
              <form onSubmit={handleSubmitLogin(onSubmitLogin, onErrorSubmit)} className="form-grid">
                <CustomInput name="login" control={controlLogin} label="Login (Utilizador ou E-mail)" required />
                <CustomInput name="senha" control={controlLogin} label="Palavra-passe" isPassword showPassState={showLoginPass} setShowPassState={setShowLoginPass} required />
                
                <div className="forgot-wrapper">
                  <span className="forgot-link" onClick={() => window.dispatchEvent(new CustomEvent('modal:esqueci'))}>
                    Esqueci-me da palavra-passe
                  </span>
                </div>
                
                <button type="submit" className="btn-red" disabled={loading}>
                  {loading ? "A Aceder..." : "Entrar"}
                </button>
              </form>
              <p className="switch-text">
                A sua empresa é nova por aqui? <span onClick={() => handleSwitch(false)}>Registar</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className={`form-wrapper right-panel ${!isLogin ? "active-content" : "inactive-content"}`}>
        <div className="form-content scrollable">
          <div className="mobile-logo-wrapper">
            <img src={logoImage} alt="Logo" className="mobile-logo-form" />
          </div>
          
          {isActivationView ? (
            <div className="flex flex-col w-full animate-[fadeIn_0.5s_ease-out]">
              <h2 className="title-red">Ativar Conta</h2>
              <p className="subtitle !mb-8">Um código foi encaminhado para ({activationEmail}). Insira-o abaixo para concluir o seu registo.</p>
              
              {erroGeral && <div className="feedback-box error-box"><AlertCircle size={18} /> {erroGeral}</div>}
              {sucessoMsg && <div className="feedback-box success-box"><CheckCircle size={18} /> {sucessoMsg}</div>}

              <div className="form-grid mb-6">
                <div className="floating-group">
                  <input 
                    id="activationEmailReg" 
                    type="email" 
                    className="floating-input" 
                    placeholder=" " 
                    value={activationEmail} 
                    onChange={(e) => setActivationEmail(e.target.value)} 
                    onFocus={() => setEmailFocused(true)} 
                    onBlur={() => setEmailFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                  />
                  <label htmlFor="activationEmailReg" className={`floating-label ${activationEmail || emailFocused ? 'active' : ''}`}>E-mail registado</label>
                </div>
                <div className="floating-group">
                  <input 
                    id="otpCodeReg" 
                    type="text" 
                    className="floating-input" 
                    placeholder=" " 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    onFocus={() => setOtpFocused(true)} 
                    onBlur={() => setOtpFocused(false)} 
                    disabled={loading || !!sucessoMsg} 
                    autoComplete="one-time-code" 
                  />
                  <label htmlFor="otpCodeReg" className={`floating-label ${otpCode || otpFocused ? 'active' : ''}`}>Código (6 dígitos)</label>
                </div>
              </div>
              
              <button onClick={handleAtivarConta} disabled={loading || !!sucessoMsg} className="btn-red w-full mt-2">
                {loading ? "A processar..." : "Confirmar"}
              </button>
              
              <div className="mt-5 text-center flex flex-col gap-2">
                <button type="button" onClick={handleResendOtp} disabled={loading} className="text-xs font-semibold text-gray-400 hover:text-red-700 transition-colors outline-none">
                  Não recebeu o código? Reenviar
                </button>
                <button type="button" onClick={() => setIsActivationView(false)} disabled={loading} className="text-sm font-semibold text-gray-400 hover:text-red-700 transition-colors mt-2 outline-none">
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="title-red">{regStep === 1 ? "A Empresa" : regStep === 2 ? "Localização" : "O Responsável"}</h2>
              <p className="subtitle">{regStep === 1 && "Passo 1: Dados do negócio"}{regStep === 2 && "Passo 2: Endereço"}{regStep === 3 && "Passo 3: Titular"}</p>
              
              <div className="stepper">
                <div className={`step-dot ${regStep >= 1 ? "active" : ""}`}></div>
                <div className={`step-dot ${regStep >= 2 ? "active" : ""}`}></div>
                <div className={`step-dot ${regStep >= 3 ? "active" : ""}`}></div>
              </div>

              {erroGeral && <div className="feedback-box error-box"><AlertCircle size={18} /> {erroGeral}</div>}
              {sucessoMsg && <div className="feedback-box success-box"><CheckCircle size={18} /> {sucessoMsg}</div>}

              <div className={regStep === 1 ? 'block' : 'hidden'}>
                 <div className="form-grid">
                  <CustomInput name="documentoNumero" control={controlStep1} label="Documento (CPF ou CNPJ)" mask onSearch={buscarCNPJ} showSearchBtn required loadingCnpj={loadingCnpj} />
                  <CustomInput name="razaoSocial" control={controlStep1} label="Razão Social / Nome" required />
                  <CustomInput name="nomeFantasia" control={controlStep1} label="Nome Fantasia" required />
                  <CustomInput name="emailContato" control={controlStep1} label="E-mail Comercial" type="email" required />
                  <CustomInput name="telefoneEmpresa" control={controlStep1} label="Telefone" mask required />
                  <button type="button" onClick={avancarParaPasso2} className="btn-red">Próximo</button>
                </div>
              </div>

              <div className={regStep === 2 ? 'block' : 'hidden'}>
                <div className="form-grid">
                  <div style={{ display: "flex", gap: "15px", width: "100%" }}>
                    <CustomInput name="cep" control={controlStep2} label="CEP" mask required />
                    <CustomInput name="uf" control={controlStep2} label="UF" required />
                  </div>
                  <CustomInput name="logradouro" control={controlStep2} label="Logradouro" required />
                  <div style={{ display: "flex", gap: "15px", width: "100%" }}>
                    <CustomInput name="numero" control={controlStep2} label="Número" required />
                    <CustomInput name="bairro" control={controlStep2} label="Bairro" required />
                  </div>
                  <CustomInput name="cidade" control={controlStep2} label="Cidade" required />
                  <div className="button-row">
                    <button type="button" className="btn-outline" onClick={() => { setRegStep(1); setErroGeral(""); }}>
                      <ArrowLeft size={18}/> Voltar
                    </button>
                    <button type="button" className="btn-red" onClick={avancarParaPasso3}>
                      Próximo
                    </button>
                  </div>
                </div>
              </div>

              <div className={regStep === 3 ? 'block' : 'hidden'}>
                <div className="type-selector">
                   <button type="button" className={`type-btn ${isNovoTitular ? 'active' : ''}`} onClick={() => { setIsNovoTitular(true); setErroGeral(""); }}>
                      <UserPlus size={16}/> Novo Registo
                   </button>
                   <button type="button" className={`type-btn ${!isNovoTitular ? 'active' : ''}`} onClick={() => { setIsNovoTitular(false); setErroGeral(""); }}>
                      <UserCheck size={16}/> Já tenho conta
                   </button>
                </div>

                <form onSubmit={onSubmitStep3Form} className="form-grid">
                  <div style={{ display: isNovoTitular ? 'block' : 'none' }}>
                    <div className="form-grid">
                      <CustomInput name="nomeCompleto" control={controlSocio} label="Nome Completo" required={isNovoTitular} />
                      <div className="floating-group">
                        <Controller 
                          name="sexoBiologico" 
                          control={controlSocio} 
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <select id="sexoBiologico" name="sexoBiologico" value={value || ""} onChange={onChange} className={`floating-input ${error ? "error" : ""}`} style={{ appearance: "none" }}>
                                <option value="" disabled hidden></option>
                                <option value="MASCULINO">Masculino</option>
                                <option value="FEMININO">Feminino</option>
                              </select>
                              <label htmlFor="sexoBiologico" className="floating-label active">Género *</label>
                              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                            </>
                          )}
                        />
                      </div>
                      <CustomInputData name="dataNascimento" control={controlSocio} label="Data de Nascimento" required={isNovoTitular} />
                      <CustomInput name="emailSocio" control={controlSocio} label="E-mail Pessoal" type="email" required={isNovoTitular} />
                      <CustomInput name="telefoneSocio" control={controlSocio} label="Telemóvel Pessoal" mask required={isNovoTitular} />
                    </div>
                  </div>

                  <CustomInput name="cpf" control={controlSocio} label="CPF do Titular" mask required />
                  <CustomInput name="senhaSocio" control={controlSocio} label="Palavra-passe de Acesso" isPassword showPassState={showSocioPass} setShowPassState={setShowSocioPass} required />
                  
                  <div style={{ display: isNovoTitular ? 'block' : 'none', marginTop: '24px' }}>
                     <CustomInput name="confirmarSenha" control={controlSocio} label="Confirmar Palavra-passe" isPassword showPassState={showConfirmPass} setShowPassState={setShowConfirmPass} required={isNovoTitular} />
                  </div>

                  {!isNovoTitular && (
                    <div className="text-xs text-gray-500 text-center mt-2 px-4">
                      Introduza o seu CPF e Palavra-passe atuais para vincular esta nova empresa ao seu painel.
                    </div>
                  )}

                  <div className="button-row" style={{marginTop: "20px"}}>
                    <button type="button" className="btn-outline" onClick={() => setRegStep(2)}>
                      <ArrowLeft size={18}/> Voltar
                    </button>
                    <button type="submit" className="btn-red" disabled={loading}>
                       {loading ? "A processar..." : isNovoTitular ? "Finalizar Registo" : "Vincular Empresa"}
                    </button>
                  </div>
                </form>
              </div>

              {regStep === 1 && ( 
                <p className="switch-text">
                  Já possui acesso? <span onClick={() => handleSwitch(true)}>Entrar</span>
                </p> 
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}