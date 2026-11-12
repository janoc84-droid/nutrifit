// Instrucciones y formato de respuesta de la IA de Nutrifit, en un solo lugar. Los usan:
//   - la app (js/ia.js) para hablar directo con Gemini,
//   - el programa de Google Drive (nube/Code.gs, armado por scripts/preparar-nube.mjs) para Claude en la nube,
//   - el PC (analizar-plato.mjs) para Claude con la suscripción.
// Los esquemas se escriben una vez (formato propio, simple) y se traducen al formato de Gemini y al de Claude.
(function (root) {
  const ITEMS = '{"plato": string, "items": [{"nombre": string, "gramos": number|null, "ml": number|null, "kcal": number, "proteina": number, "carbohidratos": number, "grasa": number, "fibra": number}], "total_kcal": number, "confianza": "alta"|"media"|"baja", "nota": string}';

  const plato = `Eres nutricionista en Chile. Recibes la foto de una comida y estimas lo que se ve.
Reglas:
- Identifica cada alimento o bebida visible (usa nombres comunes en Chile: marraqueta, palta, porotos, cazuela, bebida, etc.).
- Separa los ingredientes que se distinguen (por ejemplo, en una cazuela: carne, papa, zapallo, choclo, caldo). No inventes ingredientes que no se ven; si dudas de uno, dilo en "nota".
- Fíjate en aliños y salsas (aceite, limón, mayonesa, pebre): inclúyelos solo si se notan.
- Estima la cantidad por pistas visuales (tamaño del plato, cubiertos, mano, envases). Sólidos en gramos; líquidos en ml.
- Calcula calorías y macronutrientes con valores típicos. Si algo es dudoso, elige el valor más probable y dilo en "nota".
- Es una estimación aproximada para llevar la cuenta del día, no tiene que ser exacta.
- Si la foto no muestra comida, devuelve "items": [] y explica en "nota".
Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta:
${ITEMS}`;

  const texto = `Eres nutricionista en Chile. Te escriben un alimento, producto o plato (puede ser de una marca chilena:
Líder, Jumbo, Unimarc, Tottus, Colun, Soprole, Carozzi, McKay, Costa, etc.) y cuánto comieron.
Reglas:
- Si es un producto de marca, usa los valores típicos de su etiqueta nutricional en Chile (por 100 g o 100 ml) y calcula la cantidad que comieron.
- Si dicen unidades (ej: "3 galletas", "1 taza", "2 rebanadas", "1 lata"), conviértelas a gramos o ml con el peso típico de esa unidad.
- Si no dicen la cantidad, usa una porción normal y dilo en "nota".
- Si mencionan varias cosas, separa cada una en "items".
- En "nombre" pon solo el alimento (con la marca si la dijeron), sin la cantidad.
- Es una estimación para llevar la cuenta del día, no tiene que ser exacta.
Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta:
${ITEMS}`;

  const etiqueta = `Lees etiquetas de alimentos de Chile. Recibes la foto de la tabla "Información nutricional" de un envase.
Reglas:
- Copia los valores tal como aparecen. Si la tabla trae columnas "100 g" (o "100 ml") y "1 porción", usa la de 100 g/100 ml.
- Si solo trae la porción, convierte a 100 g/ml con el tamaño de la porción.
- La energía puede venir en kcal o kJ: usa kcal (1 kcal = 4,184 kJ).
- Colesterol y sodio van en mg. El resto, en g.
- "Hidratos de carbono disponibles" o "carbohidratos" va en carbohidratos; "azúcares totales" va en azucares.
- Si un campo no aparece en la etiqueta, pon null (no lo inventes).
- Anota los sellos negros "ALTO EN ..." si se ven (azúcares, grasas saturadas, sodio, calorías), con el texto bien escrito.
- Cualquier otro dato de la tabla que no tenga campo propio (vitaminas, minerales como calcio, hierro o potasio, lactosa,
  polioles, cafeína, omega 3, etc.) va en "otros", con su nombre tal como aparece, su valor por 100 g/ml y su unidad.
- Si te dicen cuánto comieron (ej: "3 galletas", "1 paquete", "media taza"), conviértelo a gramos o ml con la porción de la etiqueta; si no, consumo es null.
- Si la foto no es una tabla nutricional o no se lee, pon "por100": null y explica en "nota".
Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"nombre": string, "liquido": boolean, "porcion": {"cantidad": number|null, "unidad": "g"|"ml", "texto": string}, "porciones_envase": number|null,
"por100": {"kcal": number, "proteina": number|null, "grasa_total": number|null, "grasa_saturada": number|null, "grasa_mono": number|null, "grasa_poli": number|null, "grasa_trans": number|null, "colesterol_mg": number|null, "carbohidratos": number|null, "azucares": number|null, "fibra": number|null, "sodio_mg": number|null} | null,
"otros": [{"nombre": string, "por100": number, "unidad": string}], "sellos": [string], "consumo": {"gramos": number|null, "ml": number|null} | null, "confianza": "alta"|"media"|"baja", "nota": string}`;

  // ---------- Esquemas (formato propio) ----------
  // { t: 'obj'|'arr'|'str'|'num'|'bool', nulo?: true, p?: {campo: esquema}, de?: esquema, enum?: [...] }
  const N = (nulo) => ({ t: 'num', nulo });
  const S = (en) => (en ? { t: 'str', enum: en } : { t: 'str' });
  const CONF = S(['alta', 'media', 'baja']);
  const items = {
    t: 'obj', p: {
      plato: S(), items: { t: 'arr', de: { t: 'obj', p: { nombre: S(), gramos: N(true), ml: N(true), kcal: N(), proteina: N(), carbohidratos: N(), grasa: N(), fibra: N() } } },
      total_kcal: N(), confianza: CONF, nota: S(),
    },
  };
  const etiq = {
    t: 'obj', p: {
      nombre: S(), liquido: { t: 'bool' },
      porcion: { t: 'obj', p: { cantidad: N(true), unidad: S(['g', 'ml']), texto: S() } },
      porciones_envase: N(true),
      por100: { t: 'obj', nulo: true, p: { kcal: N(), proteina: N(true), grasa_total: N(true), grasa_saturada: N(true), grasa_mono: N(true), grasa_poli: N(true), grasa_trans: N(true), colesterol_mg: N(true), carbohidratos: N(true), azucares: N(true), fibra: N(true), sodio_mg: N(true) } },
      otros: { t: 'arr', de: { t: 'obj', p: { nombre: S(), por100: N(), unidad: S() } } },
      sellos: { t: 'arr', de: S() },
      consumo: { t: 'obj', nulo: true, p: { gramos: N(true), ml: N(true) } },
      confianza: CONF, nota: S(),
    },
  };

  // Gemini (responseSchema, estilo OpenAPI): tipos en mayúsculas y "nullable".
  function aGemini(s) {
    const T = { obj: 'OBJECT', arr: 'ARRAY', str: 'STRING', num: 'NUMBER', bool: 'BOOLEAN' }[s.t];
    const o = { type: T };
    if (s.nulo) o.nullable = true;
    if (s.enum) o.enum = s.enum;
    if (s.t === 'arr') o.items = aGemini(s.de);
    if (s.t === 'obj') { o.properties = {}; for (const [k, v] of Object.entries(s.p)) o.properties[k] = aGemini(v); o.required = Object.keys(s.p); }
    return o;
  }
  // Claude (output_config.format json_schema): todos los campos obligatorios, sin campos extra; lo que puede faltar, anyOf con null.
  function aClaude(s) {
    let o;
    if (s.t === 'obj') { o = { type: 'object', properties: {}, required: Object.keys(s.p), additionalProperties: false }; for (const [k, v] of Object.entries(s.p)) o.properties[k] = aClaude(v); }
    else if (s.t === 'arr') o = { type: 'array', items: aClaude(s.de) };
    else o = { type: { str: 'string', num: 'number', bool: 'boolean' }[s.t] };
    if (s.enum) o.enum = s.enum;
    return s.nulo ? { anyOf: [o, { type: 'null' }] } : o;
  }

  root.IA_DEF = {
    instrucciones: { plato, texto, etiqueta },
    esquemas: { plato: items, texto: items, etiqueta: etiq },
    aGemini, aClaude,
  };
})(typeof window !== 'undefined' ? window : globalThis);
