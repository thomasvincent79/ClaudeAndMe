/* ¡Vamos! — contenu du jeu.
   Tout le contenu pédagogique est ici : on peut ajouter une unité sans toucher au moteur (engine.js).
   Types d'éléments :
     W  mot / expression        P  phrase            G  phrase à trous (grammaire)
     D  mini-dialogue           T  gabarit de phrases (génère des combinaisons)
     CJ verbe à conjuguer       N  nombres (générés au hasard)
   Les identifiants sont calculés à partir du texte espagnol : corriger une faute de frappe
   réinitialise seulement l'élément concerné. */
(function () {
  const W = (es, fr, e, x) => Object.assign({ k: 'w', es, fr, e }, x);
  const P = (es, fr, x) => Object.assign({ k: 'p', es, fr }, x);
  const G = (s, a, o, fr, x) => Object.assign({ k: 'g', s, a, o, fr }, x);
  const D = (ctx, npc, fr, a, o, x) => Object.assign({ k: 'd', ctx, npc, fr, a, o }, x);
  const T = (es, fr, slots) => ({ k: 't', es, fr, slots });
  const CJ = (verb) => ({ k: 'c', verb });
  const N = (min, max) => ({ k: 'n', min, max });

  const verbs = {
    ser:       { fr: 'être',            f: ['soy', 'eres', 'es', 'somos', 'sois', 'son'] },
    estar:     { fr: 'être (état, lieu)', f: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'] },
    hablar:    { fr: 'parler',          f: ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'] },
    comprar:   { fr: 'acheter',         f: ['compro', 'compras', 'compra', 'compramos', 'compráis', 'compran'] },
    querer:    { fr: 'vouloir',         f: ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren'] },
    comer:     { fr: 'manger',          f: ['como', 'comes', 'come', 'comemos', 'coméis', 'comen'] },
    beber:     { fr: 'boire',           f: ['bebo', 'bebes', 'bebe', 'bebemos', 'bebéis', 'beben'] },
    vivir:     { fr: 'vivre / habiter', f: ['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven'] },
    tener:     { fr: 'avoir',           f: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'] },
  };

  /* ------------------------------------------------------------------ UNITÉ 1 */
  const u1 = {
    id: 'u1', e: '🛬', color: '#c8102e', dark: '#8f0b21',
    city: 'Madrid', cityFr: 'Madrid', region: 'Comunidad de Madrid', lon: -3.70, lat: 40.42, guide: 'lola',
    hello: { es: '¡Bienvenido a Madrid! Soy Lola, chulapa del barrio de Lavapiés.', fr: 'Bienvenue à Madrid ! Je suis Lola, chulapa du quartier de Lavapiés.' },
    costume: 'Foulard blanc, œillet rouge et châle de Manille : le costume de chulapa se porte pour la fête de San Isidro, en mai.',
    title: 'Llegada a Madrid', fr: 'Arrivée à Madrid : saluer, se présenter, se repérer en ville',
    levels: [
      {
        id: 'u1l1', type: 'lesson', title: 'Saludos', fr: 'Saluer et remercier',
        tip: `<h3>Saluer en espagnol</h3>
<table><tr><th>buenos días</th><td>du matin jusqu’au déjeuner (vers 14 h)</td></tr>
<tr><th>buenas tardes</th><td>après le déjeuner, jusqu’à la nuit (vers 21 h)</td></tr>
<tr><th>buenas noches</th><td>le soir tard, et pour se quitter la nuit</td></tr></table>
<p><b>Ponctuation</b> : les questions et exclamations s’ouvrent par un signe à l’envers — <b>¿</b>Qué tal<b>?</b> · <b>¡</b>Hola<b>!</b></p>
<p><b>Tú ou usted ?</b> <i>tú</i> = tu, <i>usted</i> = vous de politesse. En Espagne, on passe très vite au <i>tú</i>.</p>
<p><b>Prononciation</b> : <i>h</i> muet (hola = « ola ») · <i>ll</i> ≈ « y » · <i>ñ</i> = « gn » · <i>j</i> = « r » raclé (la <i>jota</i>) · <i>v</i> se prononce presque comme <i>b</i>.</p>`,
        items: [
          W('hola', 'salut / bonjour', '👋'),
          W('buenos días', 'bonjour (le matin)', '☀️'),
          W('buenas tardes', 'bon après-midi', '🌇'),
          W('buenas noches', 'bonsoir / bonne nuit', '🌙'),
          P('Buenos días, señora.', 'Bonjour, madame.', { h: 'señora = madame · señor = monsieur' }),
          W('adiós', 'au revoir'),
          W('hasta luego', 'à plus tard'),
          W('hasta mañana', 'à demain', '📅'),
          P('Hasta mañana, Pablo.', 'À demain, Pablo.'),
          W('gracias', 'merci', '🙏'),
          W('por favor', 's’il te plaît / s’il vous plaît'),
          W('de nada', 'de rien'),
          D('Un ami te dit :', '¡Muchas gracias!', 'Merci beaucoup !', 'De nada.', ['Hasta mañana.', 'Buenos días.', 'Por favor.'],
            { x: '« De nada » (de rien) est la réponse naturelle à « gracias ».' }),
          W('perdón', 'pardon'),
          W('¿qué tal?', 'ça va ?'),
          W('muy bien', 'très bien', '👍'),
          P('Hola, ¿qué tal?', 'Salut, ça va ?'),
          P('Muy bien, gracias. ¿Y tú?', 'Très bien, merci. Et toi ?'),
          W('encantado', 'enchanté', '🤝', { alt: ['encantada'] }),
          T('{g}, {n}.', '{g}, {n}.', {
            g: [['Hola', 'Salut'], ['Buenos días', 'Bonjour'], ['Buenas tardes', 'Bon après-midi'], ['Hasta luego', 'À plus tard'], ['Hasta mañana', 'À demain'], ['Adiós', 'Au revoir'], ['Muchas gracias', 'Merci beaucoup']],
            n: [['Pablo', 'Pablo'], ['señora', 'madame'], ['señor', 'monsieur'], ['Lucía', 'Lucía'], ['amigos', 'les amis']],
          }),
          D('Le soir, une voisine te salue :', '¡Buenas noches! ¿Qué tal?', 'Bonsoir ! Ça va ?', 'Muy bien, gracias. ¿Y usted?',
            ['Buenos días, de nada.', 'De nada, adiós.', 'Perdón, hasta luego.'],
            { x: '« ¿Y usted? » = « Et vous ? » (politesse). Le soir, « buenos días » ne convient pas.' }),
        ],
      },
      {
        id: 'u1l2', type: 'lesson', title: 'Presentarse', fr: 'Se présenter avec ser',
        tip: `<h3>Le verbe <i>ser</i> (être)</h3>
<table><tr><th>yo</th><td>soy</td><th>nosotros/as</th><td>somos</td></tr>
<tr><th>tú</th><td>eres</td><th>vosotros/as</th><td>sois</td></tr>
<tr><th>él / ella / usted</th><td>es</td><th>ellos / ellas / ustedes</th><td>son</td></tr></table>
<p>Le pronom est souvent omis : <i>Soy francés</i> suffit (la terminaison dit déjà qui parle).</p>
<p><b>usted</b> (vous de politesse) se conjugue comme <i>él</i> : <i>usted es</i>. <b>vosotros</b> = « vous » pluriel entre amis (en Espagne).</p>
<p><b>Nationalités</b> : -és → -esa sans accent (francés → francesa, inglés → inglesa) ; -o → -a (italiano → italiana). Pas de majuscule : <i>español</i>.</p>
<p><b>Se présenter</b> : <i>Me llamo Ana</i> (je m’appelle Ana) · <i>¿Cómo te llamas?</i> · <i>Soy de Lyon</i> (je suis de Lyon).</p>`,
        items: [
          W('me llamo', 'je m’appelle'),
          W('¿cómo te llamas?', 'comment tu t’appelles ?'),
          P('Me llamo Lucía, ¿y tú?', 'Je m’appelle Lucía, et toi ?'),
          W('yo', 'je / moi'),
          W('tú', 'tu / toi'),
          W('él', 'il / lui'),
          W('ella', 'elle'),
          W('usted', 'vous (politesse)', '🎩'),
          CJ('ser'),
          G('Yo ___ francés.', 'soy', ['eres', 'es', 'son'], 'Je suis français.'),
          W('francés', 'français', '🇫🇷'),
          W('francesa', 'française', '🇫🇷'),
          G('Tú ___ española.', 'eres', ['soy', 'es', 'sois'], 'Tu es espagnole.'),
          W('español', 'espagnol', '🇪🇸'),
          W('española', 'espagnole', '🇪🇸'),
          G('Marie es ___.', 'francesa', ['francés', 'franceses', 'francesas'], 'Marie est française.',
            { x: 'Au féminin, -és devient -esa et perd son accent.' }),
          W('¿de dónde eres?', 'd’où es-tu ?', '🌍'),
          P('Soy de París.', 'Je suis de Paris.'),
          T('{s} de {c}.', '{s} de {c}.', {
            s: [['Yo soy', 'Je suis'], ['Tú eres', 'Tu es'], ['Ella es', 'Elle est'], ['Él es', 'Il est'], ['Nosotros somos', 'Nous sommes'], [['Vosotros sois', 'Usted es', 'Ustedes son'], 'Vous êtes'], [['Ellos son', 'Ellas son'], ['Ils sont', 'Elles sont']]],
            c: [['Madrid', 'Madrid'], ['Sevilla', 'Séville'], ['Londres', 'Londres'], ['Lisboa', 'Lisbonne'], ['Marsella', 'Marseille'], ['Roma', 'Rome']],
          }),
          G('Nosotros ___ amigos.', 'somos', ['sois', 'son', 'soy'], 'Nous sommes amis.'),
          W('el amigo', 'l’ami', '🧑'),
          W('la amiga', 'l’amie', '👩'),
          G('Ellos ___ de Sevilla.', 'son', ['es', 'somos', 'sois'], 'Ils sont de Séville.'),
          G('Vosotras ___ de Lyon.', 'sois', ['son', 'somos', 'es'], 'Vous êtes de Lyon.',
            { x: 'vosotros / vosotras = « vous » pluriel familier, utilisé en Espagne.' }),
          G('Usted ___ muy amable.', 'es', ['eres', 'sois', 'soy'], 'Vous êtes très aimable.',
            { x: 'usted se conjugue comme él / ella : usted es.' }),
          D('Dans un bar, quelqu’un te demande :', '¿Cómo te llamas?', 'Comment tu t’appelles ?', 'Me llamo Hugo, ¿y tú?',
            ['Soy de Madrid, gracias.', 'Muy bien, ¿y tú?', 'Hasta luego, Hugo.']),
          D('Il continue :', '¿De dónde eres?', 'D’où es-tu ?', 'Soy de Francia, de Lyon.',
            ['Me llamo Lyon.', 'Muy bien, gracias.', 'Encantado, adiós.']),
        ],
      },
      {
        id: 'u1l3', type: 'lesson', title: 'En la ciudad', fr: 'Nombres, articles et lieux de la ville',
        tip: `<h3>Les articles</h3>
<table><tr><th></th><th>masculin</th><th>féminin</th></tr>
<tr><th>le / la</th><td>el</td><td>la</td></tr>
<tr><th>les</th><td>los</td><td>las</td></tr>
<tr><th>un / une</th><td>un</td><td>una</td></tr></table>
<p><b>Genre</b> : -o → souvent masculin (<i>el museo</i>), -a → souvent féminin (<i>la plaza</i>). Toujours féminins : -dad, -ción (<i>la ciudad, la estación</i>). Pièges : <i>el día, el mapa, el problema</i> ; <i>la mano, la noche</i>.</p>
<p><b>Se repérer</b> : <i>¿Dónde está el museo?</i> (où est…) · <i>Hay un hotel</i> (il y a un hôtel).</p>
<h3>Les nombres</h3>
<p>0 cero · 1 uno · 2 dos · 3 tres · 4 cuatro · 5 cinco · 6 seis · 7 siete · 8 ocho · 9 nueve · 10 diez · 11 once · 12 doce · 13 trece · 14 catorce · 15 quince</p>
<p>16 à 29 s’écrivent en un mot : <i>dieciséis, diecisiete… veinte, veintiuno, veintidós…</i></p>
<p>Ensuite : dizaine + <b>y</b> + unité : <i>treinta y cinco</i> (35). Dizaines : 30 treinta · 40 cuarenta · 50 cincuenta · 60 sesenta · 70 setenta · 80 ochenta · 90 noventa · 100 cien.</p>`,
        items: [
          N(0, 20),
          W('la ciudad', 'la ville', '🏙️'),
          W('la calle', 'la rue', '🛣️'),
          W('la plaza', 'la place', '⛲'),
          W('el museo', 'le musée', '🏛️'),
          G('___ museo', 'el', ['la', 'los', 'las'], 'le musée', { x: 'Les noms en -o sont en général masculins.' }),
          G('___ ciudad', 'la', ['el', 'los', 'las'], 'la ville', { x: 'Les noms en -dad sont féminins.' }),
          W('la estación', 'la gare', '🚉'),
          W('el metro', 'le métro', '🚇'),
          W('el billete', 'le billet / le ticket', '🎫'),
          P('Un billete de metro, por favor.', 'Un ticket de métro, s’il vous plaît.'),
          G('___ día', 'el', ['la', 'los', 'las'], 'le jour', { x: 'Exception : « día » finit par -a mais il est masculin.' }),
          W('el hotel', 'l’hôtel', '🏨'),
          W('el mapa', 'le plan (de ville)', '🗺️'),
          G('___ mapa', 'el', ['la', 'los', 'las'], 'le plan', { x: 'Exception : « mapa » est masculin.' }),
          G('___ noche', 'la', ['el', 'los', 'las'], 'la nuit'),
          G('___ estaciones', 'las', ['los', 'el', 'la'], 'les gares', { x: 'Les noms en -ción sont féminins.' }),
          G('___ billetes', 'los', ['las', 'el', 'la'], 'les billets'),
          N(21, 100),
          W('¿dónde está?', 'où est… ?', '📍'),
          P('¿Dónde está el museo?', 'Où est le musée ?'),
          W('hay', 'il y a'),
          P('Hay un hotel en la plaza.', 'Il y a un hôtel sur la place.'),
          G('___ un museo en el centro.', 'Hay', ['Está', 'Es', 'Son'], 'Il y a un musée dans le centre.',
            { x: '« il y a » = hay (invariable).' }),
          W('el centro', 'le centre'),
          T('¿Dónde está {x}?', 'Où est {x} ?', {
            x: [['el museo', 'le musée'], ['la estación', 'la gare'], ['el hotel', 'l’hôtel'], ['la plaza', 'la place'], ['el metro', 'le métro'], ['la calle Mayor', 'la rue Mayor'], ['el centro', 'le centre']],
          }),
          D('Dans la rue, un passant te voit perdu :', '¿Necesita ayuda?', 'Vous avez besoin d’aide ?', 'Sí, gracias. ¿Dónde está la estación?',
            ['Sí, soy la estación.', 'No, me llamo ayuda.', 'Hasta luego, estación.']),
        ],
      },
      {
        id: 'u1c', type: 'culture', title: 'Cultura: Madrid', fr: 'Madrid, le Prado et l’histoire de l’Espagne',
        cards: ['sol', 'prado', 'meninas', 'reyes', 'transicion'],
        reading: {
          title: 'Madrid',
          text: 'Madrid es la capital de España. Es una ciudad grande y muy bonita. En el centro está la Puerta del Sol. El Museo del Prado es muy famoso: hay cuadros de Velázquez y de Goya. Los madrileños cenan tarde, a las diez de la noche.',
          gloss: 'bonita = jolie · cuadros = tableaux · los madrileños = les habitants de Madrid · cenan = dînent · tarde = tard',
          qs: [
            { q: 'Comment est Madrid, d’après le texte ?', a: 'Grande et très jolie', o: ['Petite et calme', 'Grande et triste', 'Ancienne et froide'] },
            { q: 'À quelle heure dînent les Madrilènes ?', a: 'À 22 h', o: ['À 20 h', 'À 19 h', 'À minuit'] },
            { q: 'Qu’y a-t-il au centre de la ville ?', a: 'La Puerta del Sol', o: ['Le Museo del Prado', 'La gare', 'Le palais royal'] },
            { q: 'Quels peintres sont cités ?', a: 'Velázquez et Goya', o: ['Picasso et Dalí', 'El Greco et Miró', 'Velázquez et Picasso'] },
          ],
        },
      },
      {
        id: 'u1b', type: 'boss', title: 'Desafío: el hotel', fr: 'Défi : arriver à l’hôtel',
        intro: 'Tu arrives à ton hôtel madrilène en fin d’après-midi. Sofía, la réceptionniste, t’accueille. Réussis la conversation avec <b>2 erreurs maximum</b> pour obtenir ton tampon de passeport.',
        npc: 'sofia',
        steps: [
          { npc: '¡Buenas tardes! Bienvenido al hotel Sol.', fr: 'Bon après-midi ! Bienvenue à l’hôtel Sol.', a: '¡Hola, buenas tardes!', o: ['¡Buenas noches, adiós!', 'De nada.', 'Hasta mañana.'] },
          { npc: '¿Cómo se llama usted?', fr: 'Comment vous appelez-vous ?', a: 'Me llamo Martin Dupont.', o: ['Soy de hotel.', 'Muy bien, gracias.', 'Se llama usted.'] },
          { say: 'Elle demande ta nationalité. Réponds : « Je suis français(e). »', acc: ['soy francés', 'soy francesa', 'yo soy francés', 'yo soy francesa'], sol: 'Soy francés. / Soy francesa.' },
          { npc: 'Su habitación es la número {n}.', fr: 'Votre chambre est la numéro {d}.', q: 'Quel est ton numéro de chambre ?', num: [11, 99] },
          { npc: '¿Necesita un mapa de la ciudad?', fr: 'Vous avez besoin d’un plan de la ville ?', a: 'Sí, por favor. ¿Dónde está el Museo del Prado?', o: ['Sí, es un mapa.', 'No, soy un mapa.', 'Hasta luego, museo.'] },
          { v: [
            { npc: 'Está muy cerca, en el Paseo del Prado.', fr: 'C’est tout près, sur le Paseo del Prado.', q: 'Où est le musée ?', a: 'Tout près', o: ['Très loin', 'Dans l’hôtel', 'À la gare'] },
            { npc: 'Está a diez minutos, en el Paseo del Prado.', fr: 'C’est à dix minutes, sur le Paseo del Prado.', q: 'À combien de temps est le musée ?', a: 'À dix minutes', o: ['À deux minutes', 'À une heure', 'À douze minutes'] },
          ] },
          { say: 'Remercie-la et dis au revoir : « Merci beaucoup, au revoir ! »', acc: ['muchas gracias adiós', 'gracias adiós', 'muchas gracias hasta luego', 'gracias hasta luego', 'muchas gracias hasta pronto'], sol: '¡Muchas gracias, adiós!' },
        ],
      },
    ],
  };

  /* ------------------------------------------------------------------ UNITÉ 2 */
  const u2 = {
    id: 'u2', e: '🧺', color: '#2f8f46', dark: '#1f6331',
    city: 'Valencia', cityFr: 'Valence', region: 'Comunitat Valenciana', lon: -0.38, lat: 39.47, guide: 'amparo',
    hello: { es: '¡Hola! Soy Amparo, fallera de Valencia. ¡Vamos al mercado!', fr: 'Salut ! Je suis Amparo, fallera de Valence. Allons au marché !' },
    costume: 'Robe de brocart et chignons dorés (les rodetes) : la tenue des falleras pendant les Fallas, en mars, quand on brûle d’immenses sculptures dans les rues.',
    title: 'De compras en el mercado', fr: 'Valence : faire ses courses au marché, quantités, prix, verbes en -ar',
    levels: [
      {
        id: 'u2l1', type: 'lesson', title: 'Frutas y verduras', fr: 'Fruits, légumes et pluriel',
        tip: `<h3>Le pluriel</h3>
<table><tr><th>voyelle finale</th><td>+ s</td><td>manzana → manzana<b>s</b></td></tr>
<tr><th>consonne finale</th><td>+ es</td><td>ciudad → ciudad<b>es</b></td></tr>
<tr><th>-z</th><td>→ -ces</td><td>pez → pe<b>ces</b></td></tr></table>
<p><b>Attention à l’accent</b> : il disparaît quand la syllabe tonique ne change pas de place : <i>limón → limones</i>, <i>estación → estaciones</i>.</p>
<p>Articles au pluriel : <i>el → los</i>, <i>la → las</i>, <i>un → unos</i>, <i>una → unas</i>.</p>
<p><b>Vocabulaire d’Espagne</b> : on dit <i>patata</i> (pas <i>papa</i> comme en Amérique latine) et <i>plátano</i> pour la banane.</p>`,
        items: [
          W('la manzana', 'la pomme', '🍎'),
          W('la naranja', 'l’orange', '🍊'),
          W('el plátano', 'la banane', '🍌'),
          W('la fresa', 'la fraise', '🍓'),
          P('Una manzana y dos naranjas.', 'Une pomme et deux oranges.'),
          W('el limón', 'le citron', '🍋'),
          W('la uva', 'le raisin', '🍇'),
          W('la pera', 'la poire', '🍐'),
          G('una manzana → dos ___', 'manzanas', ['manzanes', 'manzana', 'manzanos'], 'une pomme → deux pommes',
            { x: 'Mot terminé par une voyelle : on ajoute -s.' }),
          G('un limón → tres ___', 'limones', ['limóns', 'limónes', 'limons'], 'un citron → trois citrons',
            { x: 'Consonne finale : + es, et l’accent disparaît (li-MO-nes).' }),
          T('{n} {f}.', '{n} {f}.', {
            n: [['Dos', 'Deux'], ['Tres', 'Trois'], ['Cuatro', 'Quatre'], ['Cinco', 'Cinq'], ['Seis', 'Six'], ['Diez', 'Dix']],
            f: [['manzanas', 'pommes'], ['naranjas', 'oranges'], ['peras', 'poires'], ['limones', 'citrons'], ['tomates', 'tomates'], ['cebollas', 'oignons'], ['zanahorias', 'carottes'], ['fresas', 'fraises']],
          }),
          W('el tomate', 'la tomate', '🍅'),
          W('la patata', 'la pomme de terre', '🥔'),
          W('la cebolla', 'l’oignon', '🧅'),
          W('la zanahoria', 'la carotte', '🥕'),
          G('la ciudad → las ___', 'ciudades', ['ciudads', 'ciudadas', 'ciudadés'], 'la ville → les villes'),
          W('el ajo', 'l’ail', '🧄'),
          W('la lechuga', 'la laitue', '🥬'),
          W('el pimiento', 'le poivron', '🫑'),
          P('Las fresas son rojas.', 'Les fraises sont rouges.', { h: 'rojo / roja = rouge' }),
          G('el pez → los ___', 'peces', ['pezes', 'pezs', 'pez'], 'le poisson → les poissons', { x: '-z devient -ces au pluriel.' }),
          P('Los tomates son de Almería.', 'Les tomates viennent d’Almería.', { h: 'Almería (Andalousie) est surnommée « le potager de l’Europe ».' }),
          G('la estación → las ___', 'estaciones', ['estacións', 'estaciónes', 'estacion'], 'la gare → les gares'),
          D('Une amie prépare la liste de courses :', '¿Necesitamos patatas?', 'On a besoin de pommes de terre ?', 'Sí, y también cebollas.',
            ['Sí, una patatas.', 'No, es un tomate.', 'Sí, el limón es.'], { x: '« también » = aussi.' }),
        ],
      },
      {
        id: 'u2l2', type: 'lesson', title: 'Cantidades y precios', fr: 'Quantités, prix et accords',
        tip: `<h3>Quantités</h3>
<p>Quantité + <b>de</b> + nom, sans article : <i>un kilo de tomates</i>, <i>medio kilo de fresas</i>, <i>una docena de huevos</i>, <i>una botella de aceite</i>.</p>
<h3>Demander un prix</h3>
<p><i>¿Cuánto cuesta el queso?</i> (singulier) · <i>¿Cuánto cuestan las fresas?</i> (pluriel) · <i>¿Cuánto es?</i> (ça fait combien ?)</p>
<p><i>costar</i> change o → ue : <i>cuesta, cuestan</i>.</p>
<p>Réponse : <i>Son cinco euros</i> · <i>Son tres euros con cincuenta</i> (3,50 €).</p>
<p>Devant un nom masculin, <i>uno</i> devient <i>un</i> : <i>veintiún euros</i>.</p>
<h3>Accord de l’adjectif</h3>
<table><tr><td>el queso es car<b>o</b></td><td>la leche es car<b>a</b></td></tr><tr><td>los tomates son barat<b>os</b></td><td>las fresas son barat<b>as</b></td></tr></table>`,
        items: [
          W('el pan', 'le pain', '🥖'),
          W('la leche', 'le lait', '🥛'),
          W('el huevo', 'l’œuf', '🥚'),
          W('el queso', 'le fromage', '🧀'),
          W('un kilo de', 'un kilo de', '⚖️'),
          W('medio kilo de', 'un demi-kilo de'),
          W('una docena de', 'une douzaine de'),
          G('Un kilo ___ naranjas.', 'de', ['del', 'el', 'a'], 'Un kilo d’oranges.', { x: 'Après une quantité : « de » + nom, sans article.' }),
          T('{q} de {p}, por favor.', '{q} {p}, s’il vous plaît.', {
            q: [['Un kilo', 'Un kilo'], ['Medio kilo', 'Un demi-kilo'], ['Dos kilos', 'Deux kilos'], ['Tres kilos', 'Trois kilos']],
            p: [['manzanas', 'de pommes'], ['naranjas', 'd’oranges'], ['tomates', 'de tomates'], ['fresas', 'de fraises'], ['patatas', 'de pommes de terre'], ['cebollas', 'd’oignons'], ['uvas', 'de raisin']],
          }),
          W('el jamón', 'le jambon', '🍖'),
          W('el aceite', 'l’huile', '🫒'),
          W('el arroz', 'le riz', '🍚'),
          W('el azúcar', 'le sucre'),
          W('la botella', 'la bouteille', '🍾'),
          P('Una botella de aceite.', 'Une bouteille d’huile.'),
          W('¿cuánto cuesta?', 'combien ça coûte ?', '🏷️'),
          W('el euro', 'l’euro', '💶'),
          W('barato', 'bon marché / pas cher'),
          W('caro', 'cher', '💸'),
          G('El queso ___ ocho euros.', 'cuesta', ['cuestan', 'cuesto', 'costa'], 'Le fromage coûte huit euros.'),
          G('Las fresas ___ cuatro euros.', 'cuestan', ['cuesta', 'cuestas', 'costan'], 'Les fraises coûtent quatre euros.',
            { x: 'costar : o → ue, et pluriel → cuestan.' }),
          T('{p} cuesta {n} euros.', '{p} coûte {n} euros.', {
            p: [['El queso', 'Le fromage'], ['El jamón', 'Le jambon'], ['La botella de vino', 'La bouteille de vin'], ['El aceite', 'L’huile'], ['La docena de huevos', 'La douzaine d’œufs']],
            n: { num: [2, 30] },
          }),
          P('¿Cuánto es?', 'Ça fait combien ?'),
          P('Son cinco euros.', 'Ça fait cinq euros.'),
          G('El jamón es muy ___.', 'caro', ['cara', 'caros', 'caras'], 'Le jambon est très cher.'),
          G('Las manzanas son ___.', 'baratas', ['barato', 'baratos', 'barata'], 'Les pommes sont bon marché.',
            { x: 'L’adjectif s’accorde : féminin pluriel → -as.' }),
          D('Au marché, la vendeuse te demande :', '¿Qué le pongo?', 'Qu’est-ce que je vous sers ?', 'Medio kilo de fresas, por favor.',
            ['Son cuatro euros.', 'Muy caro, de nada.', 'Me llamo fresa.'],
            { x: '« ¿Qué le pongo? » est LA question des commerçants espagnols.' }),
        ],
      },
      {
        id: 'u2l3', type: 'lesson', title: 'Comprar', fr: 'Acheter : les verbes en -ar et querer',
        tip: `<h3>Les verbes en -ar (présent)</h3>
<table><tr><th>yo</th><td>habl<b>o</b></td><th>nosotros</th><td>habl<b>amos</b></td></tr>
<tr><th>tú</th><td>habl<b>as</b></td><th>vosotros</th><td>habl<b>áis</b></td></tr>
<tr><th>él / ella / usted</th><td>habl<b>a</b></td><th>ellos / ustedes</th><td>habl<b>an</b></td></tr></table>
<p>Même modèle : <i>comprar, necesitar, buscar, pagar</i>.</p>
<h3><i>querer</i> (vouloir) : e → ie</h3>
<p>quiero, quieres, quiere, <b>queremos, queréis</b>, quieren — <i>nosotros</i> et <i>vosotros</i> gardent le <i>e</i>.</p>
<p><i>Quiero</i> + nom ou infinitif : <i>Quiero pan</i>, <i>Quiero comprar pan</i>. Au magasin, plus poli : <i>Quería…</i> (je voudrais).</p>
<p><i>Necesito</i> = j’ai besoin de (sans « de ») : <i>Necesito una bolsa</i>.</p>`,
        items: [
          W('comprar', 'acheter'),
          CJ('comprar'),
          W('necesitar', 'avoir besoin de'),
          W('buscar', 'chercher', '🔍'),
          W('pagar', 'payer'),
          W('querer', 'vouloir'),
          CJ('querer'),
          G('Yo ___ pan.', 'compro', ['compra', 'compras', 'compramos'], 'J’achète du pain.', { h: '(comprar)' }),
          G('Nosotros ___ una bolsa.', 'necesitamos', ['necesitan', 'necesitáis', 'necesito'], 'Nous avons besoin d’un sac.', { h: '(necesitar)' }),
          W('la tienda', 'le magasin', '🏪'),
          W('el supermercado', 'le supermarché', '🛒'),
          W('la bolsa', 'le sac', '🛍️'),
          W('la tarjeta', 'la carte (bancaire)', '💳'),
          W('el dinero', 'l’argent', '💰'),
          G('¿Tú ___ con tarjeta?', 'pagas', ['paga', 'pago', 'pagan'], 'Tu paies par carte ?', { h: '(pagar)' }),
          G('Ella ___ un kilo de uvas.', 'quiere', ['quere', 'quiero', 'queremos'], 'Elle veut un kilo de raisin.',
            { h: '(querer)', x: 'querer : e → ie (quiero, quieres, quiere… mais queremos, queréis).' }),
          G('Vosotros ___ el supermercado.', 'buscáis', ['buscan', 'buscamos', 'buscas'], 'Vous cherchez le supermarché.', { h: '(buscar)' }),
          CJ('hablar'),
          P('Quiero comprar pan.', 'Je veux acheter du pain.'),
          P('¿Algo más?', 'Autre chose ?'),
          P('Nada más, gracias.', 'Ce sera tout, merci.'),
          P('¿Puedo pagar con tarjeta?', 'Je peux payer par carte ?'),
          W('abierto', 'ouvert', '🟢'),
          W('cerrado', 'fermé', '🔴'),
          P('La tienda está cerrada.', 'Le magasin est fermé.'),
          T('{s} {o}.', '{s} {o}.', {
            s: [['Compro', 'J’achète'], ['Compras', 'Tu achètes'], ['Compra', ['Elle achète', 'Il achète']], ['Compramos', 'Nous achetons'], [['Compráis', 'Compran', 'Compra'], 'Vous achetez'], ['Compran', ['Ils achètent', 'Elles achètent']]],
            o: [['pan', 'du pain'], ['leche', 'du lait'], ['queso', 'du fromage'], ['fruta', 'des fruits'], ['una botella de agua', 'une bouteille d’eau'], ['un kilo de arroz', 'un kilo de riz']],
          }),
          D('À la caisse, on te demande :', '¿Paga con tarjeta o en efectivo?', 'Vous payez par carte ou en espèces ?', 'Con tarjeta, por favor.',
            ['Un kilo, por favor.', 'Soy de tarjeta.', 'Hasta mañana.']),
          D('Le vendeur te rend la monnaie :', 'Aquí tiene. ¡Que tenga un buen día!', 'Voici. Bonne journée !', 'Gracias, igualmente.',
            ['De nada, señor.', 'Sí, un día.', 'Quiero un día.'], { x: '« Igualmente » = pareillement / vous aussi.' }),
        ],
      },
      {
        id: 'u2c', type: 'culture', title: 'Cultura: Valencia', fr: 'Le Mercado Central, la paella, les horaires et l’héritage d’Al-Ándalus',
        cards: ['mercadocentral', 'horarios', 'alandalus', 'arabe', 'paella'],
        reading: {
          title: 'El sábado de Ana',
          text: 'Hoy es sábado. Ana va al mercado. Compra un kilo de tomates, medio kilo de fresas y una docena de huevos. Las fresas son caras: cuestan cinco euros. Ana paga con tarjeta y vuelve a casa a las dos, para la comida.',
          gloss: 'hoy = aujourd’hui · sábado = samedi · va al = va au · vuelve a casa = rentre à la maison',
          qs: [
            { q: 'Quel jour sommes-nous ?', a: 'Samedi', o: ['Dimanche', 'Lundi', 'Vendredi'] },
            { q: 'Combien d’œufs Ana achète-t-elle ?', a: 'Douze', o: ['Six', 'Dix', 'Deux'] },
            { q: 'Qu’est-ce qui est cher ?', a: 'Les fraises', o: ['Les tomates', 'Les œufs', 'Le pain'] },
            { q: 'Comment Ana paie-t-elle ?', a: 'Par carte', o: ['En espèces', 'Elle ne paie pas', 'Par chèque'] },
            { q: 'Pourquoi rentre-t-elle à 14 h ?', a: 'Pour le déjeuner', o: ['Pour le dîner', 'Pour le goûter', 'Pour dormir'] },
          ],
        },
      },
      {
        id: 'u2b', type: 'boss', title: 'Desafío: el puesto', fr: 'Défi : acheter les ingrédients du gazpacho',
        intro: 'Samedi matin, au Mercado Central de Valence. Tu veux préparer un <b>gazpacho</b> (soupe froide andalouse : tomates, poivron, concombre, ail, huile d’olive). Vicent, le marchand, t’interpelle. <b>2 erreurs maximum</b>.',
        npc: 'vicent',
        steps: [
          { npc: '¡Buenos días! ¿Qué le pongo?', fr: 'Bonjour ! Qu’est-ce que je vous sers ?', a: 'Buenos días. Un kilo de tomates, por favor.', o: ['Buenos días. Un kilo tomates de por favor.', 'Me llamo tomate.', 'Son dos euros.'] },
          { v: [
            { npc: '¿Algo más?', fr: 'Autre chose ?', a: 'Sí, dos pimientos, por favor.', o: ['No, soy un pimiento.', 'Sí, gracias, adiós.', 'Sí, el pimiento es.'] },
            { npc: '¿Qué más necesita?', fr: 'De quoi d’autre avez-vous besoin ?', a: 'Un pepino y una cabeza de ajo.', o: ['Necesito de nada.', 'Es un pepino.', 'Muy bien, ¿y tú?'], x: 'pepino = concombre · una cabeza de ajo = une tête d’ail' },
          ] },
          { say: 'Demande combien ça fait.', acc: ['cuánto es', 'cuánto cuesta', 'cuánto cuestan', 'cuánto le debo', 'cuánto cuesta todo'], sol: '¿Cuánto es? / ¿Cuánto cuesta?' },
          { npc: 'Son {n} euros con cincuenta.', fr: 'Ça fait {d} euros cinquante.', q: 'Combien dois-tu payer ?', num: [3, 19], fmt: '{d},50 €', apoc: true },
          { npc: '¿Paga con tarjeta o en efectivo?', fr: 'Vous payez par carte ou en espèces ?', a: 'Con tarjeta, por favor.', o: ['Con tarjeta de nada.', 'Sí, efectivo tarjeta.', 'En el mercado.'] },
          { say: 'Il demande « ¿Algo más? ». Réponds : « Ce sera tout, merci. »', acc: ['nada más gracias', 'no nada más gracias', 'nada más muchas gracias', 'no gracias nada más'], sol: 'Nada más, gracias.' },
          { npc: '¡Que tenga un buen día!', fr: 'Bonne journée !', a: '¡Gracias, igualmente!', o: ['¡De nada, buenos!', 'Sí, un día.', 'Me llamo día.'] },
        ],
      },
    ],
  };

  /* ------------------------------------------------------------------ UNITÉ 3 */
  const u3 = {
    id: 'u3', e: '⛱️', color: '#1f6fb2', dark: '#144c7d',
    city: 'Barcelona', cityFr: 'Barcelone', region: 'Catalunya', lon: 2.17, lat: 41.39, guide: 'jordi',
    hello: { es: 'Bon dia! Soy Jordi. En Barcelona hablamos catalán y español.', fr: 'Bonjour ! Je suis Jordi. À Barcelone, on parle catalan et espagnol.' },
    costume: 'La barretina, bonnet de laine rouge, est le couvre-chef traditionnel catalan.',
    title: 'Un fin de semana en Barcelona', fr: 'Week-end à Barcelone : repas, goûts, restaurant',
    levels: [
      {
        id: 'u3l1', type: 'lesson', title: 'Las comidas', fr: 'Les repas de la journée',
        tip: `<h3>Les repas en Espagne</h3>
<table><tr><th>el desayuno</th><td>petit-déjeuner</td><td>7 h – 9 h</td></tr>
<tr><th>la comida</th><td>déjeuner (repas principal)</td><td>14 h – 15 h 30</td></tr>
<tr><th>la merienda</th><td>goûter</td><td>vers 18 h</td></tr>
<tr><th>la cena</th><td>dîner</td><td>21 h – 22 h 30</td></tr></table>
<p>Verbes : <i>desayunar, comer, merendar, cenar</i>. <i>La comida</i> veut dire aussi « la nourriture ».</p>
<p><b>el agua</b> : <i>agua</i> est féminin, mais on dit <i>el agua</i> pour éviter « la-a ». L’adjectif reste féminin : <i>el agua fría</i>.</p>
<p><b>pez / pescado</b> : <i>el pez</i> nage dans l’eau, <i>el pescado</i> est dans l’assiette.</p>`,
        items: [
          W('el desayuno', 'le petit-déjeuner', '🥐'),
          W('la comida', 'le déjeuner (et « la nourriture »)', '🍽️'),
          W('la cena', 'le dîner', '🕙'),
          W('la merienda', 'le goûter', '🍪'),
          G('En España, la ___ es a las dos.', 'comida', ['cena', 'merienda', 'desayuno'], 'En Espagne, le déjeuner est à deux heures.'),
          W('el café con leche', 'le café au lait', '☕'),
          W('el zumo de naranja', 'le jus d’orange', '🧃'),
          W('el agua', 'l’eau', '💧'),
          W('el vino', 'le vin', '🍷'),
          W('la cerveza', 'la bière', '🍺'),
          G('___ agua está fría.', 'El', ['La', 'Los', 'Las'], 'L’eau est froide.',
            { x: '« agua » est féminin, mais on dit « el agua » ; l’adjectif reste féminin : fría.' }),
          P('Un café con leche, por favor.', 'Un café au lait, s’il vous plaît.'),
          W('el bocadillo', 'le sandwich (baguette)', '🥪'),
          W('la tortilla', 'l’omelette (aux pommes de terre)', '🍳'),
          W('la ensalada', 'la salade', '🥗'),
          W('el pescado', 'le poisson (à manger)', '🐟'),
          W('la carne', 'la viande', '🥩'),
          W('el pollo', 'le poulet', '🍗'),
          W('el postre', 'le dessert', '🍮'),
          G('Ceno a las diez de la ___.', 'noche', ['tarde', 'mañana', 'día'], 'Je dîne à dix heures du soir.'),
          P('Un bocadillo de jamón, por favor.', 'Un sandwich au jambon, s’il vous plaît.'),
          P('El pescado está muy bueno.', 'Le poisson est très bon.'),
          T('{m} es a {h}.', '{m} est à {h}.', {
            m: [['El desayuno', 'Le petit-déjeuner'], ['La comida', 'Le déjeuner'], ['La cena', 'Le dîner'], ['La merienda', 'Le goûter']],
            h: [['las ocho', 'huit heures'], ['las nueve', 'neuf heures'], ['las dos', 'deux heures'], ['las tres', 'trois heures'], ['las seis', 'six heures'], ['las diez', 'dix heures']],
          }),
          D('Vers 18 h, ton ami espagnol propose :', '¿Merendamos?', 'On goûte ?', '¡Sí! Un café con leche y un bocadillo.',
            ['Sí, me llamo merienda.', 'Hasta mañana, desayuno.', 'Sí, son las tardes.'],
            { x: 'La merienda, vers 18 h, aide à tenir jusqu’au dîner tardif.' }),
        ],
      },
      {
        id: 'u3l2', type: 'lesson', title: 'Me gusta', fr: 'Dire ce qu’on aime avec gustar',
        tip: `<h3><i>gustar</i> : « plaire à »</h3>
<p>En espagnol, c’est la chose aimée qui est le sujet : <i>Me gusta el café</i> = « le café me plaît ».</p>
<table><tr><th>à moi</th><td>me</td><th>à nous</th><td>nos</td></tr>
<tr><th>à toi</th><td>te</td><th>à vous (vosotros)</th><td>os</td></tr>
<tr><th>à lui / elle / vous</th><td>le</td><th>à eux / vous (ustedes)</th><td>les</td></tr></table>
<p><b>gusta</b> + nom singulier ou infinitif : <i>me gusta la paella, me gusta comer</i>.<br><b>gustan</b> + nom pluriel : <i>me gustan las fresas</i>.</p>
<p>On garde l’article : <i>me gusta <b>el</b> pescado</i>. Négation : <i>no me gusta</i>. Insister : <i>A mí me gusta</i>, <i>A Pablo le gusta</i>.</p>
<p><i>encantar</i> (adorer) fonctionne pareil : <i>me encanta, me encantan</i>.</p>`,
        items: [
          W('me gusta', 'j’aime (+ singulier)', '❤️'),
          W('me gustan', 'j’aime (+ pluriel)'),
          W('no me gusta', 'je n’aime pas', '👎'),
          W('¿te gusta?', 'tu aimes ?'),
          W('me encanta', 'j’adore', '😍'),
          G('Me ___ el chocolate.', 'gusta', ['gustan', 'gusto', 'gustas'], 'J’aime le chocolat.'),
          G('Me ___ las patatas bravas.', 'gustan', ['gusta', 'gusto', 'gustas'], 'J’aime les patatas bravas.',
            { x: 'Le verbe s’accorde avec la chose aimée : les patatas (pluriel) → gustan.' }),
          T('{w} {f}.', '{w} {f}.', {
            w: [['Me', 'J’aime'], ['Te', 'Tu aimes'], ['Le', ['Il aime', 'Elle aime']], ['Nos', 'Nous aimons'], [['Os', 'Le', 'Les'], 'Vous aimez'], ['Les', ['Ils aiment', 'Elles aiment']]],
            f: [['gusta el café', 'le café'], ['gustan las fresas', 'les fraises'], ['gusta la paella', 'la paella'], ['gustan los churros', 'les churros'], ['gusta el queso', 'le fromage'], ['gustan las aceitunas', 'les olives'], ['gusta mucho el jamón', 'beaucoup le jambon']],
          }),
          W('mucho', 'beaucoup'),
          W('un poco', 'un peu', '🤏'),
          W('delicioso', 'délicieux', '😋'),
          W('picante', 'épicé / piquant', '🌶️'),
          W('dulce', 'sucré', '🍰'),
          W('salado', 'salé', '🧂'),
          W('frío', 'froid', '🧊'),
          W('caliente', 'chaud', '♨️'),
          G('¿___ gusta el vino?', 'Te', ['Me', 'Tú', 'Nos'], 'Tu aimes le vin ?'),
          G('A nosotros ___ gusta la paella.', 'nos', ['nosotros', 'os', 'les'], 'Nous, nous aimons la paella.'),
          G('A Pablo ___ gustan los tomates.', 'le', ['lo', 'se', 'te'], 'Pablo aime les tomates.'),
          G('No me gusta ___ pescado.', 'el', ['un', 'de', 'del'], 'Je n’aime pas le poisson.',
            { x: 'Comme en français, on garde l’article : me gusta EL pescado.' }),
          P('Me encanta la tortilla de patatas.', 'J’adore l’omelette aux pommes de terre.'),
          P('¿Te gustan las aceitunas?', 'Tu aimes les olives ?'),
          P('El gazpacho está frío.', 'Le gazpacho est froid.', { h: 'Le gazpacho est une soupe froide andalouse à la tomate.' }),
          D('Une amie catalane te demande :', '¿Te gusta la comida española?', 'Tu aimes la cuisine espagnole ?', '¡Sí, me encanta!',
            ['Sí, me encantan.', 'Sí, soy comida.', 'No, de nada.'], { x: '« la comida » est singulier → me encanta.' }),
        ],
      },
      {
        id: 'u3l3', type: 'lesson', title: 'En el restaurante', fr: 'Commander : verbes en -er / -ir et tener',
        tip: `<h3>Les verbes en -er et -ir (présent)</h3>
<table><tr><th></th><th>comer</th><th>vivir</th></tr>
<tr><th>yo</th><td>com<b>o</b></td><td>viv<b>o</b></td></tr>
<tr><th>tú</th><td>com<b>es</b></td><td>viv<b>es</b></td></tr>
<tr><th>él / ella / usted</th><td>com<b>e</b></td><td>viv<b>e</b></td></tr>
<tr><th>nosotros</th><td>com<b>emos</b></td><td>viv<b>imos</b></td></tr>
<tr><th>vosotros</th><td>com<b>éis</b></td><td>viv<b>ís</b></td></tr>
<tr><th>ellos / ustedes</th><td>com<b>en</b></td><td>viv<b>en</b></td></tr></table>
<p><b>tener</b> (avoir) est irrégulier : tengo, tienes, tiene, tenemos, tenéis, tienen. <i>Tengo hambre</i> = j’ai faim · <i>tengo sed</i> = j’ai soif.</p>
<p><b>Au restaurant</b> : le <i>menú del día</i> (le midi en semaine) comprend <i>primero</i> (entrée), <i>segundo</i> (plat), <i>postre</i>, pain et boisson. Pour commander : <i>De primero, una ensalada</i>. Pour finir : <i>La cuenta, por favor</i>.</p>`,
        items: [
          W('la mesa', 'la table', '🪑'),
          W('la carta', 'la carte / le menu', '📜'),
          W('el camarero', 'le serveur', '🤵'),
          W('la cuenta', 'l’addition', '🧾'),
          P('Una mesa para dos, por favor.', 'Une table pour deux, s’il vous plaît.'),
          CJ('comer'),
          W('el menú del día', 'le menu du jour', '📋'),
          W('de primero', 'en entrée'),
          W('de segundo', 'en plat principal'),
          W('de postre', 'en dessert'),
          P('De primero, una ensalada.', 'En entrée, une salade.'),
          G('Nosotros ___ a las dos.', 'comemos', ['comen', 'coméis', 'como'], 'Nous mangeons à deux heures.', { h: '(comer)' }),
          CJ('beber'),
          G('Yo ___ agua.', 'bebo', ['bebe', 'bebes', 'beben'], 'Je bois de l’eau.', { h: '(beber)' }),
          CJ('vivir'),
          G('¿Dónde ___ tú?', 'vives', ['vive', 'vivís', 'vivo'], 'Où vis-tu ?', { h: '(vivir)' }),
          G('Vosotros ___ en Barcelona.', 'vivís', ['viven', 'vivimos', 'vivéis'], 'Vous vivez à Barcelone.',
            { h: '(vivir)', x: 'Verbes en -ir : vivimos, vivís (et non vivemos, vivéis).' }),
          CJ('tener'),
          G('Yo ___ hambre.', 'tengo', ['tiene', 'tienes', 'teno'], 'J’ai faim.', { h: '(tener)', x: '« avoir faim » = tener hambre.' }),
          W('el tenedor', 'la fourchette', '🍴'),
          W('el cuchillo', 'le couteau', '🔪'),
          W('la cuchara', 'la cuillère', '🥄'),
          W('la propina', 'le pourboire', '🪙'),
          P('¿Qué me recomienda?', 'Que me recommandez-vous ?'),
          P('La cuenta, por favor.', 'L’addition, s’il vous plaît.'),
          P('Tengo sed.', 'J’ai soif.'),
          T('{s} {o}.', '{s} {o}.', {
            s: [['Como', 'Je mange'], ['Comes', 'Tu manges'], ['Come', ['Elle mange', 'Il mange']], ['Comemos', 'Nous mangeons'], [['Coméis', 'Comen', 'Come'], 'Vous mangez'], ['Comen', ['Ils mangent', 'Elles mangent']]],
            o: [['pescado', 'du poisson'], ['tortilla', 'de l’omelette'], ['pan', 'du pain'], ['carne', 'de la viande'], ['ensalada', 'de la salade'], ['pollo', 'du poulet']],
          }),
          D('Le serveur a pris ta commande :', '¿Y para beber?', 'Et comme boisson ?', 'Agua, por favor.',
            ['De primero, gracias.', 'La cuenta, por favor.', 'Tengo hambre.']),
          D('À la fin du repas :', '¿Van a tomar postre?', 'Vous prendrez un dessert ?', 'Sí, un flan, por favor.',
            ['Sí, de primero.', 'No, una mesa.', 'Sí, el camarero.'], { x: 'Le flan (crème caramel) est un dessert très courant.' }),
        ],
      },
      {
        id: 'u3c', type: 'culture', title: 'Cultura: Barcelona', fr: 'Gaudí, Picasso, le catalan, les tapas',
        cards: ['gaudi', 'catalan', 'picasso', 'jo92', 'tapas'],
        reading: {
          title: 'Un día de Marc',
          text: 'Barcelona está en el noreste de España, al lado del mar Mediterráneo. En Barcelona se habla español y catalán. Por la mañana, Marc desayuna un café con leche y un cruasán. A las dos, come con sus amigos en un bar de tapas. Le gustan mucho las patatas bravas. Por la noche, cena pescado.',
          gloss: 'noreste = nord-est · al lado del mar = au bord de la mer · se habla = on parle · sus amigos = ses amis',
          qs: [
            { q: 'Où se trouve Barcelone ?', a: 'Au nord-est, au bord de la Méditerranée', o: ['Au sud, au bord de l’Atlantique', 'Au centre du pays', 'Au nord-ouest, en Galice'] },
            { q: 'Quelles langues parle-t-on à Barcelone ?', a: 'L’espagnol et le catalan', o: ['Seulement le catalan', 'L’espagnol et le basque', 'Le catalan et le français'] },
            { q: 'Que prend Marc au petit-déjeuner ?', a: 'Un café au lait et un croissant', o: ['Un jus d’orange et un sandwich', 'Du poisson', 'Des patatas bravas'] },
            { q: 'Qu’est-ce que Marc aime beaucoup ?', a: 'Les patatas bravas', o: ['Le poisson', 'Le café', 'Les croissants'] },
            { q: 'Que mange-t-il le soir ?', a: 'Du poisson', o: ['Des tapas', 'Un croissant', 'Une salade'] },
          ],
        },
      },
      {
        id: 'u3b', type: 'boss', title: 'Desafío: tapas', fr: 'Défi : dîner dans un bar à tapas',
        intro: 'Samedi soir, 21 h 30, dans le quartier du Born à Barcelone. Tu dînes avec un ami dans un bar à tapas ; Marta vous sert. <b>2 erreurs maximum</b>.',
        npc: 'marta',
        steps: [
          { npc: 'Buenas noches. ¿Mesa para cuántos?', fr: 'Bonsoir. Une table pour combien ?', a: 'Para dos, por favor.', o: ['Dos euros, por favor.', 'Son las dos.', 'Me gusta la mesa.'] },
          { npc: 'Aquí tiene la carta. ¿Qué van a beber?', fr: 'Voici la carte. Que voulez-vous boire ?', a: 'Una cerveza y un agua, por favor.', o: ['Un tenedor y un cuchillo.', 'La cuenta, por favor.', 'Tengo hambre de agua.'] },
          { say: 'Demande au serveur ce qu’il te recommande.', acc: ['qué me recomienda', 'qué nos recomienda', 'qué recomienda', 'qué recomienda usted'], sol: '¿Qué me recomienda?' },
          { npc: 'Las patatas bravas son muy buenas, pero son un poco picantes.', fr: 'Les patatas bravas sont très bonnes, mais un peu épicées.', q: 'Que dit le serveur des patatas bravas ?', a: 'Elles sont très bonnes mais un peu épicées.', o: ['Elles sont froides et sucrées.', 'Il n’y en a plus.', 'Elles sont très chères.'] },
          { npc: '¿Les gusta el pescado?', fr: 'Vous aimez le poisson ?', a: 'Sí, nos gusta mucho.', o: ['Sí, nos gustan mucho.', 'Sí, me gusto.', 'Sí, le gusta pescado.'], x: '« el pescado » est singulier → nos gusta.' },
          { v: [
            { npc: '¿Algo de postre?', fr: 'Un dessert ?', a: 'Sí, una crema catalana, por favor.', o: ['Sí, de primero.', 'No, la carta.', 'Sí, el camarero.'], x: 'La crema catalana : crème parfumée au citron et à la cannelle, au dessus caramélisé.' },
            { npc: '¿Quieren postre?', fr: 'Vous voulez un dessert ?', a: 'Sí, dos cremas catalanas, por favor.', o: ['Sí, dos mesas.', 'No, tengo sed de postre.', 'Sí, la propina.'], x: 'La crema catalana : crème parfumée au citron et à la cannelle, au dessus caramélisé.' },
          ] },
          { say: 'C’est la fin du repas : demande l’addition.', acc: ['la cuenta por favor', 'la cuenta', 'me trae la cuenta por favor', 'nos trae la cuenta por favor', 'la cuenta cuando pueda'], sol: 'La cuenta, por favor.' },
        ],
      },
    ],
  };

  /* ------------------------------------------------------------------ CROMOS (culture) */
  const cards = [
    // Unité 1
    { id: 'sol', u: 'u1', e: '☀️', cat: 'Lieu', name: 'La Puerta del Sol', sub: 'Madrid',
      text: 'Place centrale de Madrid. Au sol, une plaque marque le <b>Kilómetro Cero</b>, point de départ des grandes routes nationales d’Espagne. On y voit la statue de l’<i>Oso y el Madroño</i> (l’ours et l’arbousier), symbole de la ville. Chaque 31 décembre, les Espagnols mangent <b>12 grains de raisin</b> au rythme des douze coups de minuit sonnés par l’horloge de la place, en direct à la télévision.',
      qs: [
        { q: 'Que marque la plaque au sol de la Puerta del Sol ?', a: 'Le kilomètre zéro des routes espagnoles', o: ['Le centre géographique de l’Europe', 'La tombe d’un roi', 'Le point le plus haut de Madrid'] },
        { q: 'Que mange-t-on à minuit, le 31 décembre ?', a: '12 grains de raisin', o: ['12 olives', '12 churros', 'Une part de tortilla'] },
        { tf: 'La statue de la Puerta del Sol représente un ours et un arbousier.', v: true },
        { q: 'Quel animal est le symbole de Madrid ?', a: 'L’ours', o: ['Le taureau', 'L’aigle', 'Le lion'] },
      ] },
    { id: 'prado', u: 'u1', e: '🖼️', cat: 'Lieu', name: 'El Museo del Prado', sub: 'Madrid · 1819',
      text: 'Ouvert en <b>1819</b>, c’est l’un des plus grands musées de peinture du monde : Velázquez, Goya, El Greco, mais aussi Bosch et son <i>Jardin des délices</i>. Avec le musée Reina Sofía (art moderne) et le musée Thyssen-Bornemisza, il forme le <b>« Triangle de l’art »</b>, le long du Paseo del Prado.',
      qs: [
        { q: 'En quelle année le Prado a-t-il ouvert ?', a: '1819', o: ['1492', '1936', '1992'] },
        { q: 'Quels musées forment le « Triangle de l’art » de Madrid ?', a: 'Prado, Reina Sofía, Thyssen-Bornemisza', o: ['Prado, Louvre, Offices', 'Prado, Guggenheim, MNAC', 'Prado, Picasso, Dalí'] },
        { tf: 'Le Jardin des délices de Jérôme Bosch est exposé au Prado.', v: true },
        { tf: 'Le Prado est principalement un musée d’art contemporain.', v: false, x: 'C’est le Reina Sofía qui expose l’art moderne et contemporain.' },
      ] },
    { id: 'meninas', u: 'u1', e: '👑', cat: 'Œuvre', name: 'Las Meninas', sub: 'Velázquez · 1656',
      text: 'Chef-d’œuvre de <b>Diego Velázquez</b>, peintre de la cour du roi Philippe IV. L’infante Marguerite-Thérèse y est entourée de ses demoiselles d’honneur, les <i>meninas</i>. Velázquez s’est peint lui-même devant sa toile, et le roi et la reine apparaissent… <b>reflétés dans un miroir</b> au fond. En 1957, Picasso en a peint 58 variations.',
      qs: [
        { q: 'Qui a peint Las Meninas ?', a: 'Diego Velázquez', o: ['Francisco de Goya', 'Pablo Picasso', 'El Greco'] },
        { q: 'Qui apparaît dans le miroir du tableau ?', a: 'Le roi et la reine', o: ['Le peintre', 'Un chien', 'L’infante'] },
        { tf: 'Velázquez s’est représenté lui-même dans Las Meninas.', v: true },
        { q: 'Les « meninas » sont…', a: 'les demoiselles d’honneur de l’infante', o: ['des religieuses', 'des danseuses de flamenco', 'les filles du peintre'] },
      ] },
    { id: 'reyes', u: 'u1', e: '⚔️', cat: 'Histoire', name: 'Los Reyes Católicos', sub: '1492',
      text: '<b>Isabelle de Castille</b> et <b>Ferdinand d’Aragon</b>, mariés en 1469, unissent leurs royaumes. L’année <b>1492</b> change tout : prise de Grenade (fin de la Reconquista), expulsion des juifs, voyage de Christophe Colomb vers l’Amérique avec leur soutien, et publication par Nebrija de la première grammaire du castillan.',
      qs: [
        { q: 'Qui a financé le voyage de Christophe Colomb ?', a: 'Isabelle de Castille et Ferdinand d’Aragon', o: ['Philippe II', 'Charles Quint', 'Alphonse X le Sage'] },
        { q: 'Quelle ville est prise en 1492, mettant fin à la Reconquista ?', a: 'Grenade', o: ['Séville', 'Tolède', 'Cordoue'] },
        { tf: 'En 1492 paraît la première grammaire de la langue castillane.', v: true },
        { q: 'En quelle année Isabelle et Ferdinand se marient-ils ?', a: '1469', o: ['1492', '1516', '1412'] },
      ] },
    { id: 'transicion', u: 'u1', e: '🗳️', cat: 'Histoire', name: 'La Transición', sub: '1975 – 1982',
      text: 'Après la guerre civile (1936-1939), <b>Franco</b> gouverne en dictateur jusqu’à sa mort en 1975. Le roi Juan Carlos I accompagne alors le retour à la démocratie : la <b>Constitution de 1978</b> est approuvée par référendum. Le 23 février 1981 (le « 23-F »), une tentative de coup d’État échoue au Parlement. Dans les années 80, la <i>Movida madrileña</i> explose, avec le cinéaste Pedro Almodóvar.',
      qs: [
        { q: 'En quelle année la Constitution espagnole actuelle est-elle approuvée ?', a: '1978', o: ['1975', '1939', '1992'] },
        { q: 'Que s’est-il passé le « 23-F » (23 février 1981) ?', a: 'Une tentative de coup d’État', o: ['La mort de Franco', 'Les JO de Barcelone', 'L’entrée dans l’euro'] },
        { tf: 'Franco a gouverné l’Espagne jusqu’à sa mort, en 1975.', v: true },
        { q: 'Quel cinéaste est associé à la Movida madrileña ?', a: 'Pedro Almodóvar', o: ['Luis Buñuel', 'Carlos Saura', 'Alejandro Amenábar'] },
      ] },
    // Unité 2
    { id: 'mercadocentral', u: 'u2', e: '🏬', cat: 'Lieu', name: 'Mercado Central', sub: 'Valencia · 1928',
      text: 'Inauguré en <b>1928</b>, ce chef-d’œuvre du modernisme valencien mêle <b>fer, verre et céramique</b> sous de grandes coupoles. C’est l’un des plus grands marchés de produits frais d’Europe, avec plusieurs centaines d’étals. Sur sa coupole, une girouette en forme de <b>perroquet</b>, la <i>cotorra del mercat</i>, est devenue un symbole de la ville. Chaque quartier espagnol garde son <i>mercado de abastos</i>, le marché où l’on fait ses courses.',
      qs: [
        { q: 'En quelle année le Mercado Central de Valence a-t-il été inauguré ?', a: '1928', o: ['1492', '1819', '1992'] },
        { q: 'Quels matériaux caractérisent son architecture ?', a: 'Fer, verre et céramique', o: ['Bois et paille', 'Béton brut', 'Marbre et or'] },
        { q: 'Quel animal surmonte sa coupole ?', a: 'Un perroquet (la cotorra)', o: ['Un taureau', 'Un coq', 'Une chauve-souris'] },
        { q: 'Comment appelle-t-on le marché de quartier traditionnel ?', a: 'Mercado de abastos', o: ['Supermercado', 'Mercadillo de arte', 'Plaza de toros'] },
      ] },
    { id: 'horarios', u: 'u2', e: '🕑', cat: 'Société', name: 'Los horarios', sub: 'Vivre à l’heure espagnole',
      text: 'En Espagne, on déjeune vers <b>14 h – 15 h 30</b> et on dîne vers <b>21 h – 22 h 30</b>. Beaucoup de petits commerces ferment en début d’après-midi et rouvrent vers 17 h. Une explication : depuis <b>1940</b>, l’Espagne vit à l’heure de l’Europe centrale (choix de Franco pour s’aligner sur l’Allemagne), alors qu’elle est géographiquement à l’ouest. Le soleil se couche donc tard… et on dîne tard !',
      qs: [
        { q: 'À quelle heure dîne-t-on souvent en Espagne ?', a: 'Vers 21 h – 22 h 30', o: ['Vers 18 h', 'Vers 19 h 30', 'Après minuit'] },
        { q: 'Depuis quand l’Espagne est-elle à l’heure de l’Europe centrale ?', a: '1940', o: ['1492', '1978', '2002'] },
        { tf: 'L’Espagne continentale a la même heure que le Royaume-Uni.', v: false, x: 'Elle a l’heure de Paris et Berlin ; seules les Canaries sont à l’heure de Londres.' },
        { q: 'Pourquoi le soleil se couche-t-il si tard en Espagne ?', a: 'Le pays est à l’ouest mais suit l’heure de l’Europe centrale', o: ['À cause de la sieste', 'Parce que l’Espagne est au sud', 'À cause de la mer Méditerranée'] },
      ] },
    { id: 'alandalus', u: 'u2', e: '🕌', cat: 'Histoire', name: 'Al-Ándalus', sub: '711 – 1492',
      text: 'En <b>711</b>, des armées musulmanes venues d’Afrique du Nord entrent dans la péninsule. Pendant près de huit siècles, <i>Al-Ándalus</i> rayonne : <b>Cordoue</b> devient capitale d’un califat (929) et l’une des plus grandes villes d’Europe, avec sa Grande Mosquée (la <i>Mezquita</i>). À Grenade, les sultans nasrides bâtissent l’<b>Alhambra</b>. Les philosophes Averroès et Maïmonide sont nés à Cordoue.',
      qs: [
        { q: 'En quelle année commence l’histoire d’Al-Ándalus ?', a: '711', o: ['1492', '1212', '476'] },
        { q: 'Dans quelle ville se trouve l’Alhambra ?', a: 'Grenade', o: ['Cordoue', 'Séville', 'Tolède'] },
        { q: 'Quelle ville fut la capitale du califat ?', a: 'Cordoue', o: ['Grenade', 'Madrid', 'Valence'] },
        { tf: 'Averroès et Maïmonide sont tous deux nés à Cordoue.', v: true },
      ] },
    { id: 'arabe', u: 'u2', e: '🫒', cat: 'Langue', name: 'Las palabras árabes', sub: 'Un héritage dans l’assiette',
      text: 'L’espagnol compte des milliers de mots d’origine arabe, souvent reconnaissables à leur début en <b>al-</b> ou <b>a-</b> (l’article arabe) : <i>aceite</i> (huile), <i>aceituna</i> (olive), <i>azúcar</i>, <i>arroz</i>, <i>alcachofa</i> (artichaut), <i>albóndiga</i> (boulette), <i>azafrán</i> (safran), mais aussi <i>naranja</i>, <i>limón</i> et <i>zanahoria</i>. Même <b>ojalá</b> (« pourvu que ») vient d’une expression arabe signifiant « si Dieu le veut ».',
      qs: [
        { q: 'Lequel de ces mots vient de l’arabe ?', a: 'aceite', o: ['leche', 'pan', 'queso'] },
        { q: '« Ojalá » vient d’une expression arabe qui signifie…', a: '« si Dieu le veut »', o: ['« bon appétit »', '« bonjour »', '« au marché »'] },
        { q: 'À quoi correspond souvent le début « al- » de ces mots ?', a: 'À l’article arabe (« le, la »)', o: ['À un mot latin', 'À un nom de ville', 'À un diminutif'] },
        { tf: '« Zanahoria » (la carotte) est un mot d’origine arabe.', v: true },
      ] },
    { id: 'paella', u: 'u2', e: '🥘', cat: 'Gastronomie', name: 'La paella', sub: 'Valence',
      text: 'Née autour de l’<b>Albufera</b>, la lagune de Valence, où l’on cultive le riz depuis l’époque d’Al-Ándalus. Le mot <i>paella</i> désigne d’abord la <b>poêle</b> large et plate (du latin <i>patella</i>). La recette valencienne traditionnelle : riz, <b>poulet, lapin</b>, haricots verts, gros haricots blancs (<i>garrofó</i>) et safran — sans fruits de mer ! Le <i>socarrat</i>, c’est le riz croustillant du fond.',
      qs: [
        { q: 'De quelle région vient la paella ?', a: 'Valence', o: ['Andalousie', 'Galice', 'Pays basque'] },
        { q: 'Que désigne d’abord le mot « paella » ?', a: 'La poêle', o: ['Le riz', 'Le safran', 'Une fête'] },
        { q: 'Qu’est-ce que le « socarrat » ?', a: 'Le riz croustillant au fond de la poêle', o: ['Une sauce à l’ail', 'Un fruit de mer', 'Le couvercle'] },
        { tf: 'La paella valenciana traditionnelle contient du poulet et du lapin.', v: true },
      ] },
    // Unité 3
    { id: 'gaudi', u: 'u3', e: '⛪', cat: 'Personnage', name: 'Antoni Gaudí', sub: '1852 – 1926',
      text: 'Architecte du <b>modernisme catalan</b>, inspiré par les formes de la nature. On lui doit la Casa Batlló, la Casa Milà (<i>La Pedrera</i>), le Park Güell… et surtout la <b>Sagrada Família</b>, commencée en <b>1882</b> : Gaudí y consacre plus de quarante ans. Il meurt en 1926, renversé par un tramway, sans voir l’œuvre achevée ; les travaux se poursuivent encore au XXIᵉ siècle.',
      qs: [
        { q: 'En quelle année la construction de la Sagrada Família commence-t-elle ?', a: '1882', o: ['1926', '1992', '1756'] },
        { q: 'Lequel de ces bâtiments n’est PAS de Gaudí ?', a: 'Le musée Guggenheim de Bilbao', o: ['La Casa Batlló', 'Le Park Güell', 'La Pedrera'] },
        { tf: 'Gaudí a vu la Sagrada Família terminée.', v: false, x: 'Il meurt en 1926 ; la basilique est encore en chantier un siècle plus tard.' },
        { q: 'Comment Gaudí est-il mort ?', a: 'Renversé par un tramway', o: ['Pendant la guerre civile', 'En tombant d’un échafaudage', 'De vieillesse, à 95 ans'] },
      ] },
    { id: 'catalan', u: 'u3', e: '🗣️', cat: 'Langue', name: 'El catalán', sub: 'Català',
      text: 'Langue romane, <b>co-officielle</b> avec l’espagnol en Catalogne, aux Baléares et (sous le nom de <i>valencien</i>) dans la région de Valence. C’est aussi la langue officielle d’<b>Andorre</b>. Quelques mots : <i>Bon dia</i> (bonjour), <i>Gràcies</i> (merci), <i>Adéu</i> (au revoir). L’Espagne a d’autres langues co-officielles : le galicien et le <b>basque</b> (<i>euskera</i>), qui n’est même pas une langue indo-européenne.',
      qs: [
        { q: 'Comment dit-on « merci » en catalan ?', a: 'Gràcies', o: ['Obrigado', 'Eskerrik asko', 'Grazas'] },
        { q: 'Dans quel pays le catalan est-il la seule langue officielle ?', a: 'Andorre', o: ['Monaco', 'Portugal', 'Malte'] },
        { tf: 'Le basque est une langue latine, comme le catalan.', v: false, x: 'Le basque (euskera) n’est pas indo-européen : son origine reste mystérieuse.' },
        { q: 'Comment s’appelle le catalan parlé dans la région de Valence ?', a: 'Le valencien', o: ['Le galicien', 'L’aragonais', 'L’andalou'] },
      ] },
    { id: 'picasso', u: 'u3', e: '🎨', cat: 'Personnage', name: 'Pablo Picasso', sub: '1881 – 1973',
      text: 'Né à <b>Málaga</b> en 1881, Picasso passe sa jeunesse à Barcelone avant de s’installer en France. Il invente le <b>cubisme</b> avec Georges Braque. En <b>1937</b>, il peint <i>Guernica</i> après le bombardement de cette ville basque pendant la guerre civile. Le tableau est revenu en Espagne en 1981 et se trouve aujourd’hui au <b>musée Reina Sofía</b> de Madrid. Barcelone a son musée Picasso.',
      qs: [
        { q: 'Dans quelle ville Picasso est-il né ?', a: 'Málaga', o: ['Barcelone', 'Madrid', 'Paris'] },
        { q: 'Quel événement Guernica dénonce-t-il ?', a: 'Le bombardement d’une ville basque en 1937', o: ['La prise de Grenade', 'Le coup d’État de 1981', 'Les JO de 1992'] },
        { tf: 'Guernica est exposé au musée Picasso de Barcelone.', v: false, x: 'Guernica est au musée Reina Sofía, à Madrid.' },
        { q: 'Avec qui Picasso a-t-il inventé le cubisme ?', a: 'Georges Braque', o: ['Salvador Dalí', 'Joan Miró', 'Henri Matisse'] },
      ] },
    { id: 'jo92', u: 'u3', e: '🏅', cat: 'Histoire', name: 'Barcelona 92', sub: 'Jeux olympiques',
      text: 'Les Jeux olympiques de <b>1992</b> transforment Barcelone : la ville s’ouvre sur la mer avec de nouvelles plages et un port olympique. Le stade est sur la colline de <b>Montjuïc</b> et la mascotte, <b>Cobi</b>, est un chien dessiné par Javier Mariscal. 1992 est une grande année pour l’Espagne : Séville accueille aussi l’Exposition universelle.',
      qs: [
        { q: 'Qui est Cobi ?', a: 'La mascotte des JO, un chien', o: ['Un architecte', 'Un champion de natation', 'Un roi de Catalogne'] },
        { q: 'Sur quelle colline se trouve le stade olympique ?', a: 'Montjuïc', o: ['Tibidabo', 'Montserrat', 'Le Park Güell'] },
        { tf: 'En 1992, Séville accueille aussi une Exposition universelle.', v: true },
        { q: 'Comment les JO ont-ils transformé la ville ?', a: 'Elle s’est ouverte sur la mer (plages, port olympique)', o: ['Elle a perdu son port', 'Elle est devenue capitale de l’Espagne', 'Elle a construit la Sagrada Família'] },
      ] },
    { id: 'tapas', u: 'u3', e: '🍢', cat: 'Gastronomie', name: 'Las tapas', sub: 'Ir de tapas',
      text: 'Petites portions servies avec une boisson, à partager. <i>Ir de tapas</i> (ou <i>tapear</i>), c’est passer d’un bar à l’autre entre amis. Selon une légende, on posait une tranche de pain ou de jambon sur le verre pour le <b>couvrir</b> (<i>tapar</i>) et le protéger des mouches. Au Pays basque, on dit <i>pintxos</i> ; à Grenade ou León, la tapa est souvent <b>offerte</b> avec la boisson.',
      qs: [
        { q: 'D’où viendrait le mot « tapa » selon la légende ?', a: 'Du verbe « tapar » : couvrir le verre', o: ['D’un roi nommé Tapa', 'Du mot arabe pour « petit »', 'D’une ville andalouse'] },
        { q: 'Comment appelle-t-on les tapas au Pays basque ?', a: 'Pintxos', o: ['Raciones', 'Bocadillos', 'Churros'] },
        { tf: 'À Grenade, la tapa est souvent offerte avec la boisson.', v: true },
        { q: 'Que signifie « ir de tapas » ?', a: 'Aller de bar en bar manger des tapas', o: ['Cuisiner à la maison', 'Faire ses courses', 'Prendre le petit-déjeuner'] },
      ] },
    // Cromos dorés (coffres de fin d'unité)
    { id: 'cervantes', u: 'u1', gold: true, e: '📖', cat: 'Personnage', name: 'Miguel de Cervantes', sub: '1547 – 1616',
      text: 'Auteur de <b>Don Quichotte</b> (1605 et 1615), souvent considéré comme le premier roman moderne : un hidalgo qui se prend pour un chevalier charge des <b>moulins à vent</b> qu’il croit être des géants, accompagné de son écuyer <b>Sancho Panza</b>. Blessé à la main gauche à la bataille de Lépante (1571), captif cinq ans à Alger, Cervantes meurt à <b>Madrid</b> en avril 1616. L’espagnol est « la langue de Cervantes ».',
      qs: [
        { q: 'Comment s’appelle l’écuyer de Don Quichotte ?', a: 'Sancho Panza', o: ['Rossinante', 'Dulcinée', 'Lazarillo'] },
        { q: 'Contre quoi Don Quichotte se bat-il, croyant affronter des géants ?', a: 'Des moulins à vent', o: ['Des taureaux', 'Des oliviers', 'Des statues'] },
        { q: 'En quelle année paraît la première partie de Don Quichotte ?', a: '1605', o: ['1492', '1715', '1898'] },
        { tf: 'Cervantes est mort à Madrid.', v: true },
      ] },
    { id: 'tomatina', u: 'u2', gold: true, e: '🍅', cat: 'Fête', name: 'La Tomatina', sub: 'Buñol · fin août',
      text: 'Chaque <b>dernier mercredi d’août</b>, la petite ville de <b>Buñol</b>, près de Valence, se transforme en champ de bataille : pendant une heure, des milliers de participants se lancent des tonnes de tomates bien mûres. La fête existe depuis les années 1940 et attire des visiteurs du monde entier. Ensuite, on lave les rues… au jet d’eau.',
      qs: [
        { q: 'Où a lieu la Tomatina ?', a: 'À Buñol, près de Valence', o: ['À Pampelune', 'À Séville', 'À Madrid'] },
        { q: 'Quand a lieu la Tomatina ?', a: 'Le dernier mercredi d’août', o: ['Le 31 décembre', 'Le 23 avril', 'Pendant la Semaine sainte'] },
        { tf: 'La Tomatina a lieu à Pampelune.', v: false, x: 'Pampelune, c’est la fête de San Fermín (juillet). La Tomatina, c’est Buñol.' },
      ] },
    { id: 'santjordi', u: 'u3', gold: true, e: '🌹', cat: 'Fête', name: 'Sant Jordi', sub: '23 avril',
      text: 'Le <b>23 avril</b>, jour de Sant Jordi (saint Georges, patron de la Catalogne), les rues de Barcelone se couvrent d’étals : on offre <b>une rose et un livre</b>. La date coïncide avec la mort de Cervantes et de Shakespeare en 1616 : c’est pourquoi l’UNESCO en a fait la <b>Journée mondiale du livre</b>.',
      qs: [
        { q: 'Qu’offre-t-on traditionnellement à Sant Jordi ?', a: 'Une rose et un livre', o: ['Des tomates', 'Un gâteau', 'Des raisins'] },
        { q: 'Pourquoi l’UNESCO a-t-elle choisi le 23 avril comme Journée du livre ?', a: 'C’est la date de la mort de Cervantes et de Shakespeare', o: ['C’est la naissance de Gaudí', 'C’est la date des JO de 1992', 'C’est le jour de la Constitution'] },
        { tf: 'Sant Jordi est le saint patron de la Catalogne.', v: true },
      ] },
  ];

  /* ------------------------------------------------------------------ TEST DE NIVEAU */
  const placement = [
    // Palier 1 — bases (unité 1)
    { t: 1, q: 'Que veut dire « Gracias » ?', a: 'Merci', o: ['S’il vous plaît', 'Bonjour', 'Pardon'] },
    { t: 1, say: 'Traduis : « Je m’appelle Ana. »', acc: ['me llamo ana', 'yo me llamo ana', 'mi nombre es ana', 'soy ana'], sol: 'Me llamo Ana.' },
    { t: 1, q: '« treinta y cinco » =', a: '35', o: ['53', '25', '45'] },
    { t: 1, q: 'Nosotros ___ franceses.', a: 'somos', o: ['son', 'sois', 'soy'] },
    // Palier 2 — courses (unité 2)
    { t: 2, q: '« la manzana » =', a: 'la pomme', o: ['l’orange', 'la fraise', 'la poire'] },
    { t: 2, q: 'Que veut dire « ¿Cuánto cuesta? » ?', a: 'Combien ça coûte ?', o: ['Comment ça va ?', 'Où est-ce ?', 'Qu’est-ce que c’est ?'] },
    { t: 2, say: 'Complète : « Yo ___ pan todos los días. » (comprar)', acc: ['compro'], sol: 'compro' },
    { t: 2, q: 'un limón → dos ___', a: 'limones', o: ['limóns', 'limónes', 'limons'] },
    // Palier 3 — repas (unité 3)
    { t: 3, q: 'Me ___ las fresas.', a: 'gustan', o: ['gusta', 'gusto', 'gustas'] },
    { t: 3, q: 'On dit « La cuenta, por favor » pour demander…', a: 'l’addition', o: ['la carte', 'une table', 'l’heure'] },
    { t: 3, say: 'Complète : « Ellos ___ a las dos. » (comer)', acc: ['comen'], sol: 'comen' },
    { t: 3, q: '« J’ai faim » =', a: 'Tengo hambre.', o: ['Soy hambre.', 'Estoy hambre.', 'Hay hambre.'] },
    // Palier 4 — A1+ (au-delà de la démo)
    { t: 4, q: 'Madrid ___ en el centro de España.', a: 'está', o: ['es', 'hay', 'son'] },
    { t: 4, q: 'Hoy yo ___ muy cansado.', a: 'estoy', o: ['soy', 'es', 'tengo'] },
    { t: 4, q: '___ un museo cerca del hotel.', a: 'Hay', o: ['Está', 'Es', 'Tiene'] },
    { t: 4, say: 'Complète : « Yo me ___ a las siete. » (levantarse)', acc: ['levanto'], sol: 'levanto' },
    // Palier 5 — A2 (temps du passé)
    { t: 5, q: 'Ayer yo ___ paella. (comer)', a: 'comí', o: ['como', 'comía', 'comeré'] },
    { t: 5, q: 'El verano pasado nosotros ___ a Sevilla. (ir)', a: 'fuimos', o: ['vamos', 'íbamos', 'iremos'] },
    { t: 5, q: 'He ___ el Museo del Prado.', a: 'visitado', o: ['visitar', 'visité', 'visitando'] },
    { t: 5, q: 'Cuando era niño, ___ al fútbol todos los días.', a: 'jugaba', o: ['jugué', 'juego', 'jugaré'] },
  ];

  const levelsText = [
    { t: 0, n: 'Débutant', d: 'On repart des bases : salutations, présentations, nombres. Ça revient vite, promis !' },
    { t: 1, n: 'Faux débutant', d: 'Tu as gardé les bases. L’unité 1 est validée : direction le marché (unité 2) !' },
    { t: 2, n: 'A1 en cours', d: 'Courses et verbes en -ar : c’est acquis. Les unités 1 et 2 sont validées, cap sur Barcelone !' },
    { t: 3, n: 'A1', d: 'Toutes les leçons de la démo sont validées ! Il te reste les niveaux Cultura (cromos) et les défis (tampons) à jouer.' },
    { t: 4, n: 'A1+', d: 'Tu maîtrises aussi ser / estar et hay. Les prochaines unités (Andalousie…) iront plus loin.' },
    { t: 5, n: 'A2', d: 'Tu reconnais même les temps du passé ! Les futures unités te proposeront des défis à ta mesure.' },
  ];

  const soon = [
    { e: '🍢', t: 'País Vasco', city: 'Bilbao', cityFr: 'Bilbao', region: 'Euskadi', lon: -2.93, lat: 43.26, char: 'inaki',
      d: 'Bilbao, Saint-Sébastien · les pintxos · le Guggenheim, l’euskera', costume: 'La txapela, le béret basque.' },
    { e: '🐚', t: 'El Camino de Santiago', city: 'Santiago', cityFr: 'Saint-Jacques-de-Compostelle', region: 'Galicia', lon: -8.54, lat: 42.88, char: 'xose',
      d: 'Directions et transports · le passé composé · la Galice', costume: 'Chapeau, bâton et coquille Saint-Jacques : la tenue du pèlerin.' },
    { e: '💃', t: 'Andalucía', city: 'Sevilla', cityFr: 'Séville', region: 'Andalucía', lon: -5.98, lat: 37.39, char: 'rocio',
      d: 'Séville, Grenade, Cordoue · ser y estar · le flamenco, García Lorca', costume: 'Robe à volants et à pois, fleur dans les cheveux : le traje de flamenca de la Feria de abril.' },
  ];


  /* ================================================================== NIVEAU B1
     On part du principe d'un niveau B1 : les éléments marqués « base » (b) ne passent qu'une
     fois, en échauffement ; chaque leçon reçoit des éléments B1 et une fiche de grammaire B1. */
  const B1 = {
    u1l1: {
      title: 'Saludos y reencuentros', fr: 'Saluer, se retrouver, souhaiter (que + subjonctif)',
      basic: '*',
      tip: `<h3>B1 · Souhaits et retrouvailles</h3>
<p><b>Que + subjonctif</b> pour souhaiter : <i>¡Que tengas buen viaje!</i> · <i>¡Que te mejores!</i> · <i>¡Que lo pases bien!</i> · <i>Espero que estés bien.</i></p>
<table><tr><th>Subjonctif présent</th><td>-ar → -e : hable, hables…</td><td>-er / -ir → -a : coma, viva…</td></tr>
<tr><th>Irréguliers fréquents</th><td colspan="2">tener → tenga · estar → esté · ser → sea · ir → vaya · hacer → haga · venir → venga</td></tr></table>
<p><b>Hace + durée + que</b> : <i>Hace dos años que no nos vemos</i> (ça fait deux ans qu’on ne se voit pas).</p>
<p><b>quedar</b> = se donner rendez-vous : <i>¿Quedamos a las ocho?</i> · <b>echar de menos</b> = regretter l’absence : <i>Te echo de menos</i> (tu me manques).</p>`,
      items: [
        P('¡Cuánto tiempo sin verte!', 'Ça fait longtemps qu’on ne s’est pas vus !'),
        P('Me alegro mucho de verte.', 'Je suis très content de te voir.'),
        W('quedar (con alguien)', 'se retrouver, avoir rendez-vous (avec qqn)', '📅', { alt: ['quedar', 'quedar con alguien'] }),
        P('¿Quedamos mañana a las ocho en la Puerta del Sol?', 'On se retrouve demain à huit heures à la Puerta del Sol ?'),
        G('¡Que ___ un buen viaje! (tener, tú)', 'tengas', ['tienes', 'tenías', 'tendrás'], 'Bon voyage !', { x: 'Souhait : que + subjonctif présent (tener → tenga, tengas…).' }),
        G('Espero que ___ bien. (estar, vosotros)', 'estéis', ['estáis', 'estabais', 'estaréis'], 'J’espère que vous allez bien.', { x: 'esperar que + subjonctif.' }),
        G('Hace dos años que no nos ___. (ver)', 'vemos', ['vimos', 'veíamos', 'veamos'], 'Ça fait deux ans qu’on ne se voit pas.', { x: 'hace + durée + que + présent : « ça fait… que ».' }),
        G('¡Que te ___! (mejorarse, tú)', 'mejores', ['mejoras', 'mejoraste', 'mejorarás'], 'Prompt rétablissement !', { x: 'Formule figée au subjonctif, pour quelqu’un de malade.' }),
        W('echar de menos', 'regretter l’absence de (manquer)', '💭'),
        P('Te echo mucho de menos.', 'Tu me manques beaucoup.'),
        D('Dans la rue, un vieil ami te reconnaît :', '¡Hombre, cuánto tiempo! ¿Qué es de tu vida?', 'Ça alors, ça fait longtemps ! Qu’est-ce que tu deviens ?', 'Pues aquí estoy, con mucho trabajo. ¿Y tú, qué tal?',
          ['Pues de nada, gracias.', 'Es mi vida, perdón.', 'Hasta luego, mi vida.'], { x: '« ¿Qué es de tu vida? » = que deviens-tu ?' }),
        D('En partant, ta logeuse te dit :', 'Bueno, ¡que lo pases muy bien en Valencia!', 'Bon, amuse-toi bien à Valence !', '¡Gracias! Nos vemos a la vuelta.',
          ['¡Gracias! Que lo pasé muy bien.', 'Gracias, lo paso ayer.', '¡De nada, que pase usted!'], { x: 'pasarlo bien = s’amuser ; « a la vuelta » = au retour.' }),
      ],
    },
    u1l2: {
      title: 'Hablar de ti', fr: 'Se présenter, ser / estar, raconter son passé',
      basic: '*',
      tip: `<h3>B1 · ser ou estar ?</h3>
<table><tr><th>ser</th><td>identité, profession, origine, caractère, heure, événement (<i>la fiesta es en mi casa</i>)</td></tr>
<tr><th>estar</th><td>lieu d’une personne ou d’un objet, état passager (<i>estoy cansado</i>), résultat (<i>está cerrado</i>)</td></tr></table>
<h3>B1 · Raconter au passé</h3>
<table><tr><th>indefinido</th><td>action terminée, moment précis : <i>ayer, en 2010, el año pasado</i></td><td>-ar : -é, -aste, -ó, -amos, -asteis, -aron · -er/-ir : -í, -iste, -ió, -imos, -isteis, -ieron</td></tr>
<tr><th>imperfecto</th><td>description, habitude : <i>cuando era pequeño…</i></td><td>-ar : -aba · -er/-ir : -ía · ser → era · ir → iba</td></tr></table>
<p><i>Se me ha olvidado</i> : l’oubli « m’est arrivé » (tournure très fréquente). <i>¿A qué te dedicas?</i> = que fais-tu dans la vie ?</p>`,
      items: [
        CJ('estar'),
        G('Mi hermana ___ médica en un hospital de Lyon.', 'es', ['está', 'hay', 'tiene'], 'Ma sœur est médecin dans un hôpital de Lyon.', { x: 'Profession → ser.' }),
        G('Hoy ___ muy cansado: he dormido fatal.', 'estoy', ['soy', 'tengo', 'hay'], 'Aujourd’hui je suis très fatigué : j’ai très mal dormi.', { x: 'État passager → estar.' }),
        G('La fiesta ___ en casa de Lucía.', 'es', ['está', 'hay', 'son'], 'La fête a lieu chez Lucía.', { x: 'Un événement qui « a lieu » → ser. Une personne ou un objet → estar.' }),
        G('Ayer ___ a Madrid en AVE. (llegar, yo)', 'llegué', ['llegé', 'llego', 'llegaba'], 'Hier je suis arrivé à Madrid en AVE.', { x: 'Indefinido : -gar → -gué à la 1re personne. L’AVE est le TGV espagnol.' }),
        G('Cuando era pequeño, ___ en un pueblo de Bretaña. (vivir, yo)', 'vivía', ['viví', 'vivo', 'viviré'], 'Quand j’étais petit, je vivais dans un village de Bretagne.', { x: 'Description ou habitude dans le passé → imperfecto.' }),
        G('En 2010 ___ el bachillerato. (terminar, yo)', 'terminé', ['terminaba', 'termino', 'he terminado'], 'En 2010, j’ai fini le bac.', { x: 'Action terminée à une date précise → indefinido.' }),
        W('¿a qué te dedicas?', 'qu’est-ce que tu fais dans la vie ?', '💼'),
        W('la empresa', 'l’entreprise', '🏢'),
        W('jubilado', 'retraité', '👴'),
        W('el paro', 'le chômage'),
        P('Trabajo en una empresa de informática desde hace cinco años.', 'Je travaille dans une entreprise informatique depuis cinq ans.'),
        P('Estudié español en el instituto, pero se me ha olvidado casi todo.', 'J’ai étudié l’espagnol au lycée, mais j’ai presque tout oublié.', { h: '« se me ha olvidado » : l’oubli « m’est arrivé ».' }),
        D('Une collègue espagnole te demande :', '¿Y tú a qué te dedicas?', 'Et toi, tu fais quoi dans la vie ?', 'Soy ingeniero, trabajo en una empresa de software.',
          ['Me dedico a Madrid desde ayer.', 'Estoy ingeniero de software.', 'Soy de dedicar mucho.'], { x: 'Profession : ser, sans article (soy ingeniero).' }),
      ],
    },
    u1l3: {
      title: 'Moverse por Madrid', fr: 'Demander son chemin, impératif de politesse, comparer',
      basic: '*', keep: ['n21'],
      tip: `<h3>B1 · L’impératif de politesse (usted)</h3>
<p>Il se forme comme le subjonctif : <i>tomar → tome</i>, <i>seguir → siga</i>, <i>girar → gire</i>, <i>coger → coja</i>, <i>cruzar → cruce</i>. Pluriel (ustedes) : <i>tomen, sigan</i>.</p>
<p>Plus poli encore : le conditionnel. <i>¿Podría decirme dónde está…?</i> · <i>¿Me podría ayudar?</i></p>
<h3>B1 · Comparer</h3>
<p><i>más … que</i> · <i>menos … que</i> · <i>tan … como</i> · <i>tanto/a … como</i>. Irréguliers : <i>mejor, peor, mayor, menor</i>.</p>
<p><b>hay</b> + article indéfini (<i>¿Hay una farmacia?</i>) · <b>está</b> + article défini (<i>¿Dónde está la farmacia?</i>). Distance : <i>está a cinco minutos andando</i>.</p>`,
      items: [
        P('Siga todo recto y gire la segunda a la izquierda.', 'Continuez tout droit et prenez la deuxième à gauche.', { h: 'Impératif de politesse (usted) : siga, gire.' }),
        G('___ la tercera calle a la derecha. (tomar, usted)', 'Tome', ['Toma', 'Tomé', 'Tomar'], 'Prenez la troisième rue à droite.', { x: 'Impératif usted = forme du subjonctif : tome, siga, gire, coja.' }),
        G('Perdone, ¿me ___ decir dónde está el Prado? (poder, usted)', 'podría', ['podrías', 'pudo', 'podré'], 'Pardon, pourriez-vous me dire où est le Prado ?', { x: 'Conditionnel de politesse avec usted : podría.' }),
        W('el semáforo', 'le feu (de circulation)', '🚦'),
        W('el cruce', 'le carrefour', '✖️'),
        W('la parada de autobús', 'l’arrêt de bus', '🚏'),
        W('la manzana (de casas)', 'le pâté de maisons', '🏘️', { alt: ['la manzana'] }),
        P('El museo está a cinco minutos andando.', 'Le musée est à cinq minutes à pied.'),
        G('Madrid es más grande ___ Barcelona.', 'que', ['de', 'como', 'a'], 'Madrid est plus grande que Barcelone.'),
        G('A esta hora, el metro es tan rápido ___ el autobús.', 'como', ['que', 'de', 'a'], 'À cette heure-ci, le métro est aussi rapide que le bus.'),
        G('¿___ una farmacia por aquí cerca?', 'Hay', ['Está', 'Es', 'Tiene'], 'Il y a une pharmacie près d’ici ?', { x: 'hay + article indéfini (una farmacia) ; está + article défini (la farmacia).' }),
        G('Perdone, ¿dónde ___ la farmacia de la plaza?', 'está', ['hay', 'es', 'tiene'], 'Pardon, où est la pharmacie de la place ?', { x: 'Lieu d’un élément précis → estar.' }),
        D('Un passant t’indique le chemin :', 'Está un poco lejos. Le aconsejo que coja el metro.', 'C’est un peu loin. Je vous conseille de prendre le métro.', 'Vale, ¿y en qué parada me bajo?',
          ['Vale, ¿y cuándo cojo usted?', 'Sí, cojo lejos ayer.', 'No, gracias, está metro.'], { x: 'aconsejar que + subjonctif (coja). En Espagne, « coger » est un verbe neutre.' }),
      ],
    },
    u2l1: {
      title: 'En el puesto de fruta', fr: 'Fruits et légumes, estar + adjectif, preferir que',
      basic: ['la manzana', 'la naranja', 'el plátano', 'la fresa', 'Una manzana y dos naranjas.', 'el limón', 'la uva', 'la pera', 'una manzana → dos ___', 'un limón → tres ___', '{n} {f}.', 'el tomate', 'la patata', 'la ciudad → las ___', 'Las fresas son rojas.', '¿Necesitamos patatas?'],
      tip: `<h3>B1 · ser / estar avec un adjectif</h3>
<table><tr><th>estar maduro</th><td>être mûr</td><th>ser maduro</th><td>être mature</td></tr>
<tr><th>estar rico</th><td>être bon (plat)</td><th>ser rico</th><td>être riche</td></tr>
<tr><th>estar verde</th><td>ne pas être mûr</td><th>ser verde</th><td>être vert (couleur)</td></tr></table>
<p><b>preferir / querer que + subjonctif</b> : <i>Prefiero que me dé las pequeñas</i>. Condition : <i>póngame una, pero que no sea muy grande</i>.</p>
<p>Pronom de reprise : <i>las de Murcia</i> (celles de Murcie), <i>los de aquí</i> (ceux d’ici).</p>`,
      items: [
        W('la cereza', 'la cerise', '🍒'),
        W('el melocotón', 'la pêche', '🍑'),
        W('la sandía', 'la pastèque', '🍉'),
        W('el pepino', 'le concombre', '🥒'),
        W('la berenjena', 'l’aubergine', '🍆'),
        W('el calabacín', 'la courgette'),
        W('maduro', 'mûr'),
        W('de temporada', 'de saison', '📆'),
        G('Estos melocotones todavía no ___ maduros.', 'están', ['son', 'hay', 'tienen'], 'Ces pêches ne sont pas encore mûres.', { x: 'estar maduro = être mûr (état) ; ser maduro = être mature.' }),
        G('Prefiero que me ___ las más pequeñas. (dar, usted)', 'dé', ['da', 'dio', 'daría'], 'Je préfère que vous me donniez les plus petites.', { x: 'preferir que + subjonctif (dar → dé).' }),
        P('¿Me deja probar una cereza?', 'Vous me laissez goûter une cerise ?'),
        P('Las de Murcia están más dulces que las de aquí.', 'Celles de Murcie sont plus sucrées que celles d’ici.', { h: 'Avec estar, on parle du goût : « están dulces ».' }),
        D('Le marchand te propose :', 'Llévese una sandía, que mañana ya no quedarán.', 'Prenez une pastèque, demain il n’en restera plus.', 'Vale, póngame una, pero que no sea muy grande.',
          ['Vale, quedan mañana.', 'No, ya no me llevo ayer.', 'Sí, lléveme una sandía.'], { x: '« que no sea muy grande » : que + subjonctif pour exprimer une condition.' }),
      ],
    },
    u2l2: {
      title: 'Pedir con cortesía', fr: 'Quantités, prix, pronoms (me lo pone), imparfait de politesse',
      basic: ['el pan', 'la leche', 'el huevo', 'el queso', 'un kilo de', 'medio kilo de', 'una docena de', 'Un kilo ___ naranjas.', '{q} de {p}, por favor.', 'el arroz', 'la botella', 'Una botella de aceite.', '¿cuánto cuesta?', 'el euro', 'barato', 'caro', '¿Cuánto es?', 'Son cinco euros.', 'El jamón es muy ___.', 'Las manzanas son ___.', 'El queso ___ ocho euros.'],
      tip: `<h3>B1 · Les pronoms compléments</h3>
<table><tr><th>COD</th><td>lo, la, los, las</td><td><i>¿El queso? Lo llevo.</i></td></tr>
<tr><th>COI + COD</th><td>me lo, te la… · le/les + lo → <b>se lo</b></td><td><i>Se lo envuelvo</i> (je vous l’emballe)</td></tr></table>
<p>À l’impératif affirmatif, ils se collent au verbe : <i>póngamelo</i>, <i>déjelo</i>, <i>póngamelas</i> (et on ajoute un accent écrit).</p>
<p><b>Imparfait de politesse</b> : <i>Quería medio kilo de…</i> = je voudrais. Au marché et au bar, on « met » : <i>¿Me pone…?</i>, <i>¿Qué le pongo?</i></p>
<p>Argent : <i>la vuelta</i> (monnaie rendue), <i>el suelto</i> (petite monnaie), <i>no tengo cambio</i> (je n’ai pas de quoi rendre).</p>`,
      items: [
        P('¿Me pone medio kilo de cerezas?', 'Vous me mettez un demi-kilo de cerises ?', { h: '« poner » s’utilise pour commander au marché ou au bar.' }),
        P('Quería doscientos gramos de jamón, cortado muy fino.', 'Je voudrais deux cents grammes de jambon, coupé très fin.', { h: 'Imparfait de politesse : quería = je voudrais.' }),
        G('— ¿Quiere las fresas? — Sí, ___ quiero.', 'las', ['les', 'los', 'la'], '— Vous voulez les fraises ? — Oui, je les veux.', { x: 'Pronom COD féminin pluriel → las.' }),
        G('— ¿Y el queso? — ___ llevo también.', 'Lo', ['Le', 'La', 'Me'], '— Et le fromage ? — Je le prends aussi.', { x: 'COD masculin singulier → lo.' }),
        G('— ¿Le pongo las uvas en una bolsa? — Sí, ___, por favor.', 'póngamelas', ['póngalasme', 'pónemelas', 'me póngalas'], '— Je vous mets le raisin dans un sac ? — Oui, mettez-le-moi.', { x: 'Impératif affirmatif : les pronoms se collent au verbe (ponga + me + las).' }),
        G('— ¿Me envuelve el jamón? — Claro, ahora mismo ___ envuelvo.', 'se lo', ['le lo', 'lo le', 'se la'], '— Vous m’emballez le jambon ? — Bien sûr, je vous l’emballe tout de suite.', { x: 'le + lo → se lo.' }),
        W('el descuento', 'la réduction', '🏷️'),
        W('la vuelta', 'la monnaie (rendue)'),
        W('el dinero suelto', 'la petite monnaie', '🪙', { alt: ['suelto', 'el suelto'] }),
        P('¿Tiene suelto? No tengo cambio de cincuenta.', 'Vous avez de la monnaie ? Je ne peux pas rendre sur cinquante.'),
        P('Quédese con la vuelta.', 'Gardez la monnaie.'),
        D('La vendeuse pèse le fromage :', 'Me he pasado un poco: son trescientos veinte gramos. ¿Se lo dejo así?', 'J’ai un peu dépassé : ça fait 320 grammes. Je vous le laisse comme ça ?', 'Sí, déjelo así, no pasa nada.',
          ['Sí, déjeme pasar.', 'No, son gramos.', 'Sí, me paso también.'], { x: '« Me he pasado » = j’ai dépassé. Réponse : déjelo (impératif usted + lo).' }),
      ],
    },
    u2l3: {
      title: 'De compras', fr: 'Acheter, échanger, passé composé, se me ha olvidado',
      basic: ['comprar', 'necesitar', 'buscar', 'pagar', 'querer', 'Yo ___ pan.', 'Nosotros ___ una bolsa.', 'la tienda', 'el supermercado', 'la bolsa', 'la tarjeta', 'el dinero', '¿Tú ___ con tarjeta?', 'Vosotros ___ el supermercado.', 'hablar', 'Quiero comprar pan.', 'abierto', 'cerrado', 'La tienda está cerrada.', '{s} {o}.'],
      tip: `<h3>B1 · Le passé composé (pretérito perfecto)</h3>
<p><i>haber</i> au présent + participe : <i>he, has, ha, hemos, habéis, han</i> + <i>-ado / -ido</i>. En Espagne, on l’emploie pour un passé lié au présent : <i>hoy, esta mañana, esta semana, todavía no, ya</i>.</p>
<p>Participes irréguliers : <i>hacer → hecho, decir → dicho, ver → visto, poner → puesto, volver → vuelto, escribir → escrito, romper → roto, abrir → abierto</i>.</p>
<p><b>Se me ha olvidado / se me ha caído / se me ha roto</b> : l’accident « m’est arrivé ».</p>
<p><b>necesitar que + subjonctif</b> : <i>Necesito que me dé el tique</i>. Au marché sans numéro : <i>¿Quién es el último?</i></p>`,
      items: [
        G('Hoy ___ al mercado dos veces. (ir, yo)', 'he ido', ['fui', 'iba', 'voy'], 'Aujourd’hui, je suis allé deux fois au marché.', { x: 'En Espagne : hoy, esta semana… + passé composé.' }),
        G('Esta semana todavía no ___ la compra. (hacer, nosotros)', 'hemos hecho', ['hicimos', 'hacíamos', 'hemos hacido'], 'Cette semaine, nous n’avons pas encore fait les courses.', { x: 'Participe irrégulier : hacer → hecho.' }),
        P('Se me ha olvidado la bolsa en casa.', 'J’ai oublié le sac à la maison.', { h: '« se me ha olvidado » : tournure très courante.' }),
        P('¿Me lo puede cambiar por otro?', 'Vous pouvez me l’échanger contre un autre ?'),
        P('Este yogur está caducado.', 'Ce yaourt est périmé.'),
        W('caducado', 'périmé', '⚠️'),
        W('el tique', 'le ticket de caisse', '🧾', { alt: ['el ticket', 'el recibo'] }),
        W('devolver', 'rendre, rembourser', '↩️'),
        W('hacer cola', 'faire la queue', '🚶'),
        G('Si no le queda bien, se lo ___ sin problema. (cambiar, nosotros)', 'cambiamos', ['cambiemos', 'cambiábamos', 'cambiásemos'], 'Si ça ne vous va pas, on vous l’échange sans problème.', { x: 'si + présent → présent (ou futur) dans la principale.' }),
        G('Necesito que me ___ el tique, por favor. (dar, usted)', 'dé', ['da', 'dio', 'dará'], 'J’ai besoin que vous me donniez le ticket, s’il vous plaît.', { x: 'necesitar que + subjonctif.' }),
        D('Au marché, une dame arrive derrière toi :', '¿Quién es el último?', 'Qui est le dernier ?', 'Soy yo. Usted va detrás de mí.',
          ['Soy último de la cola.', 'Estoy el último, gracias.', 'El último es mi tique.'], { x: 'Sans ticket numéroté, on demande « ¿Quién es el último? » pour savoir après qui passer.' }),
      ],
    },
    u3l1: {
      title: 'Las comidas', fr: 'Repas, cuisson, allergies, raconter un repas au passé',
      basic: ['el desayuno', 'la comida', 'la cena', 'el café con leche', 'el zumo de naranja', 'el agua', 'el vino', 'la cerveza', 'Un café con leche, por favor.', 'el bocadillo', 'la ensalada', 'el pescado', 'la carne', 'el pollo', 'el postre', 'Un bocadillo de jamón, por favor.', '{m} es a {h}.'],
      tip: `<h3>B1 · indefinido ou imperfecto ?</h3>
<p><i>La cena <b>estuvo</b> genial</i> (bilan d’un moment terminé) · <i>el pescado <b>estaba</b> salado</i> (description). <i>De pequeño <b>desayunaba</b> churros</i> (habitude).</p>
<p>Indefinidos irréguliers utiles : <i>estar → estuve, tener → tuve, hacer → hice, ir / ser → fui, poder → pude, poner → puse, traer → traje</i>.</p>
<p><b>llevar</b> = contenir : <i>¿Qué lleva la paella?</i> · <i>¿Esto lleva gluten?</i></p>
<p>Cuisson : <i>a la plancha, frito, al horno, poco hecho / al punto / muy hecho</i>. À partager : <i>una ración</i>, <i>media ración</i>.</p>`,
      items: [
        G('¿Qué ___ la paella valenciana? (llevar)', 'lleva', ['trae', 'tiene de', 'lleve'], 'Qu’est-ce qu’il y a dans la paella valencienne ?', { x: 'llevar = contenir (pour un plat).' }),
        G('De pequeño, siempre ___ churros los domingos. (desayunar, yo)', 'desayunaba', ['desayuné', 'desayuno', 'he desayunado'], 'Petit, je mangeais toujours des churros le dimanche matin.', { x: 'Habitude passée → imperfecto.' }),
        G('Anoche ___ en un restaurante gallego buenísimo. (cenar, nosotros)', 'cenamos', ['cenábamos', 'hemos cenado', 'cenemos'], 'Hier soir, nous avons dîné dans un excellent restaurant galicien.', { x: 'anoche (hier soir) → indefinido.' }),
        P('Soy alérgico a los frutos secos.', 'Je suis allergique aux fruits à coque.', { alt: ['Soy alérgica a los frutos secos.', 'Tengo alergia a los frutos secos.'] }),
        P('¿Esto lleva gluten?', 'Est-ce qu’il y a du gluten dedans ?'),
        W('a la plancha', 'grillé (à la plancha)', '🔥'),
        W('frito', 'frit', '🍟'),
        W('al horno', 'au four'),
        W('poco hecho', 'saignant', '🥩'),
        W('la ración', 'la portion (à partager)', '🍽️'),
        W('el aperitivo', 'l’apéritif', '🫒'),
        D('Ton ami te demande :', '¿Qué tal la cena de anoche?', 'C’était comment, le dîner d’hier soir ?', 'Estuvo genial, aunque el pescado estaba un poco salado.',
          ['Está genial mañana.', 'Fue a cenar, gracias.', 'Estaré genial anoche.'], { x: 'Bilan global → estuvo (indefinido) ; description → estaba (imperfecto).' }),
      ],
    },
    u3l2: {
      title: 'Opiniones y gustos', fr: 'gustar, apetecer, creo que / no creo que + subjonctif',
      basic: ['me gusta', 'me gustan', 'no me gusta', '¿te gusta?', 'me encanta', 'Me ___ el chocolate.', 'mucho', 'un poco', 'delicioso', 'dulce', 'frío', 'caliente', '¿___ gusta el vino?'],
      tip: `<h3>B1 · Donner son avis</h3>
<table><tr><th>+ indicatif</th><td><i>Creo que / pienso que / me parece que</i> + indicatif : <i>Creo que está buena.</i></td></tr>
<tr><th>+ subjonctif</th><td><i>No creo que / no pienso que</i> + subjonctif : <i>No creo que sea caro.</i></td></tr>
<tr><th>sentiment</th><td><i>Me encanta / me molesta / no me gusta que</i> + subjonctif : <i>Me molesta que haya tanto ruido.</i></td></tr></table>
<p><b>apetecer</b> et <b>parecer</b> fonctionnent comme <i>gustar</i> : <i>¿Te apetece un vermut?</i> · <i>¿Qué te ha parecido?</i> · <i>Me ha parecido caro.</i></p>
<p>Goût : <i>rico</i> (bon), <i>soso</i> (fade), <i>pesado</i> (lourd), <i>picante</i>, <i>salado</i>.</p>`,
      items: [
        G('No creo que este vino ___ muy caro. (ser)', 'sea', ['es', 'era', 'será'], 'Je ne crois pas que ce vin soit très cher.', { x: 'no creer que + subjonctif.' }),
        G('Creo que la paella ___ lista en diez minutos. (estar, futur)', 'estará', ['esté', 'estuviera', 'estando'], 'Je crois que la paella sera prête dans dix minutes.', { x: 'creer que (affirmatif) + indicatif.' }),
        G('Me encanta que ___ a cenar a casa. (venir, vosotros)', 'vengáis', ['venís', 'veníais', 'vendréis'], 'J’adore que vous veniez dîner à la maison.', { x: 'Sentiment (me encanta que…) + subjonctif.' }),
        G('Me molesta que el camarero no nos ___ caso. (hacer)', 'haga', ['hace', 'hizo', 'hará'], 'Ça m’agace que le serveur ne fasse pas attention à nous.', { x: 'me molesta que + subjonctif ; hacer caso = prêter attention.' }),
        G('¿Te ___ un vermut antes de comer? (apetecer)', 'apetece', ['apeteces', 'apetezca', 'apetecen'], 'Ça te dit, un vermouth avant de manger ?', { x: 'apetecer fonctionne comme gustar.' }),
        W('me apetece', 'j’ai envie de', '🤤'),
        W('soso', 'fade', '😐'),
        W('rico', 'bon, délicieux (plat)', '😋'),
        W('pesado', 'lourd (indigeste)'),
        P('A mí me parece que está un poco soso.', 'Moi, je trouve que c’est un peu fade.'),
        P('No me gusta nada que haya tanto ruido.', 'Je n’aime pas du tout qu’il y ait autant de bruit.'),
        D('En sortant du restaurant, ton amie demande :', '¿Qué te ha parecido el restaurante?', 'Qu’as-tu pensé du restaurant ?', 'Me ha encantado, aunque me ha parecido un poco caro.',
          ['Me ha parecido a mi madre.', 'Me parezco muy rico.', 'Ha parecido, gracias.'], { x: 'parecer fonctionne comme gustar : me ha parecido caro.' }),
      ],
    },
    u3l3: {
      title: 'En el restaurante', fr: 'Réserver, commander, réclamer, recommander (que + subjonctif)',
      basic: ['la mesa', 'la carta', 'el camarero', 'la cuenta', 'Una mesa para dos, por favor.', 'comer', 'Nosotros ___ a las dos.', 'beber', 'Yo ___ agua.', 'vivir', '¿Dónde ___ tú?', 'Yo ___ hambre.', 'el tenedor', 'el cuchillo', 'la cuchara', 'La cuenta, por favor.', 'Tengo sed.', '{s} {o}.', '¿Y para beber?'],
      tip: `<h3>B1 · Recommander, réclamer</h3>
<p><b>recomendar / aconsejar que + subjonctif</b> : <i>Le recomiendo que pruebe el arroz negro.</i></p>
<p><b>Conditionnel de politesse</b> : <i>¿Podría traerme…?</i> · <i>¿Tendría una mesa?</i> · <i>Me gustaría…</i> · ou imparfait : <i>Quería reservar…</i></p>
<p>Réclamer poliment : <i>Perdone, esto no es lo que he pedido.</i> · <i>¿Me lo podría calentar?</i></p>
<p><i>Se nos ha acabado el pulpo</i> = nous n’avons plus de poulpe. <i>La sobremesa</i> : le moment où l’on reste à table à discuter après le repas.</p>`,
      items: [
        G('Le recomiendo que ___ el arroz negro. (probar, usted)', 'pruebe', ['prueba', 'probé', 'probará'], 'Je vous recommande de goûter le riz noir.', { x: 'recomendar que + subjonctif ; probar : o → ue.' }),
        G('Cuando llegamos, la cocina ya ___ cerrada. (estar)', 'estaba', ['estuvo', 'está', 'esté'], 'Quand nous sommes arrivés, la cuisine était déjà fermée.', { x: 'Situation de fond → imperfecto.' }),
        G('¿Me ___ traer otra botella de agua? (poder, usted)', 'podría', ['podrías', 'pude', 'podré'], 'Pourriez-vous m’apporter une autre bouteille d’eau ?', { x: 'Conditionnel de politesse.' }),
        P('Perdone, esto no es lo que he pedido.', 'Excusez-moi, ce n’est pas ce que j’ai commandé.'),
        P('La carne está fría, ¿me la podría calentar?', 'La viande est froide, pourriez-vous me la réchauffer ?'),
        P('Quería reservar una mesa para cuatro el sábado por la noche.', 'Je voudrais réserver une table pour quatre samedi soir.'),
        W('reservar', 'réserver', '📞'),
        W('pedir', 'commander (au restaurant)', '🗒️'),
        W('la terraza', 'la terrasse', '☀️'),
        W('la sobremesa', 'le moment passé à table après le repas', '☕'),
        D('Le serveur revient, gêné :', 'Lo siento, se nos ha acabado el pulpo.', 'Désolé, nous n’avons plus de poulpe.', 'Vaya, ¿y qué me recomienda en su lugar?',
          ['Vaya, ¿se ha acabado usted?', 'Pues un pulpo, gracias.', 'Lo siento también, adiós.'], { x: '« se nos ha acabado » = nous n’en avons plus.' }),
      ],
    },
  };
  const keyOf = (it) => (it.k === 'n' ? 'n' + it.min : it.es || it.s || it.npc || it.verb || '');
  [u1, u2, u3].forEach((u) => u.levels.forEach((l) => {
    const p = B1[l.id]; if (!p) return;
    l.items.forEach((it) => {
      const k = keyOf(it);
      if ((p.basic === '*' && !(p.keep || []).includes(k)) || (Array.isArray(p.basic) && p.basic.includes(k))) it.b = 1;
    });
    l.items = l.items.concat(p.items);
    l.title = p.title; l.fr = p.fr; l.tip = l.tip + p.tip;
  }));

  /* ---------- défis finaux, version B1 */
  const BOSS = {
    u1b: [
      { npc: '¡Buenas tardes! ¿Tiene usted reserva?', fr: 'Bonsoir ! Vous avez une réservation ?', a: 'Sí, la hice por internet a nombre de Martin.', o: ['Sí, la haré ayer por internet.', 'Sí, tengo reservado de Martin.', 'No, soy la reserva.'], x: 'la reserva → la hice (indefinido de hacer + pronom).' },
      { npc: '¿Me deja su pasaporte, por favor?', fr: 'Vous me laissez votre passeport, s’il vous plaît ?', a: 'Claro, aquí lo tiene.', o: ['Claro, aquí la tiene.', 'Claro, aquí le deja.', 'Claro, aquí tienes lo.'], x: 'el pasaporte → lo.' },
      { say: 'Demande poliment s’il serait possible d’avoir une chambre calme.', lenient: 1, sol: '¿Podría darme una habitación tranquila?',
        acc: ['podría darme una habitación tranquila', 'me podría dar una habitación tranquila', 'sería posible tener una habitación tranquila', 'sería posible una habitación tranquila', 'quería una habitación tranquila', 'podría tener una habitación tranquila', 'tiene una habitación tranquila', 'me puede dar una habitación tranquila', 'puede darme una habitación tranquila', 'tendría una habitación tranquila'] },
      { npc: 'Sin problema. Su habitación es la número {n}, en la cuarta planta.', fr: 'Pas de problème. Votre chambre est la numéro {d}, au quatrième étage.', q: 'Quel est ton numéro de chambre ?', num: [11, 99] },
      { v: [
        { npc: 'El desayuno se sirve de siete a diez y media en el comedor.', fr: 'Le petit-déjeuner est servi de sept heures à dix heures et demie dans la salle à manger.', q: 'Jusqu’à quelle heure peut-on prendre le petit-déjeuner ?', a: '10 h 30', o: ['7 h', '10 h', '11 h 30'] },
        { npc: 'Si necesita algo, llame a recepción marcando el nueve.', fr: 'Si vous avez besoin de quelque chose, appelez la réception en composant le neuf.', q: 'Comment joindre la réception ?', a: 'En composant le 9', o: ['En composant le 0', 'En descendant au 4e étage', 'En envoyant un e-mail'] },
      ] },
      { npc: '¿Necesita alguna recomendación para esta noche?', fr: 'Vous avez besoin d’une recommandation pour ce soir ?', a: 'Sí, ¿qué me aconseja para cenar cerca del hotel?', o: ['Sí, me aconsejo cenar mucho.', 'Sí, recomiendo usted.', 'Necesito una noche, gracias.'] },
      { v: [
        { npc: 'Le recomiendo que vaya a La Latina: hay muchos bares de tapas.', fr: 'Je vous recommande d’aller à La Latina : il y a beaucoup de bars à tapas.', q: 'Que te recommande Sofía ?', a: 'Aller dans le quartier de La Latina', o: ['Dîner à l’hôtel', 'Prendre le métro jusqu’au Prado', 'Réserver un restaurant cher'] },
        { npc: 'Le aconsejo que pruebe el cocido madrileño en la calle Echegaray.', fr: 'Je vous conseille de goûter le cocido madrileño, rue Echegaray.', q: 'Que te conseille Sofía ?', a: 'Goûter le cocido madrileño', o: ['Goûter la paella', 'Visiter le Prado de nuit', 'Prendre un taxi'] },
      ] },
      { say: 'Demande-lui si elle pourrait te réveiller à sept heures.', lenient: 1, sol: '¿Podría despertarme a las siete?',
        acc: ['podría despertarme a las siete', 'me podría despertar a las siete', 'puede despertarme a las siete', 'me puede despertar a las siete', 'me despierta a las siete', 'podría llamarme a las siete', 'me podría llamar a las siete', 'me podría despertar mañana a las siete', 'podría despertarme mañana a las siete'] },
    ],
    u2b: [
      { npc: '¡Buenos días! ¿Qué le pongo?', fr: 'Bonjour ! Qu’est-ce que je vous sers ?', a: 'Quería un kilo de tomates maduros, para gazpacho.', o: ['Quería un kilo de tomates de maduros para.', 'Me pongo un kilo, gracias.', 'Son tomates, buenos días.'], x: 'Imparfait de politesse : quería.' },
      { v: [
        { npc: '¿Algo más?', fr: 'Autre chose ?', a: 'Sí, póngame también dos pimientos verdes.', o: ['Sí, pónmele dos pimientos.', 'Sí, me pongo dos pimientos.', 'Sí, póngale a mí pimientos dos.'], x: 'póngame : impératif usted + me.' },
        { npc: '¿Qué más necesita?', fr: 'De quoi d’autre avez-vous besoin ?', a: 'Un pepino y una cabeza de ajo, por favor.', o: ['Necesito de nada más pepino.', 'Es un pepino, gracias.', 'Muy bien, ¿y tú?'], x: 'pepino = concombre · una cabeza de ajo = une tête d’ail' },
      ] },
      { say: 'Demande-lui s’il peut te mettre tout ça dans un sac.', lenient: 1, sol: '¿Me lo puede poner en una bolsa?',
        acc: ['me lo puede poner en una bolsa', 'me lo pone en una bolsa', 'puede ponérmelo en una bolsa', 'me lo podría poner en una bolsa', 'podría ponérmelo en una bolsa', 'me lo pone todo en una bolsa', 'me lo puede poner todo en una bolsa', 'me lo mete en una bolsa', 'me lo puede meter en una bolsa', 'me lo podría meter en una bolsa'] },
      { npc: 'Son {n} euros con cincuenta.', fr: 'Ça fait {d} euros cinquante.', q: 'Combien dois-tu payer ?', num: [3, 19], fmt: '{d},50 €', apoc: true },
      { npc: '¿No tendrá suelto? Es que no me queda cambio.', fr: 'Vous n’auriez pas de la monnaie ? C’est que je n’ai plus de quoi rendre.', a: 'Lo siento, solo tengo un billete de cincuenta.', o: ['Lo siento, no tendré suelto ayer.', 'Sí, me queda cambio de usted.', 'No, el suelto es mío.'] },
      { npc: 'Bueno, no pasa nada, ahora le busco cambio. Por cierto, las fresas están de oferta.', fr: 'Bon, ce n’est pas grave, je vais vous chercher de la monnaie. Au fait, les fraises sont en promotion.', q: 'Que t’apprend Vicent ?', a: 'Les fraises sont en promotion', o: ['Les fraises sont épuisées', 'Il ne prend pas les billets', 'Le marché ferme bientôt'] },
      { say: 'Réponds-lui que tu les prendras la semaine prochaine.', lenient: 1, sol: 'Me las llevaré la semana que viene.',
        acc: ['las compraré la semana que viene', 'me las llevaré la semana que viene', 'las compraré la semana próxima', 'las compraré la próxima semana', 'me las llevaré la próxima semana', 'me las llevo la semana que viene', 'las compro la semana que viene', 'me las llevaré la semana próxima', 'las cogeré la semana que viene'] },
      { npc: '¡Hasta el sábado que viene, entonces!', fr: 'À samedi prochain, alors !', a: '¡Hasta el sábado! Y gracias por el consejo.', o: ['¡Hasta ayer, entonces!', 'Sí, el sábado viene.', 'Gracias, que sea sábado.'] },
    ],
    u3b: [
      { npc: 'Buenas noches. ¿Tienen reserva?', fr: 'Bonsoir. Vous avez une réservation ?', a: 'No, no hemos reservado. ¿Tendría una mesa para dos?', o: ['No, no reservamos mañana.', 'Sí, tenemos mesa de dos reservas.', 'No, somos dos reservas.'], x: '¿Tendría…? : conditionnel de politesse.' },
      { npc: 'Dentro está todo lleno, pero queda una mesa en la terraza.', fr: 'À l’intérieur tout est plein, mais il reste une table en terrasse.', q: 'Où pouvez-vous vous asseoir ?', a: 'En terrasse', o: ['À l’intérieur', 'Au bar', 'Nulle part'] },
      { say: 'Dis à Marta que tu es allergique aux fruits à coque.', lenient: 1, sol: 'Soy alérgico (alérgica) a los frutos secos.',
        acc: ['soy alérgico a los frutos secos', 'soy alérgica a los frutos secos', 'tengo alergia a los frutos secos', 'tengo alergia a los frutos secos'] },
      { npc: 'Tranquilo, se lo digo al cocinero. Le recomiendo que pruebe las bravas, aunque pican un poco.', fr: 'Ne vous inquiétez pas, je le dis au cuisinier. Je vous recommande de goûter les bravas, même si elles piquent un peu.', q: 'Que dit Marta des patatas bravas ?', a: 'Elle les recommande, mais elles piquent un peu', o: ['Elles contiennent des fruits à coque', 'Il n’y en a plus', 'Elles sont servies froides'] },
      { npc: '¿Les gusta el pescado?', fr: 'Vous aimez le poisson ?', a: 'Sí, nos gusta mucho, sobre todo a la plancha.', o: ['Sí, nos gustan mucho a la plancha.', 'Sí, me gusto la plancha.', 'Sí, le gusta pescado.'], x: '« el pescado » est singulier → nos gusta.' },
      { npc: 'Perdonen, se nos ha acabado la dorada. ¿Les pongo lubina en su lugar?', fr: 'Excusez-nous, nous n’avons plus de daurade. Je vous mets du bar à la place ?', a: 'Vale, no pasa nada. Que sea lubina.', o: ['Vale, se nos ha acabado también.', 'No, póngame la dorada acabada.', 'Sí, nos ponemos lubina.'], x: '« Que sea lubina » = va pour le bar.' },
      { say: 'C’est la fin du repas : demande si vous pouvez payer séparément.', lenient: 1, sol: '¿Podemos pagar por separado?',
        acc: ['podemos pagar por separado', 'se puede pagar por separado', 'podríamos pagar por separado', 'nos cobra por separado', 'nos puede cobrar por separado', 'nos podría cobrar por separado', 'podemos pagar cada uno lo suyo'] },
    ],
  };
  [u1, u2, u3].forEach((u) => u.levels.forEach((l) => { if (BOSS[l.id]) l.steps = BOSS[l.id]; }));

  /* ---------- lectures B1, avec traduction */
  const READ = {
    u1c: { title: 'Un domingo en Madrid',
      text: 'El domingo pasado, Clara quedó con unos amigos en la Puerta del Sol. Como hacía muy buen tiempo, decidieron ir andando hasta el parque del Retiro, donde alquilaron una barca en el estanque. Después fueron al Rastro, el mercadillo más famoso de la ciudad, aunque Clara no compró nada porque todo le pareció demasiado caro. Por la tarde visitaron el Museo del Prado, que es gratis las dos últimas horas del día. Al final, cenaron unas tapas en La Latina y volvieron a casa en metro, muy cansados pero contentos.',
      fr: 'Dimanche dernier, Clara a retrouvé des amis à la Puerta del Sol. Comme il faisait très beau, ils ont décidé d’aller à pied jusqu’au parc du Retiro, où ils ont loué une barque sur le bassin. Ensuite, ils sont allés au Rastro, le marché aux puces le plus célèbre de la ville, mais Clara n’a rien acheté parce que tout lui a semblé trop cher. L’après-midi, ils ont visité le musée du Prado, gratuit pendant les deux dernières heures de la journée. Pour finir, ils ont dîné de tapas à La Latina et sont rentrés en métro, très fatigués mais contents.',
      qs: [
        { q: 'Pourquoi sont-ils allés au Retiro à pied ?', a: 'Parce qu’il faisait très beau', o: ['Parce que le métro était fermé', 'Parce que Clara n’avait pas d’argent', 'Parce que c’était juste à côté'] },
        { q: 'Pourquoi Clara n’a-t-elle rien acheté au Rastro ?', a: 'Tout lui a semblé trop cher', o: ['Le marché était fermé', 'Elle avait oublié son porte-monnaie', 'Il n’y avait que des fruits'] },
        { q: 'Qu’ont-ils fait au Retiro ?', a: 'Ils ont loué une barque', o: ['Ils ont visité un musée', 'Ils ont dîné de tapas', 'Ils ont acheté des souvenirs'] },
        { q: 'Quand le Prado est-il gratuit, d’après le texte ?', a: 'Pendant les deux dernières heures de la journée', o: ['Toute la journée le dimanche', 'Le matin', 'Jamais'] },
        { q: 'Comment sont-ils rentrés ?', a: 'En métro', o: ['À pied', 'En barque', 'En taxi'] },
      ] },
    u2c: { title: 'Un sábado en el Mercado Central',
      text: 'Todos los sábados, Ana va al Mercado Central antes de que lleguen los turistas. Dice que allí la fruta está mucho más rica que en el supermercado y que, además, los vendedores la conocen y le guardan lo mejor. Esta semana quería hacer una paella para su familia, así que compró pollo, conejo, judías verdes y garrofó. Cuando fue a pagar, se dio cuenta de que se había dejado la cartera en casa. Por suerte, Vicent, el de las verduras, le dijo: «No te preocupes, ya me lo pagarás el sábado que viene».',
      fr: 'Tous les samedis, Ana va au Mercado Central avant que les touristes arrivent. Elle dit que là-bas les fruits sont bien meilleurs qu’au supermarché et qu’en plus les vendeurs la connaissent et lui gardent ce qu’il y a de mieux. Cette semaine, elle voulait faire une paella pour sa famille, alors elle a acheté du poulet, du lapin, des haricots verts et du garrofó. Au moment de payer, elle s’est rendu compte qu’elle avait oublié son portefeuille à la maison. Heureusement, Vicent, le marchand de légumes, lui a dit : « Ne t’inquiète pas, tu me paieras samedi prochain. »',
      qs: [
        { q: 'Pourquoi Ana va-t-elle tôt au marché ?', a: 'Pour arriver avant les touristes', o: ['Parce qu’elle travaille l’après-midi', 'Parce que le marché ferme à 10 h', 'Pour avoir des réductions'] },
        { q: 'Que pense Ana des fruits du marché ?', a: 'Ils sont bien meilleurs qu’au supermarché', o: ['Ils sont trop chers', 'Ils viennent de l’étranger', 'Ils sont moins frais'] },
        { q: 'Que voulait-elle cuisiner ?', a: 'Une paella', o: ['Un gazpacho', 'Une tortilla', 'Des tapas'] },
        { q: 'Quel problème a-t-elle eu ?', a: 'Elle avait oublié son portefeuille', o: ['Il n’y avait plus de lapin', 'Le marché était fermé', 'Vicent était malade'] },
        { q: 'Comment Vicent a-t-il réagi ?', a: 'Elle le paiera samedi prochain', o: ['Il a refusé de la servir', 'Il lui a fait une réduction', 'Il lui a offert les légumes'] },
      ] },
    u3c: { title: 'Marc y la Boqueria',
      text: 'Marc vive en Barcelona desde hace diez años, pero nunca había ido a la Boqueria hasta que su prima de Sevilla vino a visitarlo. «Es un mercado para turistas», pensaba. Sin embargo, se llevó una sorpresa: además de los puestos de recuerdos, encontró pescado fresquísimo, setas de temporada y un pequeño bar donde se come de maravilla. Pidieron unas gambas a la plancha y unos chipirones, y charlaron con el cocinero, que les recomendó que volvieran en otoño. Desde entonces, Marc va allí cada mes y siempre se lleva a algún amigo.',
      fr: 'Marc vit à Barcelone depuis dix ans, mais il n’était jamais allé à la Boqueria jusqu’à ce que sa cousine de Séville vienne lui rendre visite. « C’est un marché pour touristes », pensait-il. Pourtant, il a eu une surprise : en plus des stands de souvenirs, il a trouvé du poisson très frais, des champignons de saison et un petit bar où l’on mange merveilleusement bien. Ils ont commandé des crevettes à la plancha et des petits calamars, et ont discuté avec le cuisinier, qui leur a conseillé de revenir en automne. Depuis, Marc y va chaque mois et emmène toujours un ami.',
      qs: [
        { q: 'Pourquoi Marc n’était-il jamais allé à la Boqueria ?', a: 'Il pensait que c’était un marché pour touristes', o: ['Il habitait trop loin', 'Il n’aime pas le poisson', 'Le marché était toujours fermé'] },
        { q: 'Qui lui a donné l’occasion d’y aller ?', a: 'Sa cousine de Séville', o: ['Son patron', 'Un touriste', 'Le cuisinier'] },
        { q: 'Qu’ont-ils commandé ?', a: 'Des crevettes et des petits calamars', o: ['Une paella', 'Des champignons farcis', 'Du jambon'] },
        { q: 'Que leur a conseillé le cuisinier ?', a: 'De revenir en automne', o: ['De réserver à l’avance', 'D’éviter le marché le samedi', 'De goûter le dessert'] },
        { q: 'Que fait Marc depuis ?', a: 'Il y retourne chaque mois avec un ami', o: ['Il n’y est jamais retourné', 'Il y travaille', 'Il y va chaque jour, seul'] },
      ] },
  };
  [u1, u2, u3].forEach((u) => u.levels.forEach((l) => { if (READ[l.id]) l.reading = READ[l.id]; }));

  /* ---------- textes des cromos en espagnol (le français reste à côté) */
  const CARD_ES = {
    sol: 'Es la plaza más céntrica de Madrid. En el suelo, una placa marca el <b>Kilómetro Cero</b>, el punto de partida de las grandes carreteras nacionales de España. Allí está la estatua del <i>Oso y el Madroño</i>, símbolo de la ciudad. Cada 31 de diciembre, los españoles se comen <b>doce uvas</b> al ritmo de las doce campanadas del reloj de la plaza, que se retransmiten en directo por televisión.',
    prado: 'Inaugurado en <b>1819</b>, es uno de los museos de pintura más importantes del mundo: Velázquez, Goya y El Greco, pero también El Bosco y su <i>Jardín de las delicias</i>. Junto con el Museo Reina Sofía (arte moderno) y el Museo Thyssen-Bornemisza, forma el <b>«Triángulo del Arte»</b>, a lo largo del Paseo del Prado.',
    meninas: 'Obra maestra de <b>Diego Velázquez</b>, pintor de la corte del rey Felipe IV. En el cuadro, la infanta Margarita Teresa aparece rodeada de sus damas de honor, las <i>meninas</i>. Velázquez se pintó a sí mismo delante del lienzo, y los reyes aparecen… <b>reflejados en un espejo</b> al fondo. En 1957, Picasso pintó 58 versiones de este cuadro.',
    reyes: '<b>Isabel de Castilla</b> y <b>Fernando de Aragón</b> se casaron en 1469 y unieron sus reinos. El año <b>1492</b> lo cambió todo: conquistaron Granada (fin de la Reconquista), expulsaron a los judíos, apoyaron el viaje de Cristóbal Colón a América y Nebrija publicó la primera gramática del castellano.',
    transicion: 'Tras la Guerra Civil (1936-1939), <b>Franco</b> gobernó como dictador hasta su muerte en 1975. El rey Juan Carlos I acompañó entonces la vuelta a la democracia: la <b>Constitución de 1978</b> se aprobó en referéndum. El 23 de febrero de 1981 (el «23-F») fracasó un intento de golpe de Estado en el Congreso. En los años 80 estalló la <i>Movida madrileña</i>, con el cineasta Pedro Almodóvar.',
    mercadocentral: 'Inaugurado en <b>1928</b>, este edificio, obra maestra del modernismo valenciano, combina <b>hierro, cristal y cerámica</b> bajo grandes cúpulas. Es uno de los mayores mercados de productos frescos de Europa, con cientos de puestos. Sobre su cúpula, una veleta con forma de <b>loro</b>, la <i>cotorra del mercat</i>, se ha convertido en un símbolo de la ciudad. Cada barrio español conserva su <i>mercado de abastos</i>, donde la gente hace la compra.',
    horarios: 'En España se come hacia las <b>14:00 – 15:30</b> y se cena hacia las <b>21:00 – 22:30</b>. Muchas tiendas pequeñas cierran a primera hora de la tarde y vuelven a abrir hacia las 17:00. Una explicación: desde <b>1940</b>, España vive con la hora de Europa Central (Franco quiso alinearse con Alemania), aunque geográficamente está más al oeste. Por eso el sol se pone tarde… ¡y se cena tarde!',
    alandalus: 'En <b>711</b>, ejércitos musulmanes procedentes del norte de África entraron en la península. Durante casi ocho siglos, <i>al-Ándalus</i> brilló: <b>Córdoba</b> se convirtió en la capital de un califato (929) y en una de las mayores ciudades de Europa, con su Mezquita. En Granada, los sultanes nazaríes construyeron la <b>Alhambra</b>. Los filósofos Averroes y Maimónides nacieron en Córdoba.',
    arabe: 'El español tiene miles de palabras de origen árabe, que a menudo empiezan por <b>al-</b> o <b>a-</b> (el artículo árabe): <i>aceite</i>, <i>aceituna</i>, <i>azúcar</i>, <i>arroz</i>, <i>alcachofa</i>, <i>albóndiga</i>, <i>azafrán</i>, y también <i>naranja</i>, <i>limón</i> y <i>zanahoria</i>. Incluso <b>ojalá</b> viene de una expresión árabe que significa «si Dios quiere».',
    paella: 'Nació en torno a la <b>Albufera</b>, la laguna de Valencia, donde se cultiva arroz desde la época de al-Ándalus. La palabra <i>paella</i> designaba al principio la <b>sartén</b> ancha y plana (del latín <i>patella</i>). La receta valenciana tradicional lleva arroz, <b>pollo, conejo</b>, judías verdes, garrofó y azafrán… ¡sin marisco! El <i>socarrat</i> es el arroz tostado del fondo.',
    gaudi: 'Arquitecto del <b>modernismo catalán</b>, inspirado en las formas de la naturaleza. Suyas son la Casa Batlló, la Casa Milà (<i>La Pedrera</i>), el Park Güell… y sobre todo la <b>Sagrada Familia</b>, cuyas obras empezaron en <b>1882</b>: Gaudí le dedicó más de cuarenta años. Murió en 1926, atropellado por un tranvía, sin ver la obra terminada; las obras continúan en el siglo XXI.',
    catalan: 'Lengua romance, <b>cooficial</b> con el castellano en Cataluña, en Baleares y (con el nombre de <i>valenciano</i>) en la Comunidad Valenciana. También es la lengua oficial de <b>Andorra</b>. Algunas palabras: <i>Bon dia</i> (buenos días), <i>Gràcies</i> (gracias), <i>Adéu</i> (adiós). España tiene otras lenguas cooficiales: el gallego y el <b>vasco</b> (<i>euskera</i>), que ni siquiera es una lengua indoeuropea.',
    picasso: 'Nacido en <b>Málaga</b> en 1881, Picasso pasó su juventud en Barcelona antes de instalarse en Francia. Inventó el <b>cubismo</b> con Georges Braque. En <b>1937</b> pintó el <i>Guernica</i> tras el bombardeo de esta ciudad vasca durante la Guerra Civil. El cuadro volvió a España en 1981 y hoy está en el <b>Museo Reina Sofía</b> de Madrid. Barcelona tiene su propio Museo Picasso.',
    jo92: 'Los Juegos Olímpicos de <b>1992</b> transformaron Barcelona: la ciudad se abrió al mar con nuevas playas y un puerto olímpico. El estadio está en la montaña de <b>Montjuïc</b> y la mascota, <b>Cobi</b>, era un perro dibujado por Javier Mariscal. 1992 fue un gran año para España: Sevilla también acogió la Exposición Universal.',
    tapas: 'Pequeñas porciones que se sirven con la bebida, para compartir. <i>Ir de tapas</i> (o <i>tapear</i>) es ir de bar en bar con los amigos. Según una leyenda, se ponía una loncha de pan o de jamón sobre el vaso para <b>taparlo</b> y protegerlo de las moscas. En el País Vasco se llaman <i>pintxos</i>; en Granada o en León, la tapa suele ser <b>gratis</b> con la bebida.',
    cervantes: 'Autor de <b>Don Quijote</b> (1605 y 1615), considerado a menudo la primera novela moderna: un hidalgo que se cree caballero ataca unos <b>molinos de viento</b> pensando que son gigantes, acompañado de su escudero <b>Sancho Panza</b>. Herido en la mano izquierda en la batalla de Lepanto (1571) y cautivo cinco años en Argel, Cervantes murió en <b>Madrid</b> en abril de 1616. El español es «la lengua de Cervantes».',
    tomatina: 'Cada <b>último miércoles de agosto</b>, el pequeño pueblo de <b>Buñol</b>, cerca de Valencia, se convierte en un campo de batalla: durante una hora, miles de participantes se lanzan toneladas de tomates maduros. La fiesta existe desde los años 40 y atrae a visitantes de todo el mundo. Después, las calles se limpian… con mangueras.',
    santjordi: 'El <b>23 de abril</b>, día de Sant Jordi (san Jorge, patrón de Cataluña), las calles de Barcelona se llenan de puestos: se regala <b>una rosa y un libro</b>. La fecha coincide con la muerte de Cervantes y de Shakespeare en 1616: por eso la UNESCO la eligió como <b>Día Mundial del Libro</b>.',
  };
  cards.forEach((c) => { c.es = CARD_ES[c.id]; });


  /* ---------- questions de culture en espagnol (la version française reste consultable) */
  const QS_ES = {
    sol: [
      { q: '¿Qué marca la placa del suelo de la Puerta del Sol?', a: 'El kilómetro cero de las carreteras españolas', o: ['El centro geográfico de Europa', 'La tumba de un rey', 'El punto más alto de Madrid'] },
      { q: '¿Qué se come a medianoche el 31 de diciembre?', a: 'Doce uvas', o: ['Doce aceitunas', 'Doce churros', 'Un trozo de tortilla'] },
      { tf: 'La estatua de la Puerta del Sol representa un oso y un madroño.', v: true },
      { q: '¿Qué animal es el símbolo de Madrid?', a: 'El oso', o: ['El toro', 'El águila', 'El león'] },
    ],
    prado: [
      { q: '¿En qué año se inauguró el Prado?', a: '1819', o: ['1492', '1936', '1992'] },
      { q: '¿Qué museos forman el «Triángulo del Arte» de Madrid?', a: 'El Prado, el Reina Sofía y el Thyssen-Bornemisza', o: ['El Prado, el Louvre y los Uffizi', 'El Prado, el Guggenheim y el MNAC', 'El Prado, el Museo Picasso y el Museo Dalí'] },
      { tf: 'El Jardín de las delicias de El Bosco está en el Prado.', v: true },
      { tf: 'El Prado es sobre todo un museo de arte contemporáneo.', v: false, x: 'El arte moderno y contemporáneo está en el Reina Sofía.' },
    ],
    meninas: [
      { q: '¿Quién pintó Las Meninas?', a: 'Diego Velázquez', o: ['Francisco de Goya', 'Pablo Picasso', 'El Greco'] },
      { q: '¿Quiénes aparecen reflejados en el espejo del cuadro?', a: 'Los reyes', o: ['El pintor', 'Un perro', 'La infanta'] },
      { tf: 'Velázquez se pintó a sí mismo en Las Meninas.', v: true },
      { q: 'Las «meninas» son…', a: 'las damas de honor de la infanta', o: ['unas monjas', 'unas bailaoras de flamenco', 'las hijas del pintor'] },
    ],
    reyes: [
      { q: '¿Quiénes apoyaron el viaje de Cristóbal Colón?', a: 'Isabel de Castilla y Fernando de Aragón', o: ['Felipe II', 'Carlos V', 'Alfonso X el Sabio'] },
      { q: '¿Qué ciudad se conquistó en 1492, poniendo fin a la Reconquista?', a: 'Granada', o: ['Sevilla', 'Toledo', 'Córdoba'] },
      { tf: 'En 1492 se publicó la primera gramática de la lengua castellana.', v: true },
      { q: '¿En qué año se casaron Isabel y Fernando?', a: '1469', o: ['1492', '1516', '1412'] },
    ],
    transicion: [
      { q: '¿En qué año se aprobó la Constitución española actual?', a: '1978', o: ['1975', '1939', '1992'] },
      { q: '¿Qué pasó el «23-F» (23 de febrero de 1981)?', a: 'Un intento de golpe de Estado', o: ['La muerte de Franco', 'Los Juegos Olímpicos de Barcelona', 'La llegada del euro'] },
      { tf: 'Franco gobernó España hasta su muerte, en 1975.', v: true },
      { q: '¿Qué cineasta se asocia con la Movida madrileña?', a: 'Pedro Almodóvar', o: ['Luis Buñuel', 'Carlos Saura', 'Alejandro Amenábar'] },
    ],
    mercadocentral: [
      { q: '¿En qué año se inauguró el Mercado Central de Valencia?', a: '1928', o: ['1492', '1819', '1992'] },
      { q: '¿Qué materiales caracterizan su arquitectura?', a: 'Hierro, cristal y cerámica', o: ['Madera y paja', 'Hormigón', 'Mármol y oro'] },
      { q: '¿Qué animal corona su cúpula?', a: 'Un loro (la cotorra)', o: ['Un toro', 'Un gallo', 'Un murciélago'] },
      { q: '¿Cómo se llama el mercado de barrio tradicional?', a: 'Mercado de abastos', o: ['Supermercado', 'Mercadillo de arte', 'Plaza de toros'] },
    ],
    horarios: [
      { q: '¿A qué hora se suele cenar en España?', a: 'Hacia las 21:00 – 22:30', o: ['Hacia las 18:00', 'Hacia las 19:30', 'Después de medianoche'] },
      { q: '¿Desde cuándo tiene España la hora de Europa Central?', a: 'Desde 1940', o: ['Desde 1492', 'Desde 1978', 'Desde 2002'] },
      { tf: 'La España peninsular tiene la misma hora que el Reino Unido.', v: false, x: 'Tiene la hora de París y Berlín; solo Canarias tiene la hora de Londres.' },
      { q: '¿Por qué se pone el sol tan tarde en España?', a: 'Está al oeste, pero sigue la hora de Europa Central', o: ['Por la siesta', 'Porque España está al sur', 'Por el mar Mediterráneo'] },
    ],
    alandalus: [
      { q: '¿En qué año empieza la historia de al-Ándalus?', a: '711', o: ['1492', '1212', '476'] },
      { q: '¿En qué ciudad está la Alhambra?', a: 'Granada', o: ['Córdoba', 'Sevilla', 'Toledo'] },
      { q: '¿Qué ciudad fue la capital del califato?', a: 'Córdoba', o: ['Granada', 'Madrid', 'Valencia'] },
      { tf: 'Averroes y Maimónides nacieron en Córdoba.', v: true },
    ],
    arabe: [
      { q: '¿Cuál de estas palabras viene del árabe?', a: 'aceite', o: ['leche', 'pan', 'queso'] },
      { q: '«Ojalá» viene de una expresión árabe que significa…', a: '«si Dios quiere»', o: ['«que aproveche»', '«buenos días»', '«en el mercado»'] },
      { q: '¿A qué corresponde a menudo el comienzo «al-» de estas palabras?', a: 'Al artículo árabe («el, la»)', o: ['A una palabra latina', 'Al nombre de una ciudad', 'A un diminutivo'] },
      { tf: '«Zanahoria» es una palabra de origen árabe.', v: true },
    ],
    paella: [
      { q: '¿De qué región es la paella?', a: 'De Valencia', o: ['De Andalucía', 'De Galicia', 'Del País Vasco'] },
      { q: '¿Qué designaba al principio la palabra «paella»?', a: 'La sartén', o: ['El arroz', 'El azafrán', 'Una fiesta'] },
      { q: '¿Qué es el «socarrat»?', a: 'El arroz tostado del fondo de la paella', o: ['Una salsa de ajo', 'Un tipo de marisco', 'La tapa de la sartén'] },
      { tf: 'La paella valenciana tradicional lleva pollo y conejo.', v: true },
    ],
    gaudi: [
      { q: '¿En qué año empezaron las obras de la Sagrada Familia?', a: '1882', o: ['1926', '1992', '1756'] },
      { q: '¿Cuál de estos edificios NO es de Gaudí?', a: 'El Museo Guggenheim de Bilbao', o: ['La Casa Batlló', 'El Park Güell', 'La Pedrera'] },
      { tf: 'Gaudí vio la Sagrada Familia terminada.', v: false, x: 'Murió en 1926; un siglo después, la basílica sigue en obras.' },
      { q: '¿Cómo murió Gaudí?', a: 'Atropellado por un tranvía', o: ['Durante la Guerra Civil', 'Al caerse de un andamio', 'De viejo, a los 95 años'] },
    ],
    catalan: [
      { q: '¿Cómo se dice «gracias» en catalán?', a: 'Gràcies', o: ['Obrigado', 'Eskerrik asko', 'Grazas'] },
      { q: '¿En qué país es el catalán la única lengua oficial?', a: 'Andorra', o: ['Mónaco', 'Portugal', 'Malta'] },
      { tf: 'El vasco es una lengua latina, como el catalán.', v: false, x: 'El vasco (euskera) no es indoeuropeo: su origen sigue siendo un misterio.' },
      { q: '¿Cómo se llama el catalán que se habla en la Comunidad Valenciana?', a: 'Valenciano', o: ['Gallego', 'Aragonés', 'Andaluz'] },
    ],
    picasso: [
      { q: '¿En qué ciudad nació Picasso?', a: 'Málaga', o: ['Barcelona', 'Madrid', 'París'] },
      { q: '¿Qué denuncia el Guernica?', a: 'El bombardeo de una ciudad vasca en 1937', o: ['La conquista de Granada', 'El golpe de Estado de 1981', 'Los Juegos Olímpicos de 1992'] },
      { tf: 'El Guernica está en el Museo Picasso de Barcelona.', v: false, x: 'El Guernica está en el Museo Reina Sofía, en Madrid.' },
      { q: '¿Con quién inventó Picasso el cubismo?', a: 'Con Georges Braque', o: ['Con Salvador Dalí', 'Con Joan Miró', 'Con Henri Matisse'] },
    ],
    jo92: [
      { q: '¿Quién es Cobi?', a: 'La mascota de los Juegos, un perro', o: ['Un arquitecto', 'Un campeón de natación', 'Un rey de Cataluña'] },
      { q: '¿En qué montaña está el estadio olímpico?', a: 'Montjuïc', o: ['El Tibidabo', 'Montserrat', 'El Park Güell'] },
      { tf: 'En 1992, Sevilla también acogió una Exposición Universal.', v: true },
      { q: '¿Cómo transformaron los Juegos la ciudad?', a: 'Se abrió al mar (playas, puerto olímpico)', o: ['Perdió su puerto', 'Se convirtió en la capital de España', 'Construyó la Sagrada Familia'] },
    ],
    tapas: [
      { q: 'Según la leyenda, ¿de dónde viene la palabra «tapa»?', a: 'Del verbo «tapar»: cubrir el vaso', o: ['De un rey llamado Tapa', 'De la palabra árabe para «pequeño»', 'De un pueblo andaluz'] },
      { q: '¿Cómo se llaman las tapas en el País Vasco?', a: 'Pintxos', o: ['Raciones', 'Bocadillos', 'Churros'] },
      { tf: 'En Granada, la tapa suele ser gratis con la bebida.', v: true },
      { q: '¿Qué significa «ir de tapas»?', a: 'Ir de bar en bar comiendo tapas', o: ['Cocinar en casa', 'Hacer la compra', 'Desayunar fuera'] },
    ],
    cervantes: [
      { q: '¿Cómo se llama el escudero de Don Quijote?', a: 'Sancho Panza', o: ['Rocinante', 'Dulcinea', 'Lazarillo'] },
      { q: '¿Contra qué lucha Don Quijote creyendo que son gigantes?', a: 'Contra molinos de viento', o: ['Contra toros', 'Contra olivos', 'Contra estatuas'] },
      { q: '¿En qué año se publicó la primera parte del Quijote?', a: '1605', o: ['1492', '1715', '1898'] },
      { tf: 'Cervantes murió en Madrid.', v: true },
    ],
    tomatina: [
      { q: '¿Dónde se celebra la Tomatina?', a: 'En Buñol, cerca de Valencia', o: ['En Pamplona', 'En Sevilla', 'En Madrid'] },
      { q: '¿Cuándo se celebra?', a: 'El último miércoles de agosto', o: ['El 31 de diciembre', 'El 23 de abril', 'En Semana Santa'] },
      { tf: 'La Tomatina se celebra en Pamplona.', v: false, x: 'En Pamplona son los Sanfermines (julio). La Tomatina es en Buñol.' },
    ],
    santjordi: [
      { q: '¿Qué se regala tradicionalmente el día de Sant Jordi?', a: 'Una rosa y un libro', o: ['Tomates', 'Un pastel', 'Uvas'] },
      { q: '¿Por qué eligió la UNESCO el 23 de abril como Día del Libro?', a: 'Coincide con la muerte de Cervantes y de Shakespeare', o: ['Es el cumpleaños de Gaudí', 'Es la fecha de los Juegos de 1992', 'Es el Día de la Constitución'] },
      { tf: 'Sant Jordi es el patrón de Cataluña.', v: true },
    ],
  };
  const READ_QS_ES = {
    u1c: [
      { q: '¿Por qué fueron andando al Retiro?', a: 'Porque hacía muy buen tiempo', o: ['Porque el metro estaba cerrado', 'Porque Clara no tenía dinero', 'Porque estaba justo al lado'] },
      { q: '¿Por qué Clara no compró nada en el Rastro?', a: 'Todo le pareció demasiado caro', o: ['El mercadillo estaba cerrado', 'Se le había olvidado el monedero', 'Solo había fruta'] },
      { q: '¿Qué hicieron en el Retiro?', a: 'Alquilaron una barca', o: ['Visitaron un museo', 'Cenaron unas tapas', 'Compraron recuerdos'] },
      { q: 'Según el texto, ¿cuándo es gratis el Prado?', a: 'Las dos últimas horas del día', o: ['Todo el día los domingos', 'Por la mañana', 'Nunca'] },
      { q: '¿Cómo volvieron a casa?', a: 'En metro', o: ['Andando', 'En barca', 'En taxi'] },
    ],
    u2c: [
      { q: '¿Por qué va Ana temprano al mercado?', a: 'Para llegar antes que los turistas', o: ['Porque trabaja por la tarde', 'Porque el mercado cierra a las diez', 'Para conseguir descuentos'] },
      { q: '¿Qué opina Ana de la fruta del mercado?', a: 'Que está mucho más rica que en el supermercado', o: ['Que es demasiado cara', 'Que viene del extranjero', 'Que está menos fresca'] },
      { q: '¿Qué quería cocinar?', a: 'Una paella', o: ['Un gazpacho', 'Una tortilla', 'Unas tapas'] },
      { q: '¿Qué problema tuvo?', a: 'Se había dejado la cartera en casa', o: ['Ya no quedaba conejo', 'El mercado estaba cerrado', 'Vicent estaba enfermo'] },
      { q: '¿Cómo reaccionó Vicent?', a: 'Le dijo que se lo pagara el sábado siguiente', o: ['Se negó a atenderla', 'Le hizo un descuento', 'Le regaló las verduras'] },
    ],
    u3c: [
      { q: '¿Por qué Marc nunca había ido a la Boqueria?', a: 'Pensaba que era un mercado para turistas', o: ['Vivía demasiado lejos', 'No le gusta el pescado', 'El mercado siempre estaba cerrado'] },
      { q: '¿Quién le dio la ocasión de ir?', a: 'Su prima de Sevilla', o: ['Su jefe', 'Un turista', 'El cocinero'] },
      { q: '¿Qué pidieron?', a: 'Gambas y chipirones', o: ['Una paella', 'Setas rellenas', 'Jamón'] },
      { q: '¿Qué les recomendó el cocinero?', a: 'Que volvieran en otoño', o: ['Que reservaran antes', 'Que no fueran los sábados', 'Que probaran el postre'] },
      { q: '¿Qué hace Marc desde entonces?', a: 'Vuelve cada mes con algún amigo', o: ['No ha vuelto nunca', 'Trabaja allí', 'Va todos los días, solo'] },
    ],
  };
  // on garde la question française d'origine (même ordre) pour le bouton « FR »
  const withFr = (es, fr) => es.map((q, i) => Object.assign(q, { fr: fr[i] ? (fr[i].tf ? 'Vrai ou faux ? « ' + fr[i].tf + ' »' : fr[i].q) : '' }));
  cards.forEach((c) => { if (QS_ES[c.id]) c.qs = withFr(QS_ES[c.id], c.qs); });
  [u1, u2, u3].forEach((u) => u.levels.forEach((l) => { if (l.reading && READ_QS_ES[l.id]) l.reading.qs = withFr(READ_QS_ES[l.id], l.reading.qs); }));

  window.VAMOS_CONTENT = { verbs, units: [u1, u2, u3], cards, placement, levelsText, soon };
})();
