import React, { useState, useEffect, useMemo } from "react";
import logoImage from "../../assets/icons/logobase.png"; 

export default function ReportTemplate({ titulo, children }) {
  const [unidade, setUnidade] = useState({});
  const dataAtual = new Date().toLocaleString("pt-BR");

  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  useEffect(() => {
    const fetchUnidade = async () => {
      try {
        const id = usuarioLogado.unidadeId || usuarioLogado.idUnidade || 1;
        const res = await fetch(`/api/unidades/${id}`, {
          headers: { "Authorization": `Bearer ${usuarioLogado.token}` }
        });
        if (res.ok) setUnidade(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchUnidade();
  }, [usuarioLogado]);

  return (
    <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black print:z-[9999] print:w-full">
      
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex flex-col font-sans w-full bg-white text-black box-border">
        
        <header className="flex justify-between items-center pb-4 mb-6 border-b-2 border-black">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black uppercase m-0 leading-none mb-1 text-black">
                {unidade.nomeFantasia || "NOME DA EMPRESA"}
              </h1>
              <p className="text-[10px] m-0 uppercase leading-tight font-bold text-black">CNPJ: {unidade.documentoNumero || "00.000.000/0001-00"}</p>
              <p className="text-[10px] m-0 uppercase leading-tight text-black">
                {unidade.logradouro}, {unidade.numero} {unidade.bairro ? `- ${unidade.bairro}` : ""}
              </p>
              <p className="text-[10px] m-0 uppercase leading-tight text-black">
                {unidade.cidade} - {unidade.uf} | TEL: {unidade.telefone || "(00) 0000-0000"}
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col justify-start uppercase text-black">
            <p className="text-[10px] font-bold m-0">Usuário: <span className="font-normal">{usuarioLogado.nomeCompleto || usuarioLogado.login}</span></p>
            <p className="text-[10px] font-bold m-0 mt-1">Emitido: <span className="font-normal">{dataAtual}</span></p>
          </div>
        </header>

        {titulo && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black">{titulo}</h2>
          </div>
        )}

        <main className="w-full text-sm text-black">
          {children}
        </main>

        <footer className="pt-4 mt-10 flex justify-between items-center text-[9px] font-bold uppercase border-t-2 border-black text-gray-700">
          <span>Sistema CtrlBase - Eleve o seu padrão</span>
          <span>Documento Gerado Eletronicamente</span>
        </footer>
      </div>
      
    </div>
  );
}