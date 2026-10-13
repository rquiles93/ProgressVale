export type ClientStatus = "En progreso" | "Sin iniciar" | "Completada";

export type DemoClient = {
  id: string;
  name: string;
  identifier: string;
  initials: string;
  status: ClientStatus;
  lastActivity: string;
  progress: number | null;
  accent: string;
};

export const clients: DemoClient[] = [
  { id: "lucia-m", name: "Lucía M.", identifier: "DEMO-001", initials: "LM", status: "En progreso", lastActivity: "Hoy, 10:24", progress: 38, accent: "bg-[#C8D9C9]" },
  { id: "mateo-r", name: "Mateo R.", identifier: "DEMO-002", initials: "MR", status: "Sin iniciar", lastActivity: "Añadido el 8 oct", progress: null, accent: "bg-[#B8C7BB]" },
  { id: "sofia-a", name: "Sofía A.", identifier: "DEMO-003", initials: "SA", status: "Completada", lastActivity: "2 oct 2026", progress: 100, accent: "bg-[#B9C5D2]" },
  { id: "diego-v", name: "Diego V.", identifier: "DEMO-004", initials: "DV", status: "En progreso", lastActivity: "29 sep 2026", progress: 71, accent: "bg-[#D7E2D7]" },
];

export const sections = [
  { code: "A", name: "Cooperación y reforzador", progress: 72 },
  { code: "B", name: "Desempeño visual", progress: 45 },
  { code: "C", name: "Lenguaje receptivo", progress: 18 },
  { code: "D", name: "Imitación motora", progress: 0 },
  { code: "E", name: "Imitación vocal", progress: 0 },
  { code: "F", name: "Peticiones", progress: 0 },
  { code: "G", name: "Etiquetado", progress: 0 },
  { code: "H", name: "Intraverbales", progress: 0 },
];

export const skillPlaceholders = [
  { id: "A1", title: "Título de habilidad — contenido pendiente de verificación", maxScore: 4 },
  { id: "A2", title: "Título de habilidad — contenido pendiente de verificación", maxScore: 2 },
  { id: "A3", title: "Título de habilidad — contenido pendiente de verificación", maxScore: 3 },
];
