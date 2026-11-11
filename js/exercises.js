// Biblioteca de ejercicios organizada en "escaleras" de progresión por patrón de movimiento.
// Índice 0 = más fácil. Campos:
//   kind: 'reps' | 'time'      needs: equipo requerido (cualquiera de la lista)
//   avoid: molestias con las que NO se recomienda   maxReps / baseSec: límites de dosificación
//   perSide: true si se hace por lado

window.EXERCISE_LADDERS = {
  push: [
    { id: 'wall_pushup', name: 'Flexión en pared', kind: 'reps', cue: 'Manos en la pared a la altura del pecho, cuerpo recto. Baja el pecho hacia la pared y empuja.' },
    { id: 'incline_pushup', name: 'Flexión inclinada', kind: 'reps', cue: 'Manos sobre una mesa o banco firme. Cuerpo como una tabla, codos a unos 45°.' },
    { id: 'knee_pushup', name: 'Flexión con rodillas apoyadas', kind: 'reps', cue: 'Rodillas en el suelo, cadera alineada con el tronco. Pecho casi al suelo.' },
    { id: 'pushup', name: 'Flexión', kind: 'reps', cue: 'Glúteos y abdomen apretados. Baja hasta que el pecho casi toque el suelo.' },
    { id: 'diamond_pushup', name: 'Flexión diamante', kind: 'reps', cue: 'Manos juntas formando un diamante bajo el pecho. Codos pegados al cuerpo. Trabaja más el tríceps.' },
    { id: 'decline_pushup', name: 'Flexión con pies elevados', kind: 'reps', cue: 'Pies sobre una silla o banco. Mantén la cadera alineada, sin hundir la zona lumbar.' },
    { id: 'archer_pushup', name: 'Flexión arquera', kind: 'reps', perSide: true, avoid: ['shoulders'], cue: 'Manos muy abiertas. Baja hacia un lado mientras el otro brazo queda estirado.' },
    { id: 'pseudo_planche_pushup', name: 'Flexión pseudo-plancha', kind: 'reps', avoid: ['shoulders', 'wrists'], maxReps: 12, cue: 'Manos a la altura de la cintura, dedos hacia afuera, cuerpo inclinado hacia adelante.' },
    { id: 'clap_pushup', name: 'Flexión con palmada', kind: 'reps', maxReps: 10, avoid: ['wrists', 'shoulders'], cue: 'Empuja explosivo para despegar las manos, da una palmada y aterriza con los codos suaves.' },
  ],
  vpush: [
    { id: 'shoulder_taps', name: 'Plancha alta con toque de hombro', kind: 'reps', perSide: true, cue: 'En posición de flexión, toca el hombro contrario sin girar la cadera.' },
    { id: 'pike_pushup', name: 'Flexión pike', kind: 'reps', avoid: ['shoulders'], maxReps: 15, cue: 'Cadera arriba formando una V invertida. Baja la cabeza hacia el suelo, por delante de las manos.' },
    { id: 'elevated_pike', name: 'Flexión pike con pies elevados', kind: 'reps', avoid: ['shoulders'], maxReps: 12, cue: 'Pies sobre un banco o silla, cadera sobre los hombros. Baja con control.' },
    { id: 'wall_handstand', name: 'Parada de manos de frente a la pared', kind: 'time', baseSec: 15, avoid: ['shoulders', 'wrists'], cue: 'Sube caminando con los pies por la pared. Abdomen al pecho a la pared, brazos bloqueados.' },
    { id: 'wall_hspu_neg', name: 'Flexión en pino contra la pared (negativa)', kind: 'reps', maxReps: 6, avoid: ['shoulders', 'wrists'], cue: 'En parada de manos contra la pared, baja la cabeza al suelo en 3-5 segundos.' },
    { id: 'hspu_wall', name: 'Flexión en pino contra la pared', kind: 'reps', maxReps: 8, avoid: ['shoulders', 'wrists'], cue: 'En parada de manos contra la pared, baja la cabeza hasta casi tocar el suelo y vuelve a empujar arriba.' },
  ],
  dip: [
    { id: 'bench_dip_bent', name: 'Fondos en banco con rodillas flexionadas', kind: 'reps', avoid: ['shoulders', 'wrists'], cue: 'Manos en el borde de una silla firme, pies cerca. Baja hasta 90° de codo.' },
    { id: 'bench_dip', name: 'Fondos en banco con piernas estiradas', kind: 'reps', avoid: ['shoulders', 'wrists'], cue: 'Igual que el anterior pero con las piernas estiradas. Hombros lejos de las orejas.' },
    { id: 'dip_negative', name: 'Fondos en paralelas (negativos)', kind: 'reps', maxReps: 6, needs: ['dip', 'rings'], avoid: ['shoulders', 'wrists'], cue: 'Sube con un salto y baja en 3-5 segundos hasta 90° de codo.' },
    { id: 'parallel_dip', name: 'Fondos en paralelas', kind: 'reps', maxReps: 15, needs: ['dip'], avoid: ['shoulders', 'wrists'], cue: 'Torso ligeramente inclinado, baja hasta 90° de codo y bloquea arriba.' },
    { id: 'ring_dip', name: 'Fondos en anillas', kind: 'reps', maxReps: 12, needs: ['rings'], avoid: ['shoulders', 'wrists'], cue: 'Estabiliza las anillas pegadas al cuerpo. Rota las palmas hacia afuera al subir.' },
  ],
  vpull: [
    { id: 'dead_hang', name: 'Colgarse de la barra', kind: 'time', baseSec: 15, needs: ['bar', 'rings'], cue: 'Agarre a la anchura de los hombros, brazos estirados. Respira tranquilo.' },
    { id: 'scap_pull', name: 'Retracciones escapulares colgado', kind: 'reps', maxReps: 12, needs: ['bar', 'rings'], cue: 'Colgado, sin doblar los codos, baja los hombros alejándolos de las orejas y vuelve.' },
    { id: 'negative_pullup', name: 'Dominada negativa', kind: 'reps', maxReps: 5, needs: ['bar', 'rings'], cue: 'Sube con un salto o una silla, barbilla sobre la barra, y baja en 5 segundos.' },
    { id: 'assisted_pullup', name: 'Dominada asistida', kind: 'reps', maxReps: 8, needs: ['bar'], cue: 'Con una banda elástica bajo los pies o apoyando la punta de un pie en una silla.' },
    { id: 'chinup', name: 'Dominada supina', kind: 'reps', maxReps: 6, needs: ['bar', 'rings'], cue: 'Palmas hacia ti. Pecho hacia la barra, bajada completa.' },
    { id: 'pullup', name: 'Dominada', kind: 'reps', maxReps: 10, needs: ['bar', 'rings'], cue: 'Palmas hacia afuera. Empieza bajando los hombros y lleva el pecho a la barra.' },
    { id: 'pullup_pause', name: 'Dominada con pausa arriba', kind: 'reps', maxReps: 10, needs: ['bar', 'rings'], cue: 'Aguanta 2 segundos con la barbilla sobre la barra antes de bajar.' },
    { id: 'archer_pullup', name: 'Dominada arquera', kind: 'reps', perSide: true, maxReps: 6, needs: ['bar'], avoid: ['shoulders'], cue: 'Agarre ancho. Sube hacia una mano mientras el otro brazo se estira.' },
    { id: 'muscle_up', name: 'Muscle-up', kind: 'reps', maxReps: 5, needs: ['bar'], avoid: ['shoulders'], cue: 'Dominada explosiva llevando la barra hacia la cadera, pasa el pecho por encima y termina con un fondo.' },
  ],
  hpull: [
    { id: 'prone_ytw', name: 'Y-T-W boca abajo', kind: 'reps', cue: 'Boca abajo, levanta los brazos formando Y, T y W, apretando las escápulas.' },
    { id: 'towel_row', name: 'Remo con toalla en la puerta', kind: 'reps', cue: 'Toalla en el pomo de una puerta cerrada y firme. Inclínate hacia atrás y tira del pecho hacia la puerta.' },
    { id: 'table_row', name: 'Remo invertido bajo una mesa', kind: 'reps', cue: 'Debajo de una mesa muy firme o de una barra baja. Cuerpo recto, pecho al borde.' },
    { id: 'elevated_row', name: 'Remo invertido con pies elevados', kind: 'reps', cue: 'Igual que el remo invertido pero con los pies sobre una silla. Pausa arriba.' },
    { id: 'archer_row', name: 'Remo arquero', kind: 'reps', perSide: true, maxReps: 10, avoid: ['shoulders'], cue: 'Tira hacia una mano mientras el otro brazo queda estirado.' },
  ],
  squat: [
    { id: 'box_squat', name: 'Sentadilla a la silla', kind: 'reps', cue: 'Siéntate apenas en la silla y levántate sin impulso. Rodillas en la línea de los pies.' },
    { id: 'air_squat', name: 'Sentadilla', kind: 'reps', cue: 'Pies a la anchura de los hombros, pecho arriba. Baja hasta que el muslo quede paralelo al suelo.' },
    { id: 'split_squat', name: 'Zancada estática', kind: 'reps', perSide: true, cue: 'Un pie adelante y otro atrás. Baja la rodilla de atrás hacia el suelo, en vertical.' },
    { id: 'reverse_lunge', name: 'Zancada hacia atrás', kind: 'reps', perSide: true, avoid: ['knees'], cue: 'Da un paso atrás y baja controlando. Empuja con el talón de adelante.' },
    { id: 'bulgarian_split', name: 'Sentadilla búlgara', kind: 'reps', perSide: true, avoid: ['knees'], cue: 'Empeine del pie de atrás sobre una silla. Torso un poco inclinado hacia adelante.' },
    { id: 'shrimp_assisted', name: 'Sentadilla del camarón asistida', kind: 'reps', perSide: true, maxReps: 10, avoid: ['knees'], cue: 'Sujeta el pie de atrás con la mano y baja la rodilla al suelo, apoyándote en una pared.' },
    { id: 'pistol_assisted', name: 'Sentadilla a una pierna asistida', kind: 'reps', perSide: true, maxReps: 10, avoid: ['knees'], cue: 'Agarrado/a de un marco de puerta, baja sobre una pierna con la otra estirada al frente.' },
    { id: 'pistol', name: 'Pistol squat', kind: 'reps', perSide: true, maxReps: 10, avoid: ['knees'], cue: 'Sentadilla completa a una pierna sin ayuda. Brazos al frente para equilibrarte.' },
  ],
  hinge: [
    { id: 'glute_bridge', name: 'Puente de glúteo', kind: 'reps', cue: 'Boca arriba, rodillas flexionadas. Sube la cadera apretando los glúteos, pausa 1 segundo arriba.' },
    { id: 'sl_glute_bridge', name: 'Puente de glúteo a una pierna', kind: 'reps', perSide: true, cue: 'Una pierna estirada en el aire. Cadera nivelada al subir.' },
    { id: 'hip_thrust', name: 'Hip thrust en sofá', kind: 'reps', cue: 'Espalda alta apoyada en el sofá. Sube la cadera hasta alinear rodillas, cadera y hombros.' },
    { id: 'sl_hip_thrust', name: 'Hip thrust a una pierna', kind: 'reps', perSide: true, cue: 'Como el hip thrust, pero sobre una sola pierna. Controla la bajada.' },
    { id: 'nordic_negative', name: 'Curl nórdico negativo', kind: 'reps', maxReps: 6, avoid: ['knees'], cue: 'Pies anclados bajo un sofá. Déjate caer hacia adelante lo más lento posible con la cadera estirada.' },
  ],
  core: [
    { id: 'dead_bug', name: 'Bicho muerto (dead bug)', kind: 'reps', perSide: true, cue: 'Zona lumbar pegada al suelo. Estira el brazo y la pierna contrarios sin despegarla.' },
    { id: 'plank', name: 'Plancha', kind: 'time', baseSec: 20, cue: 'Sobre los antebrazos, cuerpo recto. Aprieta glúteos y abdomen.' },
    { id: 'side_plank', name: 'Plancha lateral', kind: 'time', baseSec: 15, perSide: true, cue: 'Codo bajo el hombro, cadera alta. Cuerpo en línea recta.' },
    { id: 'hollow_hold', name: 'Posición hollow', kind: 'time', baseSec: 15, avoid: ['back'], cue: 'Boca arriba, zona lumbar pegada al suelo, brazos y piernas estirados a pocos centímetros del suelo.' },
    { id: 'hanging_knee_raise', name: 'Elevación de rodillas colgado', kind: 'reps', maxReps: 15, needs: ['bar', 'rings'], avoid: ['back'], cue: 'Colgado de la barra, sube las rodillas al pecho sin balancearte.' },
    { id: 'tuck_lsit', name: 'L-sit con rodillas recogidas', kind: 'time', baseSec: 10, avoid: ['wrists'], cue: 'Manos en paralelas, sillas o el suelo, brazos bloqueados. Levanta el cuerpo con las rodillas al pecho.' },
    { id: 'hanging_leg_raise', name: 'Elevación de piernas colgado', kind: 'reps', maxReps: 12, needs: ['bar', 'rings'], avoid: ['back'], cue: 'Piernas estiradas hasta la altura de la cadera o más. Controla la bajada.' },
    { id: 'dragon_flag_neg', name: 'Dragon flag negativo', kind: 'reps', maxReps: 6, avoid: ['back', 'shoulders'], cue: 'Acostado/a en un banco, agárrate detrás de la cabeza y baja el cuerpo recto lentamente.' },
    { id: 'toes_to_bar', name: 'Pies a la barra', kind: 'reps', maxReps: 10, needs: ['bar', 'rings'], avoid: ['back'], cue: 'Colgado de la barra, sube las piernas casi estiradas hasta tocar la barra con los pies. Baja con control, sin balanceo.' },
  ],
  skill: [
    { id: 'support_hold', name: 'Soporte en paralelas o sillas', kind: 'time', baseSec: 15, avoid: ['wrists', 'shoulders'], cue: 'Brazos bloqueados, hombros abajo, cuerpo quieto.' },
    { id: 'crow', name: 'Postura del cuervo', kind: 'time', baseSec: 8, avoid: ['wrists'], cue: 'Rodillas sobre los tríceps, inclínate hacia adelante hasta despegar los pies.' },
    { id: 'wall_handstand_skill', name: 'Parada de manos contra la pared', kind: 'time', baseSec: 20, avoid: ['wrists', 'shoulders'], cue: 'Busca una línea recta: muñecas, hombros y cadera alineados.' },
    { id: 'lsit', name: 'L-sit', kind: 'time', baseSec: 8, avoid: ['wrists'], cue: 'Piernas estiradas al frente, paralelas al suelo. Empuja el suelo con las manos.' },
    { id: 'freestanding_hs', name: 'Parada de manos libre (intentos)', kind: 'time', baseSec: 10, avoid: ['wrists', 'shoulders'], cue: 'Patea con suavidad hasta el equilibrio. Sal girando si te pasas.' },
    { id: 'tuck_front_lever', name: 'Front lever encogido', kind: 'time', baseSec: 8, needs: ['bar', 'rings'], avoid: ['shoulders'], cue: 'Colgado, lleva el cuerpo a la horizontal con las rodillas al pecho. Brazos estirados, empuja la barra hacia la cadera.' },
    { id: 'tuck_planche', name: 'Plancha encogida (tuck planche)', kind: 'time', baseSec: 6, avoid: ['wrists', 'shoulders'], cue: 'Manos en el suelo, inclínate hacia adelante y despega los pies con las rodillas recogidas bajo el pecho. Brazos bloqueados.' },
  ],
};

// Ejercicios con TRX (cintas de suspensión), por patrón y de más fácil a más difícil.
// En TRX la dificultad se ajusta con la inclinación del cuerpo: más inclinado = más difícil.
window.TRX_LADDERS = {
  push: [
    { id: 'trx_chest_press_high', name: 'Press de pecho TRX (inclinación suave)', kind: 'reps', needs: ['trx'], cue: 'De espaldas al anclaje, brazos estirados al frente. Baja el pecho entre las manos con el cuerpo recto y empuja.' },
    { id: 'trx_chest_press', name: 'Press de pecho TRX', kind: 'reps', needs: ['trx'], cue: 'Pies más atrás para inclinarte más. Codos a 45°, abdomen firme, no dejes caer la cadera.' },
    { id: 'trx_pushup_feet', name: 'Flexión con pies en el TRX', kind: 'reps', needs: ['trx'], avoid: ['wrists'], cue: 'Empeines en las cintas, manos en el suelo. Cuerpo recto como una tabla durante toda la flexión.' },
    { id: 'trx_atomic_pushup', name: 'Flexión atómica TRX', kind: 'reps', maxReps: 12, needs: ['trx'], avoid: ['wrists', 'back'], cue: 'Haz una flexión y, al subir, lleva las rodillas al pecho. Vuelve a estirar las piernas con control.' },
  ],
  hpull: [
    { id: 'trx_row_high', name: 'Remo TRX (inclinación suave)', kind: 'reps', needs: ['trx'], cue: 'De frente al anclaje, inclínate hacia atrás con el cuerpo recto. Tira de los codos hacia atrás y junta las escápulas.' },
    { id: 'trx_row', name: 'Remo TRX', kind: 'reps', needs: ['trx'], cue: 'Acerca los pies al anclaje para inclinarte más. Pecho a las manos, pausa 1 segundo arriba.' },
    { id: 'trx_row_low', name: 'Remo TRX bajo (cuerpo casi horizontal)', kind: 'reps', needs: ['trx'], cue: 'Camina con los pies hasta quedar bajo el anclaje. Cuerpo recto, sube el pecho hasta las manos.' },
    { id: 'trx_single_row', name: 'Remo TRX a una mano', kind: 'reps', perSide: true, maxReps: 12, needs: ['trx'], cue: 'Junta las dos asas en una mano. Tira sin girar el torso; la otra mano queda libre al costado.' },
  ],
  vpull: [
    { id: 'trx_assisted_pullup', name: 'Dominada asistida TRX', kind: 'reps', needs: ['trx'], cue: 'De rodillas bajo el anclaje, brazos arriba. Tira de las cintas llevando los codos hacia abajo y ayúdate un poco con las piernas.' },
  ],
  dip: [
    { id: 'trx_triceps', name: 'Extensión de tríceps TRX', kind: 'reps', needs: ['trx'], avoid: ['shoulders'], cue: 'De espaldas al anclaje, codos al frente a la altura de la frente. Estira los brazos sin mover los codos.' },
    { id: 'trx_biceps_curl', name: 'Curl de bíceps TRX', kind: 'reps', needs: ['trx'], cue: 'De frente al anclaje, palmas hacia arriba. Dobla los codos llevando las manos a la frente sin bajar los codos.' },
  ],
  vpush: [
    { id: 'trx_y_raise', name: 'Elevaciones en Y TRX', kind: 'reps', needs: ['trx'], avoid: ['shoulders'], cue: 'De frente al anclaje, brazos estirados. Súbelos en forma de Y por encima de la cabeza llevando el cuerpo con ellos.' },
  ],
  squat: [
    { id: 'trx_squat', name: 'Sentadilla asistida TRX', kind: 'reps', needs: ['trx'], cue: 'Sujeta las cintas con los brazos estirados y baja con la espalda recta. Las cintas te dan equilibrio, no tires de ellas.' },
    { id: 'trx_lunge', name: 'Zancada asistida TRX', kind: 'reps', perSide: true, needs: ['trx'], cue: 'Sujetando las cintas, baja la rodilla de atrás hacia el suelo con el torso erguido.' },
    { id: 'trx_suspended_lunge', name: 'Zancada con pie en el TRX', kind: 'reps', perSide: true, needs: ['trx'], avoid: ['knees'], cue: 'Empeine de atrás en la cinta. Baja en vertical y deja que la pierna de atrás se deslice hacia atrás.' },
    { id: 'trx_pistol', name: 'Sentadilla a una pierna con TRX', kind: 'reps', perSide: true, maxReps: 10, needs: ['trx'], avoid: ['knees'], cue: 'Sujeta las cintas y baja sobre una pierna con la otra estirada al frente. Usa los brazos lo justo.' },
  ],
  hinge: [
    { id: 'trx_hip_press', name: 'Puente de glúteo con talones en el TRX', kind: 'reps', needs: ['trx'], cue: 'Boca arriba, talones en las cintas. Sube la cadera apretando los glúteos y baja despacio.' },
    { id: 'trx_hamstring_curl', name: 'Curl femoral TRX', kind: 'reps', maxReps: 15, needs: ['trx'], cue: 'Talones en las cintas y cadera arriba. Dobla las rodillas trayendo los talones a los glúteos sin bajar la cadera.' },
  ],
  core: [
    { id: 'trx_plank', name: 'Plancha con pies en el TRX', kind: 'time', baseSec: 20, needs: ['trx'], cue: 'Antebrazos en el suelo y pies en las cintas. Que las cintas no se balanceen: aprieta abdomen y glúteos.' },
    { id: 'trx_knee_tuck', name: 'Rodillas al pecho TRX', kind: 'reps', needs: ['trx'], avoid: ['wrists'], cue: 'En plancha alta con pies en las cintas, lleva las rodillas al pecho y vuelve a estirar.' },
    { id: 'trx_mountain_climber', name: 'Escaladores TRX', kind: 'reps', perSide: true, needs: ['trx'], avoid: ['wrists'], cue: 'En plancha alta con pies en las cintas, alterna una rodilla y la otra al pecho con la cadera estable.' },
    { id: 'trx_pike', name: 'Pike TRX', kind: 'reps', maxReps: 12, needs: ['trx'], avoid: ['wrists', 'back'], cue: 'Desde plancha alta, sube la cadera con las piernas estiradas hasta formar una V invertida.' },
    { id: 'trx_body_saw', name: 'Serrucho TRX (body saw)', kind: 'reps', maxReps: 15, needs: ['trx'], avoid: ['back'], cue: 'En plancha de antebrazos con pies en las cintas, empuja el cuerpo hacia atrás y adelante unos centímetros.' },
  ],
};

// Máquina multiestación (poleas y pila de pesas). La carga se elige para llegar justo a las repeticiones.
// Ejercicios pensados para la multiestación Bodytone de una torre (polea alta con barra de jalón,
// mariposa/contractor de pecho con brazos acolchados y asas de press, asiento con respaldo,
// rodillos para piernas y polea baja). Sirven para cualquier multiestación casera similar.
window.GYM_LADDERS = {
  vpull: [
    { id: 'lat_pulldown', st: 'alta', name: 'Jalón al pecho (barra alta)', kind: 'reps', needs: ['gym'], cue: 'Sentado de frente a la máquina con los muslos bajo los rodillos. Agarra la barra larga por los extremos curvos y llévala a la parte alta del pecho, codos abajo y atrás.' },
    { id: 'bt_close_pulldown', st: 'alta', name: 'Jalón con agarre cerrado y supino', kind: 'reps', needs: ['gym'], cue: 'Mismo asiento que el jalón, pero con las palmas hacia ti y las manos a la anchura de los hombros. Más trabajo de bíceps y dorsal bajo.' },
    { id: 'bt_wide_pulldown', st: 'alta', name: 'Jalón con agarre ancho', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'Agarra la barra justo donde empieza la curva, más abierto que los hombros. Baja la barra al pecho sacando pecho y sin balancearte.' },
    { id: 'bt_straight_arm_pulldown', st: 'alta', name: 'Pullover de pie en polea alta', kind: 'reps', needs: ['gym'], cue: 'De pie frente a la polea alta, tronco algo inclinado. Con los brazos casi estirados, baja la barra en arco hasta los muslos. Aísla el dorsal.' },
  ],
  hpull: [
    { id: 'cable_row', st: 'baja', name: 'Remo bajo sentado en polea baja', kind: 'reps', needs: ['gym'], cue: 'Engancha la barra corta en la polea baja. Sentado en el suelo con los pies apoyados en la base, tira hacia el ombligo juntando las escápulas.' },
    { id: 'bt_one_arm_row', st: 'baja', name: 'Remo a una mano en polea baja', kind: 'reps', perSide: true, needs: ['gym'], cue: 'Un pie adelantado y la mano libre en la rodilla. Tira del agarre hacia la cadera sin girar el tronco.' },
    { id: 'bt_face_pull', st: 'alta', name: 'Face pull en polea alta', kind: 'reps', needs: ['gym'], cue: 'Polea alta con cuerda o barra. Tira hacia la cara abriendo los codos a la altura de los hombros. Ideal para postura y hombro posterior.' },
    { id: 'bt_reverse_fly', st: 'mariposa', name: 'Pájaro invertido en la mariposa', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'Siéntate mirando al respaldo, pecho apoyado. Con los brazos casi estirados, abre hacia atrás juntando las escápulas. Trabaja el hombro posterior.' },
    { id: 'bt_upright_row', st: 'baja', name: 'Remo al mentón en polea baja', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'De pie frente a la polea baja, agarre estrecho. Sube la barra pegada al cuerpo hasta el pecho con los codos por encima de las manos.' },
  ],
  push: [
    { id: 'machine_chest_press', st: 'mariposa', name: 'Press de pecho (asas de la mariposa)', kind: 'reps', needs: ['gym'], cue: 'Espalda pegada al respaldo, agarra las asas bajas en L y empújalas al frente sin bloquear del todo los codos. Vuelve despacio.' },
    { id: 'bt_pec_deck', st: 'mariposa', name: 'Contractor de pecho (mariposa)', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'Antebrazos y codos apoyados en los acolchados verticales, codos a la altura de los hombros. Junta los brazos delante del pecho y abre lento.' },
    { id: 'bt_single_press', st: 'mariposa', name: 'Press de pecho a una mano', kind: 'reps', perSide: true, needs: ['gym'], cue: 'Igual que el press, pero empujando con un brazo cada vez. Corrige diferencias de fuerza entre lados. Mantén la espalda pegada.' },
    { id: 'bt_seat_incline_pushup', st: 'asiento', name: 'Flexión inclinada en el asiento', kind: 'reps', needs: ['gym'], cue: 'Manos en el borde del asiento de la máquina, cuerpo recto. Baja el pecho al asiento y empuja. Comprueba que la máquina no se mueva.' },
  ],
  vpush: [
    { id: 'bt_front_raise', st: 'baja', name: 'Elevación frontal en polea baja', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'De espaldas a la polea baja con el agarre entre las piernas. Sube los brazos estirados al frente hasta la altura de los hombros.' },
    { id: 'bt_lateral_raise', st: 'baja', name: 'Elevación lateral a una mano en polea baja', kind: 'reps', perSide: true, needs: ['gym'], avoid: ['shoulders'], cue: 'De costado a la polea, agarre con la mano más lejana. Sube el brazo hacia el lado hasta la altura del hombro, codo apenas flexionado.' },
  ],
  squat: [
    { id: 'leg_extension', st: 'rodillos', name: 'Extensión de cuádriceps (rodillos)', kind: 'reps', needs: ['gym'], cue: 'Sentado al borde del asiento, rodillos sobre los empeines. Estira las piernas hasta casi bloquear y baja en 2 segundos.' },
    { id: 'bt_single_leg_ext', st: 'rodillos', name: 'Extensión de cuádriceps a una pierna', kind: 'reps', perSide: true, needs: ['gym'], avoid: ['knees'], cue: 'Como la extensión normal, pero con una pierna. Útil si una pierna es más débil. Pausa 1 segundo arriba.' },
    { id: 'bt_cable_squat', st: 'baja', name: 'Sentadilla con polea baja', kind: 'reps', needs: ['gym'], cue: 'De frente a la polea baja, agarre a la altura del pecho. Baja en sentadilla dejando que el cable te ayude a mantener el pecho arriba.' },
    { id: 'bt_seat_bulgarian', st: 'asiento', name: 'Sentadilla búlgara con pie en el asiento', kind: 'reps', perSide: true, needs: ['gym'], avoid: ['knees'], cue: 'De espaldas a la máquina, empeine de atrás sobre el asiento. Baja en vertical con el torso algo inclinado.' },
  ],
  hinge: [
    { id: 'bt_standing_leg_curl', st: 'rodillos', name: 'Curl femoral de pie (rodillo)', kind: 'reps', perSide: true, needs: ['gym'], cue: 'De pie frente a la máquina, sujétate del marco. Con el rodillo detrás del tobillo, lleva el talón hacia el glúteo sin mover la rodilla.' },
    { id: 'leg_curl', st: 'rodillos', name: 'Curl femoral tumbado', kind: 'reps', needs: ['gym'], cue: 'Boca abajo en el asiento, rodillo sobre los talones. Lleva los talones hacia los glúteos sin despegar la cadera.' },
    { id: 'bt_kickback', st: 'baja', name: 'Patada de glúteo en polea baja', kind: 'reps', perSide: true, needs: ['gym'], cue: 'Tobillera o agarre en el pie, mirando a la máquina. Lleva la pierna estirada hacia atrás apretando el glúteo, sin arquear la espalda.' },
    { id: 'bt_pull_through', st: 'baja', name: 'Pull-through en polea baja', kind: 'reps', needs: ['gym'], cue: 'De espaldas a la polea baja, cuerda entre las piernas. Lleva la cadera atrás con la espalda recta y sube empujando con los glúteos.' },
  ],
  dip: [
    { id: 'triceps_pushdown', st: 'alta', name: 'Extensión de tríceps en polea alta', kind: 'reps', needs: ['gym'], cue: 'De pie frente a la polea alta, codos pegados al cuerpo. Empuja la barra hacia abajo hasta estirar los brazos.' },
    { id: 'bt_reverse_pushdown', st: 'alta', name: 'Tríceps en polea alta con agarre supino', kind: 'reps', needs: ['gym'], cue: 'Palmas hacia arriba y codos pegados. Estira los brazos hacia abajo; trabaja la cabeza medial del tríceps.' },
    { id: 'bt_overhead_triceps', st: 'alta', name: 'Extensión de tríceps sobre la cabeza', kind: 'reps', needs: ['gym'], avoid: ['shoulders'], cue: 'De espaldas a la polea alta, un pie adelante. Con las manos detrás de la cabeza, estira los brazos al frente y arriba sin mover los codos.' },
    { id: 'cable_curl', st: 'baja', name: 'Curl de bíceps en polea baja', kind: 'reps', needs: ['gym'], cue: 'De pie frente a la polea baja, codos quietos a los costados. Sube el agarre hasta los hombros y baja lento.' },
    { id: 'bt_reverse_curl', st: 'baja', name: 'Curl inverso en polea baja (antebrazo)', kind: 'reps', needs: ['gym'], cue: 'Como el curl, pero con las palmas hacia abajo. Trabaja antebrazos y braquial; usa menos peso.' },
    { id: 'bt_seat_dip', st: 'asiento', name: 'Fondos en el asiento de la máquina', kind: 'reps', needs: ['gym'], avoid: ['shoulders', 'wrists'], cue: 'Manos en el borde del asiento, piernas al frente. Baja doblando los codos hasta 90° y empuja.' },
  ],
  core: [
    { id: 'bt_cable_crunch', st: 'alta', name: 'Abdominal en polea alta de rodillas', kind: 'reps', needs: ['gym'], avoid: ['back'], cue: 'De rodillas frente a la máquina, sujeta la barra o cuerda junto a la cabeza. Enrolla el tronco llevando los codos hacia los muslos; la cadera no se mueve.' },
    { id: 'bt_woodchop_high', st: 'alta', name: 'Leñador de arriba abajo (polea alta)', kind: 'reps', perSide: true, needs: ['gym'], cue: 'De costado a la polea alta. Con los brazos estirados, lleva el agarre en diagonal hasta la cadera contraria girando el tronco.' },
    { id: 'bt_low_woodchop', st: 'baja', name: 'Leñador de abajo arriba (polea baja)', kind: 'reps', perSide: true, needs: ['gym'], cue: 'De costado a la polea baja. Lleva el agarre en diagonal desde la rodilla hasta por encima del hombro contrario.' },
    { id: 'bt_situp_rollers', st: 'rodillos', name: 'Abdominal con pies bajo los rodillos', kind: 'reps', needs: ['gym'], avoid: ['back'], cue: 'Sentado al borde del asiento con los pies enganchados bajo los rodillos. Échate atrás controlando y sube contrayendo el abdomen.' },
  ],
};
// Estaciones de la multiestación, para agrupar los ejercicios en la biblioteca
window.GYM_STATIONS = [
  ['alta', '⬆️ Polea alta (barra de jalón)'], ['baja', '⬇️ Polea baja'], ['mariposa', '🦋 Mariposa y press de pecho'],
  ['rodillos', '🦵 Rodillos de piernas'], ['asiento', '🪑 Asiento (peso corporal)'],
];


// Mancuernas (sirven también para kettlebell). Elige un peso con el que llegues justo a las repeticiones.
window.DB_LADDERS = {
  squat: [
    { id: 'goblet_squat', name: 'Sentadilla goblet con mancuerna', kind: 'reps', needs: ['dumbbells'], cue: 'Sujeta la mancuerna pegada al pecho. Baja con el pecho arriba y los codos entre las rodillas.' },
    { id: 'db_lunge', name: 'Zancada con mancuernas', kind: 'reps', perSide: true, needs: ['dumbbells'], avoid: ['knees'], cue: 'Una mancuerna en cada mano, da un paso atrás y baja la rodilla hacia el suelo con el torso erguido.' },
  ],
  hinge: [{ id: 'db_rdl', name: 'Peso muerto rumano con mancuernas', kind: 'reps', needs: ['dumbbells'], cue: 'Mancuernas pegadas a los muslos, lleva la cadera atrás con la espalda recta hasta media pierna y sube apretando glúteos.' }],
  hpull: [{ id: 'db_row', name: 'Remo inclinado con mancuernas', kind: 'reps', needs: ['dumbbells'], cue: 'Tronco inclinado y espalda recta. Tira de las mancuernas hacia la cadera juntando las escápulas.' }],
  push: [{ id: 'db_floor_press', name: 'Press de pecho en el suelo con mancuernas', kind: 'reps', needs: ['dumbbells'], cue: 'Boca arriba, baja las mancuernas hasta que los codos toquen el suelo y empuja hacia el techo.' }],
  vpush: [{ id: 'db_shoulder_press', name: 'Press de hombros con mancuernas', kind: 'reps', needs: ['dumbbells'], avoid: ['shoulders'], cue: 'De pie, empuja las mancuernas desde los hombros hasta arriba sin arquear la espalda.' }],
  dip: [{ id: 'db_curl', name: 'Curl de bíceps con mancuernas', kind: 'reps', needs: ['dumbbells'], cue: 'Codos pegados al cuerpo, sube las mancuernas hasta los hombros y baja en 2 segundos.' }],
};

// Máquinas de cardio: se usan para calentar y para los intervalos del final.
window.CARDIO_MACHINES = {
  bike: { name: 'Bicicleta estática', cue: 'Ajusta el sillín a la altura de la cadera. En los tramos fuertes sube la resistencia o la cadencia.' },
  treadmill: { name: 'Caminadora', cue: 'Camina rápido o trota. En los tramos fuertes sube la velocidad o la inclinación.' },
  elliptical: { name: 'Elíptica', cue: 'Espalda erguida, empuja y tira de los brazos. En los tramos fuertes sube la resistencia.' },
  jumprope: { name: 'Cuerda para saltar', cue: 'Saltos pequeños sobre la punta de los pies, codos cerca del cuerpo y giro con las muñecas.' },
};

// Variantes de TRX que no son progresión (se usan para dar variedad cuando un patrón se repite).
window.TRX_ALTERNATES = {
  push: [
    { id: 'trx_fly', name: 'Aperturas de pecho TRX', kind: 'reps', needs: ['trx'], avoid: ['shoulders'], cue: 'Brazos casi estirados, abre hacia los lados como un abrazo grande y vuelve juntando las manos.' },
  ],
  hpull: [
    { id: 'trx_face_pull', name: 'Face pull TRX', kind: 'reps', needs: ['trx'], cue: 'Tira de las cintas hacia la cara con los codos altos. Trabaja la espalda alta y los hombros posteriores.' },
    { id: 'trx_power_pull', name: 'Remo con giro TRX (power pull)', kind: 'reps', perSide: true, needs: ['trx'], cue: 'Con una mano, tira y gira el torso hacia el anclaje; el brazo libre se abre hacia atrás al bajar.' },
    { id: 'trx_high_row', name: 'Remo alto TRX', kind: 'reps', needs: ['trx'], cue: 'Palmas hacia abajo y codos a la altura de los hombros. Tira abriendo los codos y junta las escápulas.' },
  ],
  vpush: [
    { id: 'trx_t_fly', name: 'Aperturas en T TRX (deltoides)', kind: 'reps', needs: ['trx'], avoid: ['shoulders'], cue: 'De frente al anclaje, brazos estirados. Ábrelos en cruz hasta formar una T llevando el cuerpo con ellos.' },
  ],
  squat: [
    { id: 'trx_squat_jump', name: 'Sentadilla con salto TRX', kind: 'reps', needs: ['trx'], avoid: ['knees'], cue: 'Sujeta las cintas, baja en sentadilla y salta. Aterriza suave y vuelve a bajar.' },
    { id: 'trx_crossing_lunge', name: 'Zancada cruzada TRX', kind: 'reps', perSide: true, needs: ['trx'], cue: 'Sujetando las cintas, cruza una pierna por detrás en diagonal y baja. Trabaja glúteo medio y equilibrio.' },
  ],
  hinge: [
    { id: 'trx_hamstring_runner', name: 'Curl femoral alterno TRX', kind: 'reps', perSide: true, needs: ['trx'], cue: 'Con la cadera arriba y talones en las cintas, recoge una pierna mientras estiras la otra, como si corrieras.' },
    { id: 'trx_sl_hip_press', name: 'Puente a una pierna TRX', kind: 'reps', perSide: true, needs: ['trx'], cue: 'Un talón en la cinta y la otra pierna arriba. Sube la cadera sin que se incline hacia un lado.' },
  ],
  core: [
    { id: 'trx_side_plank', name: 'Plancha lateral TRX', kind: 'time', baseSec: 15, perSide: true, needs: ['trx'], cue: 'Pies apilados en las cintas y antebrazo en el suelo. Cadera alta, cuerpo en línea.' },
    { id: 'trx_oblique_crunch', name: 'Rodillas cruzadas TRX', kind: 'reps', perSide: true, needs: ['trx'], avoid: ['wrists'], cue: 'En plancha alta con pies en las cintas, lleva las rodillas hacia un codo y luego hacia el otro.' },
    { id: 'trx_rollout', name: 'Rollout TRX', kind: 'reps', maxReps: 12, needs: ['trx'], avoid: ['back', 'shoulders'], cue: 'De espaldas al anclaje, brazos estirados. Inclínate llevando los brazos por encima de la cabeza sin arquear la espalda.' },
  ],
};

// Variantes extra de nivel bajo, usadas cuando un patrón se repite en el mismo día y la escalera no da más opciones.
window.EXERCISE_ALTERNATES = {
  squat: [
    { id: 'wall_sit', name: 'Sentadilla isométrica en la pared', kind: 'time', baseSec: 25, cue: 'Espalda apoyada en la pared, rodillas a 90° o menos si molesta. Respira.' },
    { id: 'calf_raise', name: 'Elevación de talones', kind: 'reps', cue: 'De pie, sube a la punta de los pies y baja lento. Apóyate en la pared si lo necesitas.' },
    { id: 'sumo_squat', name: 'Sentadilla sumo', kind: 'reps', cue: 'Pies muy abiertos y puntas hacia afuera. Baja con el pecho arriba empujando las rodillas hacia afuera.' },
    { id: 'step_up', name: 'Subida al banco (step-up)', kind: 'reps', perSide: true, cue: 'Apoya un pie entero en un banco firme y sube empujando con ese talón. Baja con control.' },
    { id: 'sissy_squat', name: 'Sentadilla sissy', kind: 'reps', maxReps: 12, avoid: ['knees'], cue: 'De puntillas, lleva las rodillas adelante y el cuerpo hacia atrás en línea recta. Apóyate en algo si lo necesitas.' },
  ],
  hinge: [
    { id: 'quadruped_kickback', name: 'Patada de glúteo en cuadrupedia', kind: 'reps', perSide: true, cue: 'En cuatro apoyos, empuja un talón hacia el techo sin arquear la espalda.' },
    { id: 'side_lying_abduction', name: 'Abducción de cadera tumbado/a', kind: 'reps', perSide: true, cue: 'De lado, sube la pierna de arriba recta, sin rotar la cadera.' },
    { id: 'good_morning', name: 'Buenos días con peso corporal', kind: 'reps', cue: 'Manos detrás de la cabeza. Lleva la cadera atrás con la espalda recta hasta sentir los isquiotibiales y vuelve.' },
    { id: 'sl_rdl', name: 'Peso muerto a una pierna', kind: 'reps', perSide: true, cue: 'Sobre una pierna, inclina el tronco mientras la otra pierna sube atrás. Cadera nivelada y espalda recta.' },
    { id: 'frog_pump', name: 'Puente de rana', kind: 'reps', cue: 'Boca arriba con las plantas de los pies juntas y rodillas abiertas. Sube la cadera apretando glúteos.' },
  ],
  core: [
    { id: 'bird_dog', name: 'Bird dog', kind: 'reps', perSide: true, cue: 'En cuatro apoyos, estira el brazo y la pierna contrarios manteniendo la espalda quieta.' },
    { id: 'reverse_crunch', name: 'Encogimiento inverso', kind: 'reps', avoid: ['back'], cue: 'Boca arriba, lleva las rodillas al pecho despegando ligeramente la cadera.' },
    { id: 'crunch', name: 'Abdominal (crunch)', kind: 'reps', cue: 'Boca arriba con rodillas dobladas. Despega los hombros del suelo contrayendo el abdomen, sin tirar del cuello.' },
    { id: 'bicycle_crunch', name: 'Bicicleta', kind: 'reps', perSide: true, cue: 'Hombros despegados, lleva un codo hacia la rodilla contraria mientras estiras la otra pierna. Alterna.' },
    { id: 'leg_raise_floor', name: 'Elevación de piernas tumbado', kind: 'reps', avoid: ['back'], cue: 'Boca arriba, sube las piernas estiradas hasta la vertical y bájalas sin que la zona lumbar se despegue.' },
    { id: 'v_up', name: 'V-up', kind: 'reps', maxReps: 15, avoid: ['back'], cue: 'Desde tumbado, sube brazos y piernas a la vez hasta tocarte los pies formando una V.' },
    { id: 'hollow_rock', name: 'Balanceo hollow', kind: 'reps', avoid: ['back'], cue: 'En posición hollow, balancéate adelante y atrás como una mecedora sin perder la forma.' },
  ],
  push: [
    { id: 'pushup_pause', name: 'Flexión con pausa abajo', kind: 'reps', maxReps: 12, cue: 'Tu variante de flexión habitual, con 2 segundos de pausa abajo.' },
    { id: 'wide_pushup', name: 'Flexión abierta', kind: 'reps', cue: 'Manos más abiertas que los hombros. Más trabajo de pecho; baja con el cuerpo recto.' },
    { id: 'hindu_pushup', name: 'Flexión hindú', kind: 'reps', maxReps: 15, avoid: ['back', 'wrists'], cue: 'Desde la V invertida, baja el pecho rozando el suelo hacia adelante hasta la cobra y vuelve empujando la cadera atrás.' },
    { id: 'spiderman_pushup', name: 'Flexión spiderman', kind: 'reps', perSide: true, maxReps: 12, cue: 'Al bajar, lleva una rodilla hacia el codo del mismo lado. Alterna en cada repetición.' },
  ],
  hpull: [
    { id: 'superman', name: 'Superman', kind: 'reps', avoid: ['back'], cue: 'Boca abajo, despega brazos y pecho del suelo apretando la espalda alta.' },
  ],
  vpush: [
    { id: 'wall_walk', name: 'Subida a la pared (wall walk)', kind: 'reps', maxReps: 6, avoid: ['shoulders', 'wrists'], cue: 'Desde plancha con los pies junto a la pared, sube los pies por la pared mientras acercas las manos. Baja igual de lento.' },
  ],
  dip: [
    { id: 'straight_bar_dip', name: 'Fondos en barra recta', kind: 'reps', maxReps: 12, needs: ['bar'], avoid: ['shoulders', 'wrists'], cue: 'Apoyado sobre una barra con el cuerpo por delante, baja hasta que la barra toque el pecho y empuja.' },
  ],
  vpull: [
    { id: 'wide_pullup', name: 'Dominada abierta', kind: 'reps', maxReps: 8, needs: ['bar'], avoid: ['shoulders'], cue: 'Agarre más abierto que los hombros. Lleva el pecho a la barra pensando en los codos hacia abajo.' },
    { id: 'l_pullup', name: 'Dominada en L', kind: 'reps', maxReps: 8, needs: ['bar', 'rings'], avoid: ['back'], cue: 'Mantén las piernas estiradas al frente en L mientras haces la dominada. Trabaja también el abdomen.' },
    { id: 'typewriter_pullup', name: 'Dominada máquina de escribir', kind: 'reps', perSide: true, maxReps: 6, needs: ['bar'], avoid: ['shoulders'], cue: 'Sube con agarre ancho y desplázate de una mano a la otra por encima de la barra antes de bajar.' },
  ],
};

// Ejercicio de reemplazo cuando una escalera completa queda descartada por molestias o falta de equipo.
window.PATTERN_FALLBACK = { vpull: 'hpull', dip: 'push', vpush: 'push', skill: 'core' };

window.CONDITIONING = {
  low: [
    { name: 'Marcha con rodillas altas', cue: 'Sin saltar. Sube las rodillas a la altura de la cadera.' },
    { name: 'Boxeo de sombra', cue: 'Golpes rápidos al aire con los pies en movimiento.' },
    { name: 'Escaladores lentos', cue: 'En plancha alta, lleva una rodilla al pecho y luego la otra.' },
    { name: 'Gateo de oso', cue: 'En cuatro apoyos con las rodillas a un palmo del suelo, avanza moviendo mano y pie contrarios.' },
    { name: 'Gusano (inchworm)', cue: 'De pie, baja las manos al suelo, camina con ellas hasta plancha y vuelve caminando.' },
  ],
  high: [
    { name: 'Jumping jacks', cue: 'Saltos abriendo brazos y piernas. Aterriza suave.' },
    { name: 'Escaladores', cue: 'En plancha alta, alterna las rodillas al pecho rápido.' },
    { name: 'Burpees', cue: 'Al suelo, flexión opcional, vuelve arriba y salta.' },
    { name: 'Sentadilla con salto', cue: 'Sentadilla y salto explosivo. Aterriza con las rodillas flexionadas.' },
    { name: 'Rodillas altas', cue: 'Corre en el sitio subiendo las rodillas a la altura de la cadera, braceando.' },
  ],
};

window.WARMUP = [
  { name: 'Círculos de brazos', dose: '20 s por sentido' },
  { name: 'Rotaciones de muñecas', dose: '20 s' },
  { name: 'Gato-camello', dose: '8 repeticiones' },
  { name: 'Sentadilla con pausa abajo', dose: '8 repeticiones' },
  { name: 'Marcha en el sitio', dose: '45 s' },
];

window.COOLDOWN = [
  { name: 'Estiramiento de pecho en la pared', dose: '30 s por lado' },
  { name: 'Estiramiento de dorsales (manos en la pared)', dose: '30 s' },
  { name: 'Estiramiento de cuádriceps de pie', dose: '30 s por lado' },
  { name: 'Estiramiento de isquiotibiales sentado/a', dose: '30 s' },
  { name: 'Postura del niño', dose: '45 s' },
  { name: 'Estocada profunda (flexor de cadera)', dose: '30 s por lado' },
];
