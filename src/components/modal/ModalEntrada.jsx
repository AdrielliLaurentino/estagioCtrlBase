import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import api from "../../services/api";

const CustomInput = ({ name, control, label, isPassword, showPassState, setShowPassState, required, type = "text", icon: Icon, ...props }) => {
  return (
    <div className="w-full mb-4 group">
      <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-1.5 ml-1 transition-colors group-focus-within:text-gray-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <div className="relative">
            {Icon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon size={18} strokeWidth={1.5} />
              </div>
            )}
            <input
              {...field}
              type={isPassword && !showPassState ? "password" : type}
              className={`w-full py-2.5 ${Icon ? 'pl-10 px-4' : 'px-4'} bg-transparent border rounded-xl text-sm text-gray-800 outline-none transition-all duration-300 ${
                error 
                  ? "border-red-400 focus:border-red-500 bg-red-50/30" 
                  : "border-gray-300 focus:border-gray-800 focus:shadow-sm"
              }`}
              {...props}
            />
            {isPassword && (
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                onClick={() => setShowPassState(!showPassState)}
                tabIndex={-1}
              >
                <span className="text-xs">{showPassState ? "Ocultar" : "Mostrar"}</span>
              </button>
            )}
            {error && <span className="text-[11px] text-red-500 font-medium mt-1.5 ml-1 block animate-in fade-in">{error.message}</span>}
          </div>
        )}
      />
    </div>
  );
};

export default function ModalEntrada({ isOpen, onClose }) {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    quantidade: yup.number().typeError("Deve ser um número").positive("Deve ser maior que zero").required("Obrigatório"),
    observacao: yup.string().required("A observação é obrigatória"),
  });

  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      quantidade: "",
      observacao: ""
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post("/estoque/entrada/lote", data);
      
      reset();
      onClose();
    } catch (error) {
      console.error("Erro ao processar entrada:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-opacity animate-in fade-in duration-300">
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300"
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full w-8 h-8 flex items-center justify-center font-bold"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Nova Entrada</h2>
        
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
          
          <CustomInput 
            name="quantidade" 
            control={control} 
            label="Quantidade" 
            type="number"
            required 
          />

          <CustomInput 
            name="observacao" 
            control={control} 
            label="Observação / Lote" 
            required 
          />
          
          <div className="flex justify-end gap-3 mt-8">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-all duration-200 disabled:opacity-60 shadow-md hover:shadow-lg"
            >
              {loading ? "A processar..." : "Confirmar Entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}