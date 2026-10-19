import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../lib/ablls-content.es.v1.json", import.meta.url);
const content = JSON.parse(readFileSync(path, "utf8"));
Object.assign(content.sections, {
  A: "Cooperación y eficacia del reforzador", B: "Desempeño visual", C: "Lenguaje receptivo", D: "Imitación motora", E: "Imitación vocal", F: "Peticiones", G: "Denominación", H: "Intraverbales", I: "Vocalizaciones espontáneas", K: "Habilidades de juego y ocio", L: "Interacción social", M: "Instrucción grupal", N: "Seguimiento de rutinas del aula", P: "Respuesta generalizada", U: "Habilidades para vestirse", V: "Habilidades de alimentación", W: "Habilidades de aseo personal", X: "Habilidades para ir al baño",
});
const overrides = {
  A8: { scoringCriteria: "2= mientras está sentado o de pie frente a los materiales de la tarea, espera tranquilamente y se orienta hacia ellos sin necesitar indicaciones para no tocarlos, 1= requiere sólo una indicación para sentarse o permanecer de pie adecuadamente, o para mantener las manos alejadas de los materiales" },
  C6: { scoringCriteria: "4= al menos 3 actividades sin indicaciones, 3= al menos 3 actividades con sólo una indicación verbal o de señalar, 2= 3 o más actividades con un modelo y sin indicaciones físicas, 1= 3 o más actividades con sólo indicaciones físicas parciales" },
  C7: { scoringCriteria: "4= al menos 3 actividades sin indicaciones, 3= al menos 3 actividades con sólo una indicación verbal o de señalar, 2= 3 o más actividades con un modelo y sin indicaciones físicas, 1= 3 o más actividades con sólo indicaciones físicas parciales" },
  C20: { taskObjective: "El estudiante podrá seleccionar objetos e imágenes nombrados por el instructor cuando se utilicen distintas instrucciones de selección (por ejemplo, «Muéstrame...», «¿Dónde está...?», «¿Puedes encontrar...?», «Toca...»).", question: "¿Puede el estudiante seleccionar los objetos e imágenes indicados cuando se usan distintas instrucciones de selección (por ejemplo, «Muéstrame...», «¿Dónde está...?», «¿Puedes encontrar...?», «Toca...»)?" },
  C31: { taskObjective: "El estudiante seleccionará objetos e imágenes comunes mediante una respuesta motora específica cuando reciba distintas instrucciones que indiquen la respuesta requerida (por ejemplo, «Toca», «Señala», «Dame», «Recoge», «Trae»).", examples: "«Toca la taza», «Señala el pájaro», «Dame el zapato», «Recoge el sombrero», «Trae el plato», «Cubre el mono», «Esconde la cuchara», «Empuja el automóvil»", protocolNotes: "Véase el Apéndice 7: Lista de instrucciones receptivas. Cuando se le da una instrucción específica que indica la respuesta requerida para seleccionar esos elementos (por ejemplo, «Toca», «Señala», «Dame», «Recoge», «Trae»), el estudiante utiliza la respuesta especificada." },
  C38: { question: "¿Puede el estudiante seleccionar objetos o imágenes cuando se le indican características o partes del objeto [por ejemplo, «Dame el que tiene cola»]?" },
  C49: { taskName: "Selecciona un conjunto de objetos con dos características especificadas" },
  D16: { scoringCriteria: "2= imita fácilmente acciones con objetos y reproduce la velocidad de la acción inmediatamente después de una demostración, 1= sólo requiere una indicación verbal para reproducir la velocidad de la acción inmediatamente después de una demostración" },
  F21: { taskName: "Pide información usando «Quién» o «De quién»" },
  F24: { taskName: "Pide información usando «Cuál»", question: "¿El estudiante pide información mediante preguntas con «Cuál»?", scoringCriteria: "2= formula espontáneamente preguntas con «Cuál» en situaciones no entrenadas cuando hay objetos desconocidos, 1= puede formular preguntas con «Cuál» cuando se presentan objetos desconocidos en situaciones de entrenamiento (o con otro tipo de indicación)" },
  F27: { taskName: "Pide información usando «Can», «Do», «Does» o «Will»", examples: "Do..., will..., can..., does... «Can I get shoes at a gas station?» («¿Puedo comprar zapatos en una gasolinera?»)" },
  G29: { taskObjective: "Cuando se le presenta un conjunto de objetos en el que todos menos uno pertenecen a una categoría especificada (según su función, características o clase), el estudiante podrá nombrar el objeto que no pertenece a ese conjunto." },
  H31: { taskName: "Responde preguntas con «Cuál»", taskObjective: "El estudiante podrá responder preguntas con «Cuál».", question: "¿El estudiante responde preguntas con «Cuál»?", examples: "«¿Cuál es un animal: un perro o un zapato?»" },
  H37: { taskName: "Intraverbales de Sí/No con preguntas que usan «Can», «Do», «Does» o «Will»" },
  H39: { examples: "Cuando se le pide que nombre algunos «animales grandes de granja», el estudiante responde «caballo y vaca»." },
  H48: { examples: "El estudiante puede describir su última visita al zoológico o al parque (qué hizo, quién estaba allí, qué vio, etc.); también puede contar el cuento de Los tres cerditos." },
  K14: { scoringCriteria: "4= puede jugar al menos 3 juegos interactivos sin ayuda, 3= puede jugar al menos 2 juegos interactivos sin ayuda, 2= sólo necesita algunas indicaciones para atender a su turno O para completar la acción (no ambas), 1= puede participar en juegos, pero necesita algunas indicaciones tanto para atender a su turno como para completar las acciones necesarias (sin recibir indicaciones completas)" },
  K15: { scoringCriteria: "4= puede jugar al menos tres juegos de mesa sin ayuda, 3= puede jugar al menos dos juegos de mesa sin ayuda, 2= sólo necesita algunas indicaciones para atender a su turno O para completar la acción (no ambas), 1= puede participar en juegos de mesa, pero necesita algunas indicaciones tanto para atender a su turno como para completar las acciones necesarias (sin recibir indicaciones completas)" },
  L16: { scoringCriteria: "4= nombra varios objetos para 3 compañeros y para adultos sin indicaciones, 3= nombra un objeto para 1 compañero y varios para adultos sin indicaciones, 2= nombra un objeto para 1 compañero sin indicaciones, 1= nombra un objeto para adultos sin indicaciones" },
  M2: { scoringCriteria: "4= grupo de 1:16 durante 15 min, 3= grupo de 1:12 (O 2:16) durante 15 min, 2= grupo de 1:8 durante 15 min, 1= grupo de 1:6 durante 15 min" },
};

for (const [taskId, fields] of Object.entries(overrides)) Object.assign(content.tasks[taskId], fields);
writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`, "utf8");
console.log(`Applied reviewed Spanish overrides to ${Object.keys(overrides).length} tasks.`);
