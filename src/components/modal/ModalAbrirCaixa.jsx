import React, { useState, useRef, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import apiFetch from "../../services/api";

const formatarMoedaInput = (valorRaw) => {
  const limpo = valorRaw.replace(/\D/g, "");
  if (!limpo) return "";
  let formatado = (parseInt(limpo, 10) / 100).toFixed(2);
  formatado = formatado.replace(".", ",");
  return formatado.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function ModalAbrirCaixa({ isOpen, onClose, aoAbrir, loadingExterno, setLoadingExterno }) {
  const { isDarkMode } = useTheme();
  const [saldo, setSaldo] = useState("");
  const [isSaldoFocado, setIsSaldoFocado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erroApi, setErroApi] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [fechando, setFechando] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisivel(true);
      setFechando(false);
      setSaldo("");
      setErroApi(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fecharModal = () => {
    setFechando(true);
    setTimeout(() => {
      setVisivel(false);
      onClose();
    }, 300);
  };

  const handleSaldoChange = (e) => {
    setSaldo(formatarMoedaInput(e.target.value));
    setErroApi(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErroApi(null);
    if (setLoadingExterno) setLoadingExterno(true);

    const valorNumerico = parseFloat(saldo.replace(/\./g, "").replace(",", ".") || 0);

    if (valorNumerico < 0) {
      setErroApi("O saldo inicial não pode ser negativo.");
      setLoading(false);
      if (setLoadingExterno) setLoadingExterno(false);
      return;
    }

    try {
      const u = JSON.parse(localStorage.getItem("usuario") || "{}");
      const payload = {
        idFuncionario: u.id || u.idFuncionario,
        saldoInicial: valorNumerico,
        observacoes: "Abertura via sistema (Automática)",
      };

      const response = await apiFetch("/caixas/abrir", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { message: text || response.statusText };
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Erro ao abrir o caixa.");
      }

      if (aoAbrir) aoAbrir(responseData);
      fecharModal();
    } catch (error) {
      setErroApi(error.message || "Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
      if (setLoadingExterno) setLoadingExterno(false);
    }
  };

  const currentLoading = loading || loadingExterno;
  const corFundo = isDarkMode ? "bg-[#B22222]" : "bg-[#FF4500]";

  return (
    <>
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px transparent inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div
        className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 transition-opacity duration-300 ${visivel && !fechando ? "opacity-100" : "opacity-0"}`}
        onMouseDown={!currentLoading ? fecharModal : undefined}
      >
        <div
          ref={modalRef}
          onMouseDown={(e) => e.stopPropagation()}
          className={`relative w-full max-w-[420px] ${corFundo} text-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${visivel && !fechando ? "scale-100 translate-y-0" : "scale-98 translate-y-4"}`}
        >
          <div className="p-8">
            <div className="flex flex-col mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Abrir caixa
              </h2>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                Informe o valor do saldo inicial (troco) para iniciar suas vendas
              </p>
            </div>

            {erroApi && (
              <div className="mb-5 p-3 rounded-lg flex items-center gap-2.5 bg-black/20 border border-white/20 text-white animate-in fade-in">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="text-xs font-medium">{erroApi}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="relative w-full border-b border-white/30 focus-within:border-white transition-all py-1">
                <label className="text-xs font-medium text-white/70 block mb-1">
                  Valor (R$)
                </label>
                <div className="flex items-center">
                  {(isSaldoFocado || saldo) && (
                    <span className="text-base font-medium text-white/70 mr-1 animate-in fade-in duration-150">
                      R$
                    </span>
                  )}
                  <input
                    type="text"
                    value={saldo}
                    onChange={handleSaldoChange}
                    onFocus={() => setIsSaldoFocado(true)}
                    onBlur={() => setIsSaldoFocado(false)}
                    className="w-full bg-transparent outline-none text-lg font-medium text-white placeholder-white/40"
                    placeholder={!isSaldoFocado ? "0,00" : ""}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={currentLoading}
                  className="px-8 py-3 bg-transparent text-white/80 hover:text-white font-semibold text-base rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 outline-none"
                >
                  Descartar
                </button>

                <button
                  type="submit"
                  disabled={currentLoading || !saldo}
                  className="px-8 py-3 bg-transparent text-white font-semibold text-base rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-2 outline-none"
                >
                  {currentLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Registrando...</>
                  ) : (
                    "Registrar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}