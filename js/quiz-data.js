// Definición del cuestionario. Cada paso es un objeto; el motor (app.js) los recorre en orden.
// - showIf(a): si devuelve false, el paso se salta (a = respuestas hasta el momento).
// - title/body pueden ser funciones de las respuestas para personalizar el texto.
// Tipos: single, multi, input, info, bmi, date, projection, name, loader.

window.QUIZ_SECTIONS = ['Perfil', 'Tu nivel', 'Entrenamiento', 'Hábitos', 'Medidas'];

window.AGE_RANGES = [
  { v: '18-29', label: '18-29', emoji: '⚡' },
  { v: '30-39', label: '30-39', emoji: '💪' },
  { v: '40-49', label: '40-49', emoji: '🔥' },
  { v: '50+', label: '50+', emoji: '🌿' },
];

// Sugerencias de equipo y reconocimiento de lo que la persona escribe a mano
window.EQUIP_SUGGESTIONS = ['Mancuernas', 'Kettlebell', 'Cuerda para saltar', 'Banco', 'Rueda abdominal', 'Colchoneta',
  'Step', 'Chaleco con peso', 'Remo ergómetro', 'Paralelas bajas (parallettes)', 'Bicicleta estática', 'Elíptica'];
window.EQUIP_KEYWORDS = [
  { re: /mancuern|kettle|pesa rusa|pesas libres/i, v: 'dumbbells' },
  { re: /bici|spinning|ciclo/i, v: 'bike' },
  { re: /caminador|trotador|cinta de correr|treadmill/i, v: 'treadmill' },
  { re: /el[ií]ptic/i, v: 'elliptical' },
  { re: /cuerda|comba|soga/i, v: 'jumprope' },
  { re: /bodytone|body tone|multiestaci|multifuerza|multigym|polea|m[aá]quina de (pesas|fuerza|hacer pesa)|gimnasio en casa/i, v: 'gym' },
  { re: /trx|suspensi[oó]n/i, v: 'trx' },
  { re: /barra( de)? dominada|barra fija|barra/i, v: 'bar' },
  { re: /anilla/i, v: 'rings' },
  { re: /banda|liga|el[aá]stic/i, v: 'bands' },
  { re: /paralela/i, v: 'dip' },
];
window.recognizeEquipment = (text) => (window.EQUIP_KEYWORDS.find((k) => k.re.test(text)) || {}).v || null;

window.QUIZ_STEPS = [
  // ---------- Perfil ----------
  {
    id: 'gender', section: 0, type: 'single',
    title: '¿Cuál es tu sexo?',
    subtitle: 'Lo usamos para calcular tu gasto calórico y ajustar los volúmenes de entrenamiento.',
    options: [
      { v: 'male', label: 'Hombre', emoji: '♂️' },
      { v: 'female', label: 'Mujer', emoji: '♀️' },
    ],
  },
  {
    id: 'info_age', section: 0, type: 'info', emoji: '🏁',
    title: (a) => a.ageRange === '50+' ? 'Nunca es tarde para empezar' : 'La calistenia funciona a cualquier edad',
    body: (a) => a.ageRange === '50+' || a.ageRange === '40-49'
      ? 'Entrenar con tu propio peso mejora la fuerza, el equilibrio y la salud de las articulaciones. Vamos a ajustar la intensidad para que progreses de forma segura.'
      : 'Con tu peso corporal y constancia puedes ganar fuerza, músculo y control. Responde unas preguntas y armamos tu plan.',
  },
  {
    id: 'goal', section: 0, type: 'single',
    title: '¿Cuál es tu objetivo principal?',
    options: [
      { v: 'muscle', label: 'Ganar músculo', emoji: '💪' },
      { v: 'lose', label: 'Perder peso', emoji: '🔥' },
      { v: 'recomp', label: 'Perder grasa y ganar músculo', emoji: '⚖️' },
      { v: 'skills', label: 'Aprender habilidades (dominadas, parada de manos...)', emoji: '🤸' },
      { v: 'fitness', label: 'Mejorar mi estado físico general', emoji: '❤️' },
    ],
  },
  {
    id: 'info_goal', section: 0, type: 'info',
    emoji: (a) => ({ muscle: '💪', lose: '🔥', recomp: '⚖️', skills: '🤸', fitness: '❤️' })[a.goal],
    title: (a) => ({
      muscle: '¡A ganar músculo!',
      lose: 'Vamos a quemar grasa con cabeza',
      recomp: 'Recomposición: lo mejor de los dos mundos',
      skills: 'Las habilidades se construyen paso a paso',
      fitness: 'Más energía, más fuerza, más salud',
    })[a.goal],
    body: (a) => ({
      muscle: 'Tu plan se basa en sobrecarga progresiva: cada semana un poco más de repeticiones o una variante más difícil. Además, un pequeño superávit calórico con suficiente proteína.',
      lose: 'Vamos a combinar circuitos de fuerza (para mantener músculo) con acabados metabólicos y un déficit calórico moderado y sostenible.',
      recomp: 'Entrenamiento de fuerza con un déficit leve y mucha proteína: bajas grasa mientras mantienes o ganas músculo.',
      skills: 'Trabajaremos progresiones de empuje, tirón y core, con series cortas y descansos largos para que la técnica sea limpia.',
      fitness: 'Un plan equilibrado de fuerza, movilidad y acondicionamiento que puedes mantener a largo plazo.',
    })[a.goal],
  },
  {
    id: 'motivation', section: 0, type: 'multi',
    title: '¿Qué te motiva a ponerte en forma?',
    subtitle: 'Elige todas las que quieras.',
    options: [
      { v: 'look', label: 'Verme mejor', emoji: '✨' },
      { v: 'strong', label: 'Ser más fuerte', emoji: '🏋️' },
      { v: 'health', label: 'Sentirme más saludable y con energía', emoji: '🔋' },
      { v: 'confidence', label: 'Ganar confianza', emoji: '😎' },
      { v: 'family', label: 'Tener energía para mi familia', emoji: '👨‍👩‍👧' },
    ],
  },
  {
    id: 'bodyType', section: 0, type: 'single',
    title: '¿Cómo describirías tu físico actual?',
    options: [
      { v: 'slim', label: 'Delgado/a', emoji: '🧍' },
      { v: 'average', label: 'Promedio', emoji: '🙂' },
      { v: 'heavy', label: 'Con algo de sobrepeso', emoji: '🫃' },
      { v: 'obese', label: 'Con bastante sobrepeso', emoji: '🐻' },
    ],
  },

  // ---------- Tu nivel ----------
  {
    id: 'experience', section: 1, type: 'single',
    title: '¿Has hecho calistenia antes?',
    options: [
      { v: 'none', label: 'Nunca', emoji: '🌱' },
      { v: 'beginner', label: 'Estoy empezando', emoji: '🚶' },
      { v: 'some', label: 'Tengo algo de experiencia', emoji: '🏃' },
      { v: 'advanced', label: 'Sí, entreno con regularidad', emoji: '🦍' },
    ],
  },
  {
    id: 'pushups', section: 1, type: 'single',
    title: '¿Cuántas flexiones seguidas puedes hacer?',
    subtitle: 'Flexiones completas, con el cuerpo recto.',
    options: [
      { v: 0, label: 'Ninguna' },
      { v: 1, label: '1 a 5' },
      { v: 2, label: '6 a 15' },
      { v: 3, label: '16 a 30' },
      { v: 4, label: 'Más de 30' },
    ],
  },
  {
    id: 'pullups', section: 1, type: 'single',
    title: '¿Y dominadas?',
    subtitle: 'Colgado/a de una barra, subir hasta que la barbilla pase la barra.',
    options: [
      { v: 0, label: 'Ninguna / no sé' },
      { v: 1, label: '1 a 3' },
      { v: 2, label: '4 a 8' },
      { v: 3, label: '9 a 15' },
      { v: 4, label: 'Más de 15' },
    ],
  },
  {
    id: 'plank', section: 1, type: 'single',
    title: '¿Cuánto tiempo aguantas en plancha?',
    options: [
      { v: 0, label: 'Menos de 20 segundos' },
      { v: 1, label: '20 a 45 segundos' },
      { v: 2, label: '45 a 90 segundos' },
      { v: 3, label: 'Más de 90 segundos' },
    ],
  },
  {
    id: 'frequency', section: 1, type: 'single',
    title: '¿Cuántas veces has entrenado en los últimos 3 meses?',
    options: [
      { v: 0, label: 'No he hecho ejercicio' },
      { v: 1, label: 'Algunas veces al mes' },
      { v: 2, label: 'Varias veces por semana' },
      { v: 3, label: 'Casi todos los días' },
    ],
  },
  {
    id: 'info_level', section: 1, type: 'info',
    emoji: (a) => a.frequency >= 2 ? '🏆' : '🧱',
    title: (a) => a.frequency >= 2 ? '¡Buena constancia!' : 'Empezamos por la base',
    body: (a) => a.frequency >= 2
      ? 'Ya tienes el hábito. La calistenia te va a dar nuevos retos: variantes más difíciles, control corporal y habilidades.'
      : 'Las primeras semanas se trata de aprender la técnica y crear el hábito. Tu plan arranca con variantes accesibles y sube de dificultad cuando estés listo/a.',
  },
  {
    id: 'flexibility', section: 1, type: 'single',
    title: '¿Qué tan flexible eres?',
    subtitle: 'Por ejemplo, ¿llegas a tocarte los pies con las piernas estiradas?',
    options: [
      { v: 'high', label: 'Muy flexible', emoji: '🧘' },
      { v: 'mid', label: 'Normal', emoji: '🙆' },
      { v: 'low', label: 'Poco flexible', emoji: '🪵' },
    ],
  },

  // ---------- Entrenamiento ----------
  {
    id: 'zones', section: 2, type: 'multi',
    title: '¿Qué zonas quieres priorizar?',
    options: [
      { v: 'chest', label: 'Pecho', emoji: '🏋️' },
      { v: 'back', label: 'Espalda', emoji: '🧗' },
      { v: 'arms', label: 'Brazos', emoji: '💪' },
      { v: 'core', label: 'Abdomen', emoji: '🍫' },
      { v: 'legs', label: 'Piernas', emoji: '🦵' },
      { v: 'glutes', label: 'Glúteos', emoji: '🍑' },
      { v: 'full', label: 'Todo el cuerpo', emoji: '🧍', none: true },
    ],
  },
  {
    id: 'limitations', section: 2, type: 'multi',
    title: '¿Tienes molestias en alguna de estas zonas?',
    options: [
      { v: 'back', label: 'Espalda / zona lumbar' },
      { v: 'knees', label: 'Rodillas' },
      { v: 'shoulders', label: 'Hombros' },
      { v: 'wrists', label: 'Muñecas' },
      { v: 'none', label: 'Ninguna', none: true },
    ],
  },
  {
    id: 'info_safety', section: 2, type: 'info', emoji: '🛡️',
    showIf: (a) => a.limitations && !a.limitations.includes('none'),
    title: 'La seguridad es lo primero',
    body: 'Vamos a evitar o sustituir los ejercicios que cargan esas zonas y elegir variantes de bajo impacto. Si el dolor es fuerte o persistente, consulta a un profesional de la salud antes de empezar.',
  },
  {
    id: 'equipment', section: 2, type: 'multi',
    title: '¿Con qué equipo cuentas?',
    subtitle: 'En casa, en el parque o en el gimnasio.',
    options: [
      { v: 'bar', label: 'Barra de dominadas', emoji: '➖', group: 'Calistenia' },
      { v: 'dip', label: 'Paralelas o 2 sillas firmes', emoji: '🪑', group: 'Calistenia' },
      { v: 'rings', label: 'Anillas', emoji: '⭕', group: 'Calistenia' },
      { v: 'bands', label: 'Bandas elásticas', emoji: '🎗️', group: 'Calistenia' },
      { v: 'trx', label: 'TRX (cintas de suspensión)', emoji: '🪢', group: 'Calistenia' },
      { v: 'gym', label: 'Máquina multiestación (tipo Bodytone: polea, mariposa, rodillos)', emoji: '🏋️', group: 'Fuerza' },
      { v: 'dumbbells', label: 'Mancuernas o kettlebell', emoji: '🏋️‍♀️', group: 'Fuerza' },
      { v: 'bike', label: 'Bicicleta estática', emoji: '🚴', group: 'Cardio' },
      { v: 'treadmill', label: 'Caminadora / trotadora', emoji: '🏃', group: 'Cardio' },
      { v: 'elliptical', label: 'Elíptica', emoji: '⛷️', group: 'Cardio' },
      { v: 'jumprope', label: 'Cuerda para saltar', emoji: '🪢', group: 'Cardio' },
      { v: 'none', label: 'Nada, solo el suelo', emoji: '🏠', none: true },
    ],
  },
  {
    id: 'equipmentOther', section: 2, type: 'tags',
    title: '¿Tienes otro equipo?',
    subtitle: 'Escríbelo o toca una sugerencia. Si lo reconocemos, lo usamos en tu plan. Puedes omitir este paso.',
  },
  {
    id: 'trxMode', section: 2, type: 'single',
    showIf: (a) => (a.equipment || []).includes('trx'),
    title: '¿Cómo quieres usar el TRX?',
    subtitle: 'Puedes cambiarlo después en tu perfil.',
    options: [
      { v: 'mix', label: 'Combinado con calistenia', hint: 'Recomendado: lo mejor de los dos', emoji: '🔀' },
      { v: 'extra', label: 'Calistenia + un día extra de TRX', emoji: '➕' },
      { v: 'only', label: 'Todo el plan con TRX', emoji: '🪢' },
    ],
  },
  {
    id: 'days', section: 2, type: 'single',
    title: '¿Cuántos días por semana quieres entrenar?',
    options: [
      { v: 2, label: '2 días' },
      { v: 3, label: '3 días', hint: 'Recomendado para empezar' },
      { v: 4, label: '4 días' },
      { v: 5, label: '5 días' },
    ],
  },
  {
    id: 'duration', section: 2, type: 'single',
    title: '¿Cuánto tiempo por sesión?',
    options: [
      { v: 15, label: '10-15 min' },
      { v: 25, label: '20-30 min' },
      { v: 40, label: '30-45 min' },
      { v: 55, label: '45-60 min' },
    ],
  },

  // ---------- Hábitos ----------
  {
    id: 'dayType', section: 3, type: 'single',
    title: '¿Cómo es tu día típico?',
    options: [
      { v: 'sitting', label: 'Paso la mayor parte sentado/a', emoji: '💺' },
      { v: 'mixed', label: 'Entre sentado/a y en movimiento', emoji: '🚶' },
      { v: 'standing', label: 'Paso mucho tiempo de pie / caminando', emoji: '🧍' },
      { v: 'physical', label: 'Trabajo físico intenso', emoji: '🔨' },
    ],
  },
  {
    id: 'energy', section: 3, type: 'single',
    title: '¿Cómo es tu energía durante el día?',
    options: [
      { v: 'low', label: 'Baja y variable', emoji: '🪫' },
      { v: 'dips', label: 'Tengo bajones después de comer', emoji: '😴' },
      { v: 'stable', label: 'Estable', emoji: '🔋' },
      { v: 'high', label: 'Alta todo el día', emoji: '⚡' },
    ],
  },
  {
    id: 'sleep', section: 3, type: 'single',
    title: '¿Cuánto duermes normalmente?',
    options: [
      { v: 4, label: 'Menos de 5 horas' },
      { v: 5.5, label: '5-6 horas' },
      { v: 7.5, label: '7-8 horas' },
      { v: 9, label: 'Más de 8 horas' },
    ],
  },
  {
    id: 'water', section: 3, type: 'single',
    title: '¿Cuánta agua tomas al día?',
    options: [
      { v: 0, label: 'Casi nada, sobre todo café o refrescos' },
      { v: 1, label: 'Unos 2 vasos' },
      { v: 2, label: '2 a 6 vasos' },
      { v: 3, label: 'Más de 6 vasos' },
    ],
  },
  {
    id: 'info_habits', section: 3, type: 'info', emoji: '😴',
    showIf: (a) => a.sleep < 7 || a.water < 2 || a.energy === 'low',
    title: 'El descanso también entrena',
    body: (a) => {
      const tips = [];
      if (a.sleep < 7) tips.push('Dormir 7-8 horas mejora la recuperación muscular y el control del apetito.');
      if (a.water < 2) tips.push('Beber más agua ayuda a rendir mejor y a reducir la fatiga.');
      if (a.energy === 'low') tips.push('Entrenar con regularidad suele subir los niveles de energía en pocas semanas.');
      return tips.join(' ') + ' Te dejamos recordatorios en tu plan.';
    },
  },
  {
    id: 'habits', section: 3, type: 'multi',
    title: '¿Te identificas con alguno de estos hábitos?',
    options: [
      { v: 'emotional', label: 'Como por ansiedad o aburrimiento' },
      { v: 'late', label: 'Como tarde en la noche' },
      { v: 'sweets', label: 'Me cuesta dejar los dulces' },
      { v: 'skip', label: 'Me salto comidas' },
      { v: 'alcohol', label: 'Bebo alcohol varias veces por semana' },
      { v: 'none', label: 'Ninguno', none: true },
    ],
  },
  {
    id: 'diet', section: 3, type: 'single',
    title: '¿Qué tipo de alimentación prefieres?',
    options: [
      { v: 'traditional', label: 'Tradicional (de todo)', emoji: '🍽️' },
      { v: 'mediterranean', label: 'Mediterránea', emoji: '🫒' },
      { v: 'vegetarian', label: 'Vegetariana', emoji: '🥚' },
      { v: 'vegan', label: 'Vegana', emoji: '🌱' },
      { v: 'keto', label: 'Baja en carbohidratos / keto', emoji: '🥑' },
    ],
  },

  // ---------- Medidas ----------
  {
    id: 'height', section: 4, type: 'input',
    title: '¿Cuánto mides?', unit: 'cm', min: 120, max: 230, placeholder: '170',
  },
  {
    id: 'weight', section: 4, type: 'input',
    title: '¿Cuál es tu peso actual?', unit: 'kg', min: 35, max: 250, step: 0.1, placeholder: '75',
  },
  {
    id: 'targetWeight', section: 4, type: 'input',
    title: '¿Y tu peso objetivo?', unit: 'kg', min: 35, max: 250, step: 0.1,
    placeholder: (a) => a.weight || '70',
    subtitle: (a) => {
      if (!a.height) return '';
      const h = a.height / 100;
      return `Un rango saludable para tu altura es de ${Math.round(18.5 * h * h)} a ${Math.round(24.9 * h * h)} kg.`;
    },
  },
  {
    id: 'age', section: 4, type: 'input',
    title: '¿Qué edad tienes?', unit: 'años', min: 14, max: 99, placeholder: (a) => ({ '18-29': 25, '30-39': 35, '40-49': 45, '50+': 55 })[a.ageRange] || 30,
  },
  { id: 'bmi', section: 4, type: 'bmi', title: 'Tu perfil físico' },
  {
    id: 'event', section: 4, type: 'single',
    title: '¿Tienes algún evento importante próximamente?',
    subtitle: 'Tener una fecha ayuda a mantener la motivación.',
    options: [
      { v: 'vacation', label: 'Vacaciones', emoji: '🏖️' },
      { v: 'wedding', label: 'Boda', emoji: '💍' },
      { v: 'birthday', label: 'Cumpleaños', emoji: '🎂' },
      { v: 'competition', label: 'Competencia / prueba física', emoji: '🥇' },
      { v: 'other', label: 'Otro', emoji: '📅' },
      { v: 'none', label: 'No por ahora', emoji: '➖' },
    ],
  },
  {
    id: 'eventDate', section: 4, type: 'date',
    showIf: (a) => a.event && a.event !== 'none',
    title: '¿Cuándo es?',
  },
  { id: 'projection', section: 4, type: 'projection', title: 'Tu proyección' },
  { id: 'name', section: 4, type: 'name', title: '¿Cómo te llamas?', subtitle: 'Para guardar tu plan con tu nombre.' },
  { id: 'loader', section: 4, type: 'loader' },
];
