import { Users, Activity, CheckSquare } from "lucide-react";

export const CONFIG_TIPOS = {
  AULA: { cor: "text-emerald-500", bg: "bg-emerald-500/10", borderLeft: "border-l-emerald-500", icone: Users, label: "Aulas" },
  AVALIACAO: { cor: "text-purple-500", bg: "bg-purple-500/10", borderLeft: "border-l-purple-500", icone: Activity, label: "Avaliações" },
  TAREFA: { cor: "text-orange-500", bg: "bg-orange-500/10", borderLeft: "border-l-orange-500", icone: CheckSquare, label: "Tarefas" }
};