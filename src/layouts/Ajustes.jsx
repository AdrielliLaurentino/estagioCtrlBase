import React, { useState, useEffect } from "react";
import { Save, Building2, Upload, AlertCircle, CheckCircle, Loader2, CreditCard, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 

const API_BASE = "/api";

const settingsSchema = yup.object({
  razaoSocial: yup.string().required("Razão Social é obrigatória"),
  nomeFantasia: yup.string().required("Nome Fantasia é obrigatório"),
  emailContato: yup.string().email("E-mail inválido").required("E-mail é obrigatório"),
  telefoneEmpresa: yup.string().required("Telefone é obrigatório")
});

const aplicarMascaraTel = (valor) => {
  if (!valor) return "";
  let v = valor.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  return v.slice(0, 15);
};

export default function Ajustes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState("");
  const [erroMsg, setErroMsg] = useState("");

  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm({
    resolver: yupResolver(settingsSchema),
    mode: "onBlur"
  });

  const telefoneWatcher = watch("telefoneEmpresa");

  useEffect(() => {
    const fetchUnidade = async () => {
      if (!user?.token) return;
      
      setLoading(true);
      try {
        const idUnidade = user?.unidadeId || user?.idUnidade || 1;
        const res = await fetch(`${API_BASE}/unidades/${idUnidade}`, {
          headers: { 
            "Authorization": `Bearer ${user.token}`,
            "id-operador": String(user?.id || 1)
          }
        });
        
        if (res.ok) {
          const dados = await res.json();
          setValue("razaoSocial", dados.razaoSocial || "");
          setValue("nomeFantasia", dados.nomeFantasia || "");
          setValue("emailContato", dados.emailContato || "");
          setValue("telefoneEmpresa", dados.telefone ? aplicarMascaraTel(dados.telefone) : "");
        }
      } catch (err) {
        console.error("Erro ao carregar ajustes", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUnidade();
  }, [user, setValue]);

  const onSubmit = async (data) => {
    if (!user?.token) return;

    setLoading(true);
    setErroMsg("");
    setSucessoMsg("");

    try {
      const idUnidade = user?.unidadeId || user?.idUnidade || 1;
      const payload = {
        ...data,
        telefone: data.telefoneEmpresa.replace(/\D/g, "")
      };

      const res = await fetch(`${API_BASE}/unidades/${idUnidade}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`,
          "id-operador": String(user?.id || 1)
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Não foi possível salvar as configurações.");
      
      setSucessoMsg("Configurações atualizadas com sucesso!");
      setTimeout(() => setSucessoMsg(""), 4000);
      
    } catch (err) {
      setErroMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-6 lg:p-10 flex flex-col gap-8 bg-gray-50 font-sans animate-in fade-in duration-500 overflow-y-auto custom-slim-scroll">
      
      <header className="flex items-center gap-4 shrink-0 max-w-4xl">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-900 text-white shadow-sm">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Ajustes Gerais
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Configurações da Unidade Filial
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8 max-w-4xl pb-10">
        
        {/* BLOCO DE FORMULÁRIO */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          
          {erroMsg && (
            <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-red-50 text-red-700 border border-red-100">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{erroMsg}</p>
            </div>
          )}
          {sucessoMsg && (
            <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-green-50 text-green-700 border border-green-100">
              <CheckCircle size={18} />
              <p className="text-sm font-medium">{sucessoMsg}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-10">
            
            <div className="flex flex-col items-center gap-4 w-full md:w-56 shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider self-start">Identidade Visual</span>
              <div className="w-40 h-40 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-gray-900 hover:bg-gray-50 group">
                 <Upload size={28} className="mb-2 text-gray-400 group-hover:text-gray-900 group-hover:scale-110 transition-all" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-900 text-center px-4 transition-colors">Upload (Em Breve)</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-5">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Razão Social</label>
                <input 
                  type="text" {...register("razaoSocial")} 
                  className={`w-full py-3 px-4 rounded-lg border bg-gray-50 outline-none transition-colors focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${errors.razaoSocial ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.razaoSocial && <span className="text-xs font-medium text-red-500">{errors.razaoSocial.message}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Nome Fantasia</label>
                <input 
                  type="text" {...register("nomeFantasia")} 
                  className={`w-full py-3 px-4 rounded-lg border bg-gray-50 outline-none transition-colors focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${errors.nomeFantasia ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.nomeFantasia && <span className="text-xs font-medium text-red-500">{errors.nomeFantasia.message}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">E-mail Comercial</label>
                  <input 
                    type="email" {...register("emailContato")} 
                    className={`w-full py-3 px-4 rounded-lg border bg-gray-50 outline-none transition-colors focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${errors.emailContato ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.emailContato && <span className="text-xs font-medium text-red-500">{errors.emailContato.message}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Telefone de Contato</label>
                  <input 
                    type="text" {...register("telefoneEmpresa")} 
                    onChange={(e) => setValue("telefoneEmpresa", aplicarMascaraTel(e.target.value))}
                    value={telefoneWatcher || ""}
                    className={`w-full py-3 px-4 rounded-lg border bg-gray-50 outline-none transition-colors focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${errors.telefoneEmpresa ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.telefoneEmpresa && <span className="text-xs font-medium text-red-500">{errors.telefoneEmpresa.message}</span>}
                </div>
              </div>

            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-gray-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-70 transition-all outline-none"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-2">Módulos Adicionais</h3>
          
          <button
            onClick={() => navigate('/admin/integracoes')}
            className="w-full flex items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl hover:border-gray-900 hover:shadow-md transition-all outline-none group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                <CreditCard size={22} className="text-gray-700 group-hover:text-gray-900" />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900 block">Integrações de Pagamento</span>
                <span className="text-sm font-medium text-gray-500 mt-0.5 block">Conecte e configure maquininhas físicas no sistema</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
          </button>
        </div>

      </main>
    </div>
  );
}