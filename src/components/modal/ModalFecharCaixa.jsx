import React, { useState, useRef, useEffect, useMemo } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import apiFetch from "../../services/api";

const parseValorSeguro = (str) => {
  if (!str || typeof str !== "string" || str.trim() === "") return 0;
  const num = parseFloat(str.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? 0 : num;
};

const formatarMoedaInput = (valorRaw) => {
  const limpo = valorRaw.replace(/\D/g, "");
  if (!limpo) return "";
  let formatado = (parseInt(limpo, 10) / 100).toFixed(2);
  return formatado.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function ModalFecharCaixa({
  isOpen,
  onClose,
  aoFechar,
  loadingExterno,
  setLoadingExterno,
  idCaixaAberto,
}) {
  const { isDarkMode } = useTheme();
  const [valores, setValores] = useState({ dinheiro: "", pix: "", credito: "", debito: "", crediario: "" });
  const [loading, setLoading] = useState(false);
  const [erroApi, setErroApi] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [fechando, setFechando] = useState(false);
  const modalRef = useRef(null);

  const usuario = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || {};
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setVisivel(true);
      setFechando(false);
      setValores({ dinheiro: "", pix: "", credito: "", debito: "", crediario: "" });
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

  const handleValorChange = (campo, valorRaw) => {
    setValores((prev) => ({ ...prev, [campo]: formatarMoedaInput(valorRaw) }));
    setErroApi(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idCaixaAberto) {
      setErroApi("Erro interno: ID do caixa não foi identificado. Atualize a página.");
      return;
    }

    setLoading(true);
    setErroApi(null);
    if (setLoadingExterno) setLoadingExterno(true);

    const numDinheiro = parseValorSeguro(valores.dinheiro);
    const numPix = parseValorSeguro(valores.pix);
    const numCredito = parseValorSeguro(valores.credito);
    const numDebito = parseValorSeguro(valores.debito);
    const numCrediario = parseValorSeguro(valores.crediario);

    if (numDinheiro < 0 || numPix < 0 || numCredito < 0 || numDebito < 0 || numCrediario < 0) {
      setErroApi("Os valores não podem ser negativos.");
      setLoading(false);
      if (setLoadingExterno) setLoadingExterno(false);
      return;
    }

    try {
      const idFuncionario = Number(usuario.id || usuario.idFuncionario || 1);

      const payload = {
        idFuncionario,
        dinheiro: numDinheiro,
        transferencia: numPix,
        debito: numDebito,
        credito: numCredito,
        crediario: numCrediario,
        observacao: "Fechamento via sistema (Automático)",
      };

      const response = await apiFetch(`/caixas/fechar/${idCaixaAberto}`, {
        method: "POST",
        headers: {
          "id-solicitante": String(idFuncionario),
          "id-operador": String(idFuncionario),
        },
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
        if (response.status === 403) throw new Error("Sessão expirada ou sem permissão.");
        throw new Error(responseData.message || responseData.error || "Erro ao fechar o caixa no servidor.");
      }

      if (aoFechar) aoFechar(responseData);
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
  const totalCalculado =
    parseValorSeguro(valores.dinheiro) +
    parseValorSeguro(valores.pix) +
    parseValorSeguro(valores.credito) +
    parseValorSeguro(valores.debito) +
    parseValorSeguro(valores.crediario);

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
          className={`relative w-full max-w-[480px] ${corFundo} text-white rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${visivel && !fechando ? "scale-100 translate-y-0" : "scale-98 translate-y-4"}`}
        >
          <div className="p-8">
            <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-6">
              <div className="p-2 bg-white/20 rounded-full">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Fechar Caixa</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-1">Conferência de Valores</p>
              </div>
            </div>

            {erroApi && (
              <div className="mb-5 p-3 rounded-lg flex items-center gap-2.5 bg-black/20 border border-white/20 text-white animate-in fade-in">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="text-xs font-medium">{erroApi}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <InputMoeda label="Dinheiro (Gaveta)" valor={valores.dinheiro} onChange={(v) => handleValorChange("dinheiro", v)} />
                <InputMoeda label="PIX (Conta)" valor={valores.pix} onChange={(v) => handleValorChange("pix", v)} />
                <InputMoeda label="Cartão de Crédito" valor={valores.credito} onChange={(v) => handleValorChange("credito", v)} />
                <InputMoeda label="Cartão de Débito" valor={valores.debito} onChange={(v) => handleValorChange("debito", v)} />
                <InputMoeda label="Crediário" valor={valores.crediario} onChange={(v) => handleValorChange("crediario", v)} />
              </div>

              <div className="flex justify-between items-center bg-black/10 p-4 rounded-xl border border-white/10 mt-2">
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Total Conferido</span>
                <span className="text-lg font-black tracking-tight">
                  R$ {totalCalculado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={currentLoading}
                  className="flex-1 py-4 bg-transparent text-white border border-white/30 hover:bg-white/10 font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 outline-none"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={currentLoading}
                  className="flex-1 py-4 bg-white text-black hover:opacity-90 font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 outline-none shadow-xl"
                >
                  {currentLoading ? <Loader2 size={16} className="animate-spin" /> : "Encerrar Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function InputMoeda({ label, valor, onChange }) {
  const [focado, setFocado] = useState(false);
  
  return (
    <div className="relative w-full border-b border-white/30 focus-within:border-white transition-all py-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1">{label}</label>
      <div className="flex items-center">
        {(focado || valor) && <span className="text-sm font-bold text-white/60 mr-1">R$</span>}
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          className="w-full bg-transparent outline-none text-base font-bold text-white placeholder-white/30"
          placeholder={!focado ? "0,00" : ""}
        />
      </div>
    </div>
  );
}