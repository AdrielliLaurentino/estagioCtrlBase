import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { 
  Building2, MapPin, Phone, Search, Save, ArrowLeft, 
  AlertCircle, CheckCircle, Clock, Copy, CalendarDays, Loader2 
} from "lucide-react";
import { apiFetch } from "../../services/api"; 

const limparFormatacao = (valor) => valor ? String(valor).replace(/\D/g, "") : "";

const aplicarMascara = (tipo, valor) => {
  if (!valor) return "";
  let v = limparFormatacao(valor);
  if (tipo === "documento") {
    if (v.length <= 11) return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);
    else return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
  }
  if (tipo === "telefone") return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
  if (tipo === "cep") return v.replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
  return valor;
};

const unidadeSchema = yup.object({
  documentoNumero: yup.string().required("Obrigatório").test("cpf-cnpj", "Inválido", val => { 
    const clean = limparFormatacao(val); 
    return clean.length === 11 || clean.length === 14; 
  }),
  razaoSocial: yup.string().required("Obrigatório"),
  nomeFantasia: yup.string().required("Obrigatório"),
  telefone: yup.string().required("Obrigatório"),
  emailContato: yup.string().email("Inválido").required("Obrigatório"),
  cep: yup.string().required("Obrigatório").min(9, "Incompleto"),
  logradouro: yup.string().required("Obrigatório"),
  numero: yup.string().required("Obrigatório"),
  bairro: yup.string().required("Obrigatório"),
  cidade: yup.string().required("Obrigatório"),
  uf: yup.string().required("Obrigatório").length(2, "Sigla"),
  inscricaoEstadual: yup.string().nullable(),
});

const DIAS_CHAVES = [
  { id: "segunda", label: "Segunda-feira" },
  { id: "terca", label: "Terça-feira" },
  { id: "quarta", label: "Quarta-feira" },
  { id: "quinta", label: "Quinta-feira" },
  { id: "sexta", label: "Sexta-feira" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
  { id: "feriados", label: "Feriados" },
];

export default function DadosNegocio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); 
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });

  const { control, handleSubmit, setValue, getValues, watch, reset, formState: { errors } } = useForm({
    resolver: yupResolver(unidadeSchema),
    mode: "onBlur",
    defaultValues: {
      horarios: DIAS_CHAVES.reduce((acc, dia) => ({
        ...acc,
        [dia.id]: { ativo: dia.id !== "domingo" && dia.id !== "feriados", abertura: "06:00", fechamento: "22:00" }
      }), {})
    }
  });

  const documentoWatcher = watch("documentoNumero", "");
  const isCnpj = limparFormatacao(documentoWatcher).length > 11;

  useEffect(() => {
    const carregarDadosDaUnidade = async () => {
      try {
        setInitialLoading(true);
        const response = await apiFetch("/unidades/dados-negocio", { method: "GET" });
        const data = await response.json();

        reset({
          documentoNumero: aplicarMascara("documento", data.documentoNumero) || "",
          razaoSocial: data.razaoSocial || "",
          nomeFantasia: data.nomeFantasia || "",
          inscricaoEstadual: data.inscricaoEstadual || "",
          telefone: aplicarMascara("telefone", data.telefone) || "",
          emailContato: data.emailContato || "",
          cep: aplicarMascara("cep", data.cep) || "",
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          uf: data.uf || "",
          horarios: getValues("horarios") 
        });

      } catch (error) {
        setMensagem({ tipo: "erro", texto: error.message });
      } finally {
        setInitialLoading(false);
      }
    };

    carregarDadosDaUnidade();
  }, [reset]);

  const replicarHorarios = (apenasUteis = false) => {
    const base = getValues("horarios.segunda");
    const diasParaAtualizar = apenasUteis 
      ? ["terca", "quarta", "quinta", "sexta"] 
      : ["terca", "quarta", "quinta", "sexta", "sabado", "domingo", "feriados"];

    diasParaAtualizar.forEach(dia => {
      setValue(`horarios.${dia}.ativo`, base.ativo);
      setValue(`horarios.${dia}.abertura`, base.abertura);
      setValue(`horarios.${dia}.fechamento`, base.fechamento);
    });
    
    setMensagem({ tipo: "sucesso", texto: apenasUteis ? "Horários replicados para dias úteis!" : "Horários replicados!" });
    setTimeout(() => setMensagem({ tipo: "", texto: "" }), 3000);
  };

  const buscarCNPJ = async () => {
    const docLimpo = limparFormatacao(getValues("documentoNumero"));
    if (docLimpo.length !== 14) return;
    
    setLoadingBusca(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docLimpo}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      setValue("razaoSocial", data.razao_social, { shouldValidate: true });
      setValue("nomeFantasia", data.nome_fantasia || data.razao_social, { shouldValidate: true });
      if(data.ddd_telefone_1) setValue("telefone", aplicarMascara("telefone", data.ddd_telefone_1), { shouldValidate: true });
      setValue("cep", aplicarMascara("cep", data.cep), { shouldValidate: true });
      setValue("logradouro", data.descricao_tipo_de_logradouro + " " + data.logradouro, { shouldValidate: true });
      setValue("numero", data.numero, { shouldValidate: true });
      setValue("bairro", data.bairro, { shouldValidate: true });
      setValue("cidade", data.municipio, { shouldValidate: true });
      setValue("uf", data.uf, { shouldValidate: true });
    } catch (err) { 
      setMensagem({ tipo: "erro", texto: "Falha ao buscar CNPJ." }); 
    } finally { 
      setLoadingBusca(false); 
      setTimeout(() => setMensagem({ tipo: "", texto: "" }), 4000); 
    }
  };

  const buscarCEP = async () => {
    const cepLimpo = limparFormatacao(getValues("cep"));
    if (cepLimpo.length !== 8) return;
    
    setLoadingBusca(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("CEP inválido");
      setValue("logradouro", data.logradouro, { shouldValidate: true });
      setValue("bairro", data.bairro, { shouldValidate: true });
      setValue("cidade", data.localidade, { shouldValidate: true });
      setValue("uf", data.uf, { shouldValidate: true });
    } catch (err) { 
      setMensagem({ tipo: "erro", texto: "CEP não encontrado." }); 
    } finally { 
      setLoadingBusca(false); 
      setTimeout(() => setMensagem({ tipo: "", texto: "" }), 4000); 
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    
    const docLimpo = limparFormatacao(data.documentoNumero);
    
    const payload = {
      ...data,
      documentoNumero: docLimpo,
      tipoDocumento: docLimpo.length === 11 ? "CPF" : "CNPJ",
      cep: limparFormatacao(data.cep),
      telefone: limparFormatacao(data.telefone)
    };

    try {
      await apiFetch("/unidades/dados-negocio", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setMensagem({ tipo: "sucesso", texto: "Dados atualizados com sucesso!" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMensagem({ tipo: "erro", texto: error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMensagem({ tipo: "", texto: "" }), 3000);
    }
  };

  const CustomInput = ({ name, label, maskType, icon: Icon, onIconClick, placeholder, disabled }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-[var(--text-main)] opacity-60">{label}</label>
      <div className="relative">
        <Controller
          name={name} 
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <input
              type="text" 
              placeholder={placeholder} 
              disabled={disabled}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-all bg-[var(--bg-body)] text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed ${errors[name] ? 'border-red-500 focus:border-red-600' : 'border-[var(--border-color)] focus:border-[#DC2626]'}`}
              value={value || ""}
              onChange={(e) => onChange(maskType ? aplicarMascara(maskType, e.target.value) : e.target.value)}
              onBlur={(e) => { 
                onBlur(e); 
                if (maskType === "cep" && value?.length >= 9) buscarCEP();
                if (maskType === "documento" && value?.length >= 18) buscarCNPJ();
              }}
            />
          )}
        />
        {Icon && !disabled && (
          <button 
            type="button" 
            onClick={onIconClick} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-main)] opacity-50 hover:opacity-100 hover:text-[#DC2626] transition-colors"
          >
            {loadingBusca ? <Loader2 className="animate-spin" size={18} /> : <Icon size={18} />}
          </button>
        )}
      </div>
      {errors[name] && <span className="text-[10px] font-bold text-red-500 uppercase ml-1 mt-1">{errors[name].message}</span>}
    </div>
  );

  const HorarioRow = ({ label, namePrefix }) => {
    const isAtivo = watch(`${namePrefix}.ativo`);
    return (
      <div className="flex items-center justify-between p-3 px-5 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] transition-all hover:border-[#DC2626]/40">
        <div className="flex items-center gap-4 min-w-[140px]">
          <Controller
            name={`${namePrefix}.ativo`} control={control}
            render={({ field: { value, onChange } }) => (
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" checked={value} onChange={(e) => onChange(e.target.checked)} />
                <div className="w-9 h-5 bg-[var(--border-color)] rounded-full peer peer-checked:after:translate-x-full after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DC2626] after:absolute after:top-[2px] after:left-[2px] after:content-['']"></div>
              </label>
            )}
          />
          <span className={`text-xs font-bold uppercase tracking-wider ${isAtivo ? 'text-[var(--text-main)]' : 'text-[var(--text-main)] opacity-30'}`}>{label}</span>
        </div>

        <div className={`flex items-center gap-3 transition-all ${isAtivo ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          <Controller
            name={`${namePrefix}.abertura`} control={control}
            render={({ field }) => (
              <input type="time" {...field} className="bg-transparent border-b border-[var(--border-color)] p-1 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[#DC2626]" />
            )}
          />
          <span className="text-[var(--text-main)] opacity-30 font-bold text-[10px]">ATÉ</span>
          <Controller
            name={`${namePrefix}.fechamento`} control={control}
            render={({ field }) => (
              <input type="time" {...field} className="bg-transparent border-b border-[var(--border-color)] p-1 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[#DC2626]" />
            )}
          />
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[#DC2626]" size={40} />
        <span className="text-[var(--text-main)] opacity-60 font-bold text-sm uppercase tracking-widest">Carregando informações...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 md:p-10 transition-colors duration-300 rounded-3xl bg-transparent">
      
      <header className="flex items-center justify-between mb-8 w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="text-[var(--text-main)] opacity-50 hover:opacity-100 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-serif font-bold text-[#DC2626] uppercase tracking-wide">DADOS DO NEGÓCIO</h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest ml-9 text-[var(--text-main)] opacity-50">Configuração de Identidade e Operação</p>
        </div>
      </header>

      {mensagem.texto && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${mensagem.tipo === 'erro' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'} animate-in fade-in`}>
          {mensagem.tipo === 'erro' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-sm font-semibold">{mensagem.texto}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 pb-20 w-full">
        
        {/* IDENTIDADE FISCAL */}
        <section className="rounded-3xl p-6 md:p-8 w-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[var(--border-color)]">
            <Building2 className="text-[#DC2626]" size={24} />
            <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Identidade Fiscal</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <CustomInput name="documentoNumero" label="Documento (CNPJ/CPF)" maskType="documento" icon={isCnpj ? Search : null} onIconClick={buscarCNPJ} disabled={true} />
            </div>
            <div className="lg:col-span-2"><CustomInput name="inscricaoEstadual" label="Inscrição Estadual" /></div>
            <div className="lg:col-span-2"><CustomInput name="razaoSocial" label="Razão Social" /></div>
            <div className="lg:col-span-2"><CustomInput name="nomeFantasia" label="Nome Fantasia" /></div>
          </div>
        </section>

        {/* CONTATO E LOCALIZAÇÃO */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
           <section className="rounded-3xl p-6 md:p-8 w-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[var(--border-color)]">
                <Phone className="text-[#DC2626]" size={24} />
                <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Comunicação</h2>
              </div>
              <div className="flex flex-col gap-6">
                <CustomInput name="emailContato" label="E-mail Administrativo" placeholder="contato@empresa.com.br" />
                <CustomInput name="telefone" label="Telefone / WhatsApp" maskType="telefone" />
              </div>
           </section>

           <section className="rounded-3xl p-6 md:p-8 w-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[var(--border-color)]">
                <MapPin className="text-[#DC2626]" size={24} />
                <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Localização</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><CustomInput name="cep" label="CEP" maskType="cep" icon={Search} onIconClick={buscarCEP} /></div>
                <div className="col-span-2"><CustomInput name="logradouro" label="Rua / Logradouro" /></div>
                <CustomInput name="numero" label="Número" />
                <CustomInput name="bairro" label="Bairro" />
              </div>
           </section>
        </div>

        {/* HORÁRIOS DE FUNCIONAMENTO */}
        <section className="rounded-3xl p-6 md:p-8 w-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm dark:shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4 border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <Clock className="text-[#DC2626]" size={24} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Horário de Funcionamento</h2>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => replicarHorarios(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-main)] opacity-60 hover:opacity-100 hover:border-[#DC2626] transition-all text-[10px] font-bold uppercase"
              >
                <Copy size={12} /> Seg a Sex
              </button>
              <button 
                type="button" 
                onClick={() => replicarHorarios(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-all text-[10px] font-bold uppercase"
              >
                <CalendarDays size={12} /> Replicar Todos
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DIAS_CHAVES.map(dia => (
              <HorarioRow key={dia.id} label={dia.label} namePrefix={`horarios.${dia.id}`} />
            ))}
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 mt-2">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]">Cancelar</button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors shadow-sm">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>

      </form>
    </div>
  );
}