/* Kopfloser Rauchtest fuer Levis Mine: DOM und Canvas gestubbt,
   damit spiel.js in Node laeuft und die Spiellogik wirklich ausgefuehrt wird. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const fehler = [];
// Synchron auf stderr, damit nichts verloren geht, und Rueckgabewert 1.
// Nicht verschlucken: sonst endet das Skript still vor dem Bericht.
process.on('uncaughtException', e => {
  fs.writeSync(2, 'AUSNAHME AUF OBERSTER EBENE:\n' + e.stack + '\n');
  process.exitCode = 1;
});

/* ------------------------------- Stubs ---------------------------------- */
function ctxStub(){
  const grad = { addColorStop(){} };
  const eigen = {};
  return new Proxy({}, {
    get(t, p){
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
      // Die Randbilder werden bildpunktweise gebaut, dafuer braucht es echte Daten
      if (p === 'createImageData') return (w, h) =>
        ({ width: w, height: h, data: new Uint8ClampedArray(w*h*4) });
      if (p === 'getImageData') return (sx, sy, w, h) =>
        ({ width: w, height: h, data: new Uint8ClampedArray(w*h*4) });
      if (p === 'canvas') return { width: 0, height: 0 };
      if (p in eigen) return eigen[p];
      return () => undefined;
    },
    set(t, p, v){ eigen[p] = v; return true; },
  });
}

function elStub(id){
  return {
    id, textContent:'', innerHTML:'', hidden:false, className:'', value:'',
    style:{cssText:''}, dataset:{}, children:[], parent:null, onclick:null,
    width:0, height:0,
    getContext(){ return ctxStub(); },
    getBoundingClientRect(){ return {width:700, height:400, x:0, y:0}; },
    addEventListener(){}, removeEventListener(){}, focus(){}, blur(){},
    appendChild(c){ c.parent = this; this.children.push(c); },
    remove(){
      if (!this.parent) return;
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    get firstChild(){ return this.children[0] || null; },
    get firstElementChild(){ return this.children[0] || null; },
  };
}

const elemente = {};
const document = {
  head: elStub('head'), body: elStub('body'), styleSheets: {length: 1},
  getElementById(id){ return elemente[id] || (elemente[id] = elStub(id)); },
  createElement(tag){ return elStub(tag); },
};

const speicher = new Map();
const localStorage = {
  getItem: k => (speicher.has(k) ? speicher.get(k) : null),
  setItem: (k, v) => speicher.set(k, String(v)),
  removeItem: k => speicher.delete(k),
};

// navigator ist in Node ein reiner Getter, das braucht defineProperty
Object.defineProperty(globalThis, 'navigator', {
  value: { maxTouchPoints: 0 }, configurable: true, writable: true,
});
Object.assign(globalThis, {
  document, localStorage, window: {},
  matchMedia: () => ({ matches: false }),
  getComputedStyle: () => new Proxy({}, { get: () => 'none' }),
  innerWidth: 1600, innerHeight: 900,
  addEventListener(){}, removeEventListener(){},
  requestAnimationFrame: () => 1,
  location: { reload(){} },
});

/* ------------------------------ Laden ----------------------------------- */
const quelle = fs.readFileSync(path.join(__dirname, 'spiel.js'), 'utf8');
try {
  vm.runInThisContext(quelle, { filename: 'spiel.js' });
} catch (e){
  console.error('LADEFEHLER:', e.stack);
  process.exit(1);
}

const lies = a => vm.runInThisContext(a);

/* Der Vorhang steht beim Start immer. Die Suite prueft das Spiel dahinter,
   darum wird hier einmal aufgeschlossen; der Vorhang selbst hat eigene
   Pruefungen weiter unten. */
lies('gesperrt = false; fensterZu()');

const pruefungen = [];
const pruefe = (name, bedingung, zusatz = '') => pruefungen.push({ name, ok: !!bedingung, zusatz });

const B = lies('BREITE'), HO = lies('HOEHE'), FU = lies('FUSS'), GI = lies('GIPFEL');

/* ------------------------- Berg und Startzustand ------------------------- */
pruefe('Welt erzeugt', lies('boden').length === B*HO, `${lies('boden').length} Kacheln`);
pruefe('Levi steht auf der Terrasse beim Haus',
  Math.abs(lies('P.y + P.h') - lies('basisY()')) < 0.001, 'y+h=' + lies('P.y + P.h').toFixed(3));
pruefe('Terrasse liegt auf Fusshoehe', lies('basisY()') === FU, 'basisY=' + lies('basisY()'));
pruefe('Start ohne Gold', lies('S.gold') === 0);
pruefe('Startwerkzeuge vorhanden', lies('Object.keys(S.werkzeuge).length') === 2);
pruefe('Seilwinden zum Start dabei', lies('S.seilwinde') === 2);

const berg = lies(`(() => {
  let hoch = 1e9, tief = -1e9, stufe = 0;
  for (let x = 0; x < BREITE; x++){ hoch = Math.min(hoch, ober[x]); tief = Math.max(tief, ober[x]); }
  for (let x = 1; x < BREITE; x++) stufe = Math.max(stufe, Math.abs(ober[x] - ober[x-1]));
  // Luft ueber der Flanke, Gestein darunter
  let luftOk = true, steinOk = true;
  for (let x = 1; x < BREITE-1; x++){
    if (boden[idx(x, ober[x]-1)] !== LEER) luftOk = false;
    if (boden[idx(x, ober[x]+3)] === LEER) steinOk = false;
  }
  return {gipfelHoehe: tief - hoch, groessteStufe: stufe, luftOk, steinOk};
})()`);
pruefe('Der Berg hat ein Profil, keine Ebene', berg.gipfelHoehe > GI*0.8,
  berg.gipfelHoehe + ' Kacheln Hoehenunterschied');
pruefe('Flanke ist mit einem Sprung begehbar', berg.groessteStufe <= 2,
  'groesste Stufe ' + berg.groessteStufe);
pruefe('Ueber der Flanke ist Luft', berg.luftOk);
pruefe('Unter der Flanke ist Gestein', berg.steinOk);

/* ----------------------------- Erzverteilung ---------------------------- */
const zaehl = lies(`(() => {
  const namen = {6:'erz',7:'kupfer',8:'bronze',9:'silber',10:'gold',11:'gas',13:'schatz'};
  const z = {}, oben = {}, unten = {};
  for (let y = 0; y < HOEHE; y++) for (let x = 1; x < BREITE-1; x++){
    const n = namen[boden[y*BREITE+x]]; if (!n) continue;
    z[n] = (z[n]||0)+1;
    ((y - FUSS) < 100 ? oben : unten)[n] = (((y - FUSS) < 100 ? oben : unten)[n]||0)+1;
  }
  return {z, oben, unten};
})()`);
pruefe('Erz vorhanden', (zaehl.z.erz||0) > 50, JSON.stringify(zaehl.z));
pruefe('Gold nur nennenswert tief', (zaehl.unten.gold||0) > (zaehl.oben.gold||0)*3,
  `oben ${zaehl.oben.gold||0}, unten ${zaehl.unten.gold||0}`);
pruefe('Billiges Erz auch tief noch da', (zaehl.unten.erz||0) > 0, `tief ${zaehl.unten.erz||0}`);
pruefe('Fundstuecke gesetzt', (zaehl.z.schatz||0) > 0, `${zaehl.z.schatz||0} Stueck`);
pruefe('Gastaschen gesetzt', (zaehl.z.gas||0) > 0, `${zaehl.z.gas||0} Stueck`);

/* ---------------------------- Graben nach unten -------------------------- */
/* Nach unten graben, und wie ein Spieler seitlich ausweichen, wenn eine
   zu harte Kachel den Schacht sperrt. Reines Dauerdruecken bleibt sonst
   an der ersten Hartstein-Kachel haengen. */
const tiefe = () => lies('Math.round((P.y + P.h - FUSS) * METER)');
let steckt = 0, letzteTiefe = 0, ausweichen = 0;
try {
  for (let schritt = 0; schritt < 80; schritt++){
    lies(ausweichen > 0 ? 'taste.ab = false; taste.rechts = true' : 'taste.ab = true; taste.rechts = false');
    for (let i = 0; i < 40; i++) lies('aktualisiere(1/60)');
    if (ausweichen > 0){ ausweichen--; continue; }
    const t = tiefe();
    if (t <= letzteTiefe){ steckt++; if (steckt >= 2){ ausweichen = 2; steckt = 0; } }
    else steckt = 0;
    letzteTiefe = t;
  }
} catch (e){ fehler.push('beim Graben: ' + e.stack); }
lies('taste.ab = false; taste.rechts = false');
// 40 m statt 60: bei 60 flackerte sie, echte Blockaden lagen frueher bei 0 bis 24 m
pruefe('Levi graebt sich tief nach unten', tiefe() > 40, tiefe() + ' m nach 53 s');
pruefe('Werkzeug nutzt sich ab', lies('S.werkzeuge.schaufel') < 120, 'Schaufel ' + lies('S.werkzeuge.schaufel'));
pruefe('Zustand bleibt im Rahmen', lies('S.leben') > 0 && lies('S.leben') <= 100, 'Leben ' + lies('S.leben'));

/* Levi erst landen lassen. Solange er faellt, wechselt die Zielkachel jedes
   Bild und der Grabfortschritt beginnt immer von neuem. */
function beruhige(){
  lies('taste.ab = false; taste.auf = false; taste.links = false; taste.rechts = false');
  for (let i = 0; i < 200; i++) lies('aktualisiere(1/60)');
  return lies('P.amBoden');
}

/* --------------------------- Nach oben graben ---------------------------- */
pruefe('Levi kommt zum Stehen', beruhige() === true);
lies('MATS.forEach(m => { S.fracht[m] = 0; S.lager[m] = 0; })');
const aufwaerts = lies(`(() => {
  const cx = Math.floor(P.x + P.b/2), oy = Math.floor(P.y) - 1;
  boden[idx(cx, oy)] = STEIN;
  bau[idx(cx, oy)] = 0;
  return {cx, oy, vorher: boden[idx(cx, oy)]};
})()`);
/* Erst ruhigstellen: mit der traegen Physik traegt Restschwung Levi sonst
   seitlich weg, die Zielkachel wechselt und der Fortschritt beginnt neu.
   Danach abbrechen, sobald die Kachel faellt. */
lies('P.vx = 0; P.vy = 0');
lies('taste.auf = true');
try {
  for (let i = 0; i < 600; i++){
    lies('aktualisiere(1/60)');
    if (lies(`boden[idx(${aufwaerts.cx}, ${aufwaerts.oy})]`) === 0) break;
    lies('P.vx = 0');
  }
} catch (e){ fehler.push('beim Graben nach oben: ' + e.stack); }
lies('taste.auf = false');
pruefe('Levi bricht die Kachel ueber dem Kopf',
  lies(`boden[idx(${aufwaerts.cx}, ${aufwaerts.oy})]`) === 0,
  'Kachel ' + lies(`boden[idx(${aufwaerts.cx}, ${aufwaerts.oy})]`));

/* ------------------------------- Erz und Gas ----------------------------- */
beruhige();
lies('MATS.forEach(m => { S.fracht[m] = 0; S.lager[m] = 0; })');
lies('boden[idx(Math.floor(P.x + P.b/2), Math.floor(P.y + P.h + 0.04))] = KUPFER');
lies('taste.ab = true');
try { for (let i = 0; i < 250; i++) lies('aktualisiere(1/60)'); }
catch (e){ fehler.push('beim Erzabbau: ' + e.stack); }
lies('taste.ab = false');
pruefe('Angebohrtes Erz landet im Rucksack', lies('S.fracht.kupfer') >= 1,
  'Kupfer ' + lies('S.fracht.kupfer'));

pruefe('Gastasche traegt die Maske des Gesteins',
  lies('tarnung(FUSS + 10)') === lies('ERDE') && lies('tarnung(FUSS + 250)') === lies('GRANIT'));
const lebenVorher = lies('S.leben');
lies('boden[idx(Math.floor(P.x + P.b/2), Math.floor(P.y + P.h + 0.04))] = GAS');
/* Auf den Einbruch selbst pruefen, nicht auf den Endwert: Levi kann zwischendurch
   ohnmaechtig werden oder an der Basis heilen, dann steigt das Leben wieder und
   der Vergleich vorher gegen nachher taeuscht. */
lies('S.leben = 100');
lies('taste.ab = true');
let tatWeh = false;
try {
  for (let i = 0; i < 250 && !tatWeh; i++){
    lies('aktualisiere(1/60)');
    if (lies('S.leben') < 100) tatWeh = true;
  }
} catch (e){ fehler.push('bei der Gastasche: ' + e.stack); }
lies('taste.ab = false');
pruefe('Gastasche tut weh', tatWeh, 'Leben faellt unter 100');
lies('S.leben = 100');

/* ----------------------------- Fracht nach Masse ------------------------- */
lies('MATS.forEach(m => S.fracht[m] = 0); S.fracht.gold = 8');
pruefe('Masse zaehlt, nicht Stueckzahl', lies('frachtMasse()') === 24, 'Masse ' + lies('frachtMasse()'));
pruefe('Voller Rucksack nimmt nichts mehr', lies('nimmMaterial("gold", 1)') === 0);
lies('MATS.forEach(m => S.fracht[m] = 0)');

/* ------------------------------- Klettern -------------------------------- */
lies(`(() => {
  const x = Math.floor(P.x + P.b/2), y = Math.floor(P.y + P.h/2);
  boden[idx(x,y)] = LEER; boden[idx(x,y-1)] = LEER;
  bau[idx(x,y)] = 1; bau[idx(x,y-1)] = 1;
})()`);
pruefe('Balken ist eine Leiter', lies('klettertHier()') === true);

/* -------------------------- Stuetzen und Einsturz ------------------------ */
const stuetzProbe = lies(`(() => {
  const x = 20, y = FUSS + 120;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++)
    boden[idx(x+dx, y+dy)] = LEER;
  const vorher = stabil(x, y);
  const alt = S.balken; S.balken = 5;
  const mx = P.x, my = P.y;
  P.x = x; P.y = y;
  setzeBalken();
  P.x = mx; P.y = my; S.balken = alt;
  return {vorher, imBereich: stabil(x + 4, y), ausserhalb: stabil(x + 6, y)};
})()`);
pruefe('Ungestuetzter Stollen gilt als unsicher', stuetzProbe.vorher === false);
pruefe('Balken stuetzt bis 4 Kacheln weit', stuetzProbe.imBereich === true);
pruefe('Jenseits der Reichweite bleibt es unsicher', stuetzProbe.ausserhalb === false);

/* ---------------------------- Gleis zur Basis ---------------------------- */
const gleis = lies(`(() => {
  const y = basisY();
  for (let x = BASIS_X; x <= BASIS_X + 6; x++){ boden[idx(x,y)] = LEER; bau[idx(x,y)] |= 2; }
  const ok = schienenBisBasis(BASIS_X + 6, y);
  bau[idx(BASIS_X + 5, y)] &= ~2;
  return {ok, luecke: schienenBisBasis(BASIS_X + 6, y)};
})()`);
pruefe('Durchgehendes Gleis erreicht die Basis', gleis.ok === true);
pruefe('Gleis mit Luecke erreicht sie nicht', gleis.luecke === false);

/* ------------------------------- Seilwinde ------------------------------- */
const seil = lies(`(() => {
  P.x = 30; P.y = FUSS + 150; P.vx = 0; P.vy = 0;
  const vorher = S.seilwinde, tiefVorher = P.y;
  nutzeSeilwinde();
  return {vorher, nachher: S.seilwinde, tiefVorher,
          amHaus: Math.abs(P.y + P.h - basisY()) < 0.001, x: P.x};
})()`);
pruefe('Seilwinde zieht Levi zur Basis', seil.amHaus === true, 'aus Zeile ' + seil.tiefVorher);
pruefe('Seilwinde wird verbraucht', seil.nachher === seil.vorher - 1,
  seil.vorher + ' auf ' + seil.nachher);
lies('S.seilwinde = 0');
lies('P.x = 30; P.y = FUSS + 150');
lies('nutzeSeilwinde()');
pruefe('Ohne Seilwinde geht es nicht', lies('Math.round(P.y)') === lies('FUSS + 150'));
lies('S.seilwinde = 2');

/* -------------------------------- Laden ---------------------------------- */
lies('P.x = BASIS_X; P.y = basisY() - P.h');
lies('S.gold = 400; S.lager.erz = 40; S.lager.kupfer = 20; S.lager.bronze = 20');
const goldVorher = lies('S.gold');
try { lies('kaufe("wagen")'); } catch (e){ fehler.push('kaufe(wagen): ' + e.stack); }
pruefe('Minenwagen kostet 50', lies('S.gold') === goldVorher - 50, 'Gold ' + lies('S.gold'));
pruefe('Frachtraum waechst mit dem Wagen', lies('kapazitaet()') === 50, 'Kapazitaet ' + lies('kapazitaet()'));

lies('S.verdient = 10; S.gold = 500');
lies('zeigeLaden()');
pruefe('Bohrfahrzeug erst ab 200 verdienten Goldstuecken',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes('Ab 200 verdient')`) === true);

lies('S.verdient = 500');
const vorBohrer = lies('S.gold');
lies('kaufe("bohrer")');
pruefe('Bohrfahrzeug kostet 100', lies('S.gold') === vorBohrer - 100, 'Gold ' + lies('S.gold'));
pruefe('Frachtraum mit Wagen und Bohrer', lies('kapazitaet()') === 85, 'Kapazitaet ' + lies('kapazitaet()'));

lies('S.lager.silber = 5');
const vorVerkauf = lies('S.gold');
lies('verkaufe("silber")');
pruefe('Silber bringt 14 je Einheit', lies('S.gold') === vorVerkauf + 70, 'Gold ' + lies('S.gold'));

/* ------------------------------ Fahrzeug --------------------------------- */
lies('wechsleFahrzeug()');
pruefe('Einstieg ins Bohrfahrzeug', lies('S.imFahrzeug') === true);
lies('taste.auf = true');
try { for (let i = 0; i < 240; i++) lies('aktualisiere(1/60)'); }
catch (e){ fehler.push('im Fahrzeug: ' + e.stack); }
lies('taste.auf = false');
pruefe('Schub verbraucht Treibstoff', lies('S.treibstoff') < 100, 'Tank ' + Math.round(lies('S.treibstoff')));
lies('wechsleFahrzeug()');

/* -------------------------------- Berge ---------------------------------- */
lies('S.gold = 5000; S.verdient = 5000');
try { lies('wechsleBerg(1)'); } catch (e){ fehler.push('wechsleBerg: ' + e.stack); }
pruefe('Zweiter Berg geoeffnet', lies('S.offen.includes(1)') === true);
pruefe('Zusatzarbeiter kommt dazu', lies('arbeiter()') === 1, 'Arbeiter ' + lies('arbeiter()'));
pruefe('Neue Welt erzeugt', lies('Object.keys(welten).length') === 2);
pruefe('Am neuen Berg wieder an der Basis', lies('anBasis()') === true);
pruefe('Jeder Berg hat ein eigenes Profil',
  lies('profilFeld(0).join(",") !== profilFeld(1).join(",")') === true);

/* ------------------------- Speichern und Laden --------------------------- */
lies('S.balken = 42; boden[idx(BASIS_X, basisY())] = LEER');
try { lies('speichere()'); } catch (e){ fehler.push('speichere: ' + e.stack); }
const schl = lies('SCHLUESSEL');
pruefe('Spielstand geschrieben', speicher.has(schl),
  schl + ', ' + Math.round((speicher.get(schl)||'').length/1024) + ' kB');

lies('S.balken = 0; delete welten[0]; delete welten[1]');
let geladen = false;
try { geladen = lies('lade()'); } catch (e){ fehler.push('lade: ' + e.stack); }
pruefe('Spielstand gelesen', geladen === true);
pruefe('Vorraete wiederhergestellt', lies('S.balken') === 42, 'Balken ' + lies('S.balken'));
pruefe('Beide Welten wiederhergestellt', lies('Object.keys(welten).length') === 2);
pruefe('Abgebaute Kachel bleibt abgebaut', lies('boden[idx(BASIS_X, basisY())]') === 0);
pruefe('Profil nach dem Laden wieder da', lies('ober.length') === B);

/* ------------------------------- Treppe ---------------------------------- */
/* Ohne Balken und Schienen muss Levi sich eine Treppe graben koennen.
   Dazu braucht er die Kachel schraeg ueber sich. */
beruhige();
const treppe = lies(`(() => {
  const x = 24, y = FUSS + 60;
  // Kammer freiraeumen, Levi auf festen Boden stellen
  for (let dy = -4; dy <= 1; dy++) for (let dx = -2; dx <= 3; dx++)
    boden[idx(x+dx, y+dy)] = LEER;
  for (let dx = -2; dx <= 3; dx++) boden[idx(x+dx, y+1)] = ERDE;
  boden[idx(x+1, y)] = ERDE;        // Wand vor Levi
  boden[idx(x+1, y-1)] = ERDE;      // die Stufe, die er wegnehmen soll
  P.x = x + 0.15; P.y = y + 1 - P.h; P.vx = 0; P.vy = 0;
  for (let i = 0; i < 30; i++) aktualisiere(1/60);
  return {x, y, stufeVorher: boden[idx(x+1, y-1)], wandVorher: boden[idx(x+1, y)],
          ziel: JSON.stringify(diagonalZiel())};
})()`);
pruefe('Stufe steht vor dem Graben', treppe.stufeVorher !== 0 && treppe.wandVorher !== 0);

/* Einstuerze fuer diesen Abschnitt stilllegen: sonst kann die eben gesetzte
   Probekachel zu Geroell werden und die Pruefung flackert. */
lies('var echtEinsturz = pruefeEinsturz; pruefeEinsturz = function(){};');
lies('taste.auf = true; taste.rechts = true');
const zielGefunden = lies('diagonalZiel() !== null');
pruefe('Diagonales Ziel wird erkannt', zielGefunden === true, treppe.ziel);
try { for (let i = 0; i < 400; i++) lies('aktualisiere(1/60)'); }
catch (e){ fehler.push('beim Treppengraben: ' + e.stack); }
lies('taste.auf = false; taste.rechts = false');
pruefe('Levi bricht die Kachel schraeg ueber sich',
  lies(`boden[idx(${treppe.x}+1, ${treppe.y}-1)]`) === 0,
  'Kachel ' + lies(`boden[idx(${treppe.x}+1, ${treppe.y}-1)]`));
lies('pruefeEinsturz = echtEinsturz;');
pruefe('Die Wand darunter bleibt als Stufe stehen',
  lies(`boden[idx(${treppe.x}+1, ${treppe.y})]`) !== 0,
  'Kachel ' + lies(`boden[idx(${treppe.x}+1, ${treppe.y})]`));

/* Und die Stufe muss auch bestiegen werden koennen. Frisches Szenario, damit
   das Graben von vorher nicht hineinspielt: ebener Boden, eine Kachel hohe
   Stufe rechts, Luft darueber. Levi laeuft nach rechts und springt getaktet. */
const stiege = lies(`(() => {
  const x = 34, y = FUSS + 80;
  for (let dy = -6; dy <= 2; dy++) for (let dx = -3; dx <= 5; dx++)
    boden[idx(x+dx, y+dy)] = LEER;
  for (let dx = -3; dx <= 12; dx++) boden[idx(x+dx, y+1)] = ERDE;  // Boden
  for (let dx = 1; dx <= 10; dx++)  boden[idx(x+dx, y)]  = ERDE;   // breite Stufe
  P.x = x + 0.1; P.y = y + 1 - P.h; P.vx = 0; P.vy = 0;
  for (let i = 0; i < 30; i++) aktualisiere(1/60);
  return {x, y, startFuss: +(P.y + P.h).toFixed(2)};
})()`);
lies('taste.rechts = true');
let bestiegen = false;
for (let bild = 0; bild < 400 && !bestiegen; bild++){
  lies(bild % 30 < 4 ? 'taste.auf = true' : 'taste.auf = false');
  lies('aktualisiere(1/60)');
  if (Math.abs(lies('P.y + P.h') - stiege.y) < 0.02 && lies('P.amBoden')) bestiegen = true;
}
lies('taste.rechts = false; taste.auf = false');
pruefe('Levi steigt die Stufe hinauf', bestiegen,
  'Start Zeile ' + stiege.startFuss + ', jetzt ' + lies('(P.y + P.h).toFixed(2)') +
  ', Stufe ist ' + stiege.y);

/* ------------------------ Aufrufpunkte vorhanden ------------------------- */
/* Ein zeilenweises Entfernen hat einmal fensterZu mitgelöscht. node --check
   fand nichts, weil es syntaktisch gueltig blieb. Darum diese Liste. */
const AUFRUFE = ['fenster','fensterZu','zeigeLaden','zeigeBerge','zeigeHilfe','kaufe','verkaufe',
  'wechsleBerg','setzeBalken','legeSchiene','zuendeDynamit','sendeWagen','nutzeSeilwinde',
  'wechsleFahrzeug','speichere','lade','neuAnfangen','zeichne','hud','ladenListe','zeigeAbsturz'];
const fehlend = AUFRUFE.filter(f => lies('typeof ' + f) !== 'function');
pruefe('Alle Aufrufpunkte vorhanden', fehlend.length === 0,
  fehlend.length ? 'fehlt: ' + fehlend.join(', ') : AUFRUFE.length + ' Funktionen');

lies('zeigeHilfe()');
pruefe('Fenster geht auf', lies('document.getElementById("schleier").hidden') === false);
lies('fensterZu()');
pruefe('Fenster geht zu', lies('document.getElementById("schleier").hidden') === true);

/* -------------------------------- Lampe ---------------------------------- */
pruefe('Lampe beginnt auf Stufe 1', lies('S.lampe') === 0);
pruefe('Lampenstufen leuchten weiter', lies('LAMPEN.every((l,i) => i === 0 || l.weite > LAMPEN[i-1].weite)'),
  lies('LAMPEN.map(l => l.weite).join(" / ")'));
lies('S.gold = 5000; S.lager.kupfer = 40; S.lager.silber = 40');
lies('zeigeLaden()');
pruefe('Laden bietet die naechste Lampe an',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes(LAMPEN[1].name)`) === true,
  lies('LAMPEN[1].name'));
const goldVorLampe = lies('S.gold');
lies('kaufe("lampe")');
pruefe('Lampe steigt eine Stufe', lies('S.lampe') === 1);
pruefe('Lampe kostet Gold', lies('S.gold') === goldVorLampe - lies('LAMPEN[1].preis.gold'),
  goldVorLampe + ' auf ' + lies('S.gold'));
lies('kaufe("lampe"); kaufe("lampe"); kaufe("lampe"); kaufe("lampe")');
pruefe('Lampe nicht ueber die letzte Stufe hinaus', lies('S.lampe') === lies('LAMPEN.length - 1'),
  'Stufe ' + (lies('S.lampe')+1) + ' von ' + lies('LAMPEN.length'));
lies('zeigeLaden()');
pruefe('Bei der besten Lampe steht Beste Stufe',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes('Beste Stufe')`) === true);
lies('S.lampe = 0; fensterZu()');

/* --------------------------- Ausbaustand --------------------------------- */
lies('S.gekauft = ["schaufel","pickel"]; S.lampe = 0; S.wagen = false; S.bohrer = false');
pruefe('Ausbau beginnt bei zwei von neun',
  lies('ausbauStand()') === 2 && lies('AUSBAU.length') === 9,
  lies('ausbauStand()') + ' von ' + lies('AUSBAU.length'));
lies('zeigeLaden()');
pruefe('Der Laden zeigt den Ausbaustand',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes('Ausrüstung 2 von 9')`) === true);
lies('S.gold = 9000; S.verdient = 9000; MATS.forEach(m => S.lager[m] = 99)');
lies('kaufe("wagen")');
pruefe('Ein Kauf hebt den Ausbaustand', lies('ausbauStand()') === 3, lies('ausbauStand()') + ' von 9');
lies('kaufe("wagen")');
pruefe('Derselbe Posten zaehlt nur einmal', lies('ausbauStand()') === 3);
lies('kaufe("lampe"); kaufe("lampe"); kaufe("lampe")');
pruefe('Lampenstufen zaehlen einzeln', lies('ausbauStand()') === 6, lies('ausbauStand()') + ' von 9');
lies('kaufe("hammer"); kaufe("nagel"); kaufe("bohrer")');
pruefe('Vollstaendige Ausruestung erreicht neun', lies('ausbauStand()') === 9,
  lies('ausbauStand()') + ' von 9');
lies('fensterZu()');

/* Etappenmarken: die Abstaende muessen mit der Tiefe wachsen */
const marken = lies('FUNK.map(f => f.tiefe)');
const abstaende = marken.map((t, i) => i ? t - marken[i-1] : t);
pruefe('Etappenabstaende wachsen mit der Tiefe',
  abstaende.every((a, i) => i === 0 || a > abstaende[i-1]), abstaende.join(', ') + ' m');
const belohnung = lies('FUNK.map(f => f.gold)');
pruefe('Die Belohnung waechst mit',
  belohnung.every((g, i) => i === 0 || g > belohnung[i-1]), belohnung.join(', ') + ' Goldstücke');

/* --------------------------- Spielerauswahl ------------------------------ */
/* Kein Passwort: das Spiel liegt als reine Seite ohne Server, eine Pruefung
   liefe im Browser und waere aus dem Quelltext zu umgehen. Was zaehlt, ist
   dass mehrere Kinder an einem Geraet getrennte Staende haben. */
lies('zeigeAnmeldung()');
const anmeldung = () => lies(`document.getElementById('fensterInhalt').innerHTML`);
pruefe('Die Auswahl fragt nach dem Namen',
  lies(`document.getElementById('fensterTitel').textContent`) === 'Wer gräbt?');
pruefe('Und bietet ein Namensfeld', anmeldung().includes('id="neuerName"'));
pruefe('Sie verspricht kein Passwort', anmeldung().includes('Kein Passwort'));

pruefe('Der Schluessel haengt am Namen',
  lies('schluesselFuer("Levi")') !== lies('schluesselFuer("Anna")'),
  lies('schluesselFuer("Levi")') + ' gegen ' + lies('schluesselFuer("Anna")'));
pruefe('Gross und klein sind derselbe Spieler',
  lies('schluesselFuer("Levi")') === lies('schluesselFuer("levi")'));

lies('spielerSchreiben(["Levi","Anna"])');
lies('zeigeAnmeldung()');
pruefe('Vorhandene Spieler stehen zur Wahl',
  anmeldung().includes('Als Levi spielen') && anmeldung().includes('Als Anna spielen'));
lies('tueEs("neuerSpieler")');   // ohne Eingabe darf nichts passieren
pruefe('Ohne Namen wird niemand angemeldet',
  lies('localStorage.getItem(SPIELER_ZULETZT)') === null);
pruefe('Ein leerer Name wird abgelehnt', lies('anmelden("   ")') === false);
lies('spielerSchreiben([]); fensterZu()');

/* ---------------------------- Keine Sackgasse ---------------------------- */
/* Ohne Werkzeug, ohne Gold und mit leerem Lager kann Levi nichts mehr brechen
   und darum nichts mehr verdienen. Gemessen waren das 0 Meter nach zehn
   Sekunden Graben, das Spiel war von dort aus unspielbar. */
lies('S.werkzeuge = {}; S.gold = 0; S.dynamit = 0');
lies('MATS.forEach(m => { S.lager[m] = 0; S.fracht[m] = 0; })');
lies('P.x = BASIS_X; P.y = basisY() - P.h; P.vx = 0; P.vy = 0');
pruefe('Sackgasse ist erkennbar', lies('bestesWerkzeug(1)') === null);
for (let i = 0; i < 20; i++) lies('aktualisiere(1/60)');
pruefe('Das Haus gibt eine Reserveschaufel', lies('bestesWerkzeug(1)') !== null,
  'Schaufel ' + lies('S.werkzeuge.schaufel || 0'));
lies('taste.ab = true');
for (let i = 0; i < 240; i++) lies('aktualisiere(1/60)');
lies('taste.ab = false');
pruefe('Und damit geht es wieder abwaerts',
  lies('Math.round((P.y + P.h - FUSS) * METER)') > 0,
  lies('Math.round((P.y + P.h - FUSS) * METER)') + ' m');

/* Wer noch Gold oder Erz hat, bekommt nichts geschenkt */
lies('S.werkzeuge = {}; S.gold = 500; MATS.forEach(m => S.lager[m] = 0)');
lies('P.x = BASIS_X; P.y = basisY() - P.h');
for (let i = 0; i < 20; i++) lies('aktualisiere(1/60)');
pruefe('Mit Gold gibt es keine Gratisschaufel', lies('bestesWerkzeug(1)') === null);
lies('S.werkzeuge = {schaufel:120, pickel:95}');

/* Zweite Sackgasse: unten gestrandet ohne Seil und ohne Gold fuer eines */
lies('S.seilwinde = 0; S.gold = 0; S.werkzeuge = {schaufel:120, pickel:95}');
lies('P.x = BASIS_X; P.y = basisY() - P.h');
for (let i = 0; i < 20; i++) lies('aktualisiere(1/60)');
pruefe('Ohne Seil und ohne Gold gibt das Haus eines mit', lies('S.seilwinde') >= 1,
  lies('S.seilwinde') + ' Seilwinden');
lies('S.seilwinde = 0; S.gold = 500');
for (let i = 0; i < 20; i++) lies('aktualisiere(1/60)');
pruefe('Wer zahlen kann, bekommt keines geschenkt', lies('S.seilwinde') === 0);
lies('S.gold = 0; S.seilwinde = 2');

/* ----------------------------- Erz verkaufen ----------------------------- */
/* Erz wird beim Abliefern nicht zu Gold, es landet im Lager. Wer das nicht
   sieht, steht mit vollem Lager und null Goldstuecken da. */
lies('MATS.forEach(m => S.lager[m] = 0); S.gold = 0');
lies('S.lager.erz = 10; S.lager.kupfer = 5; S.lager.silber = 2');
pruefe('Der Lagerwert wird richtig gerechnet',
  lies('lagerWert()') === 10*lies('MATERIAL.erz.wert') + 5*lies('MATERIAL.kupfer.wert')
                       + 2*lies('MATERIAL.silber.wert'),
  lies('lagerWert()') + ' Goldstücke');
lies('hud()');
pruefe('Die Statustafel nennt den Lagerwert',
  lies(`document.getElementById('lagerKopf').textContent`).includes('Goldstücke wert'),
  lies(`document.getElementById('lagerKopf').textContent`));
lies('zeigeLaden()');
pruefe('Der Laden bietet Alles verkaufen an',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes('Alles verkaufen')`) === true);
const wertVorher = lies('lagerWert()');
lies('tueEs("allesVerkaufen")');
pruefe('Alles verkaufen leert das Lager', lies('lagerWert()') === 0);
pruefe('Und schreibt den vollen Wert gut', lies('S.gold') === wertVorher,
  wertVorher + ' Goldstücke');
lies('fensterZu()');
lies('S.gold = 0; MATS.forEach(m => S.lager[m] = 0)');
lies('zeigeLaden()');
pruefe('Bei leerem Lager kein Knopf',
  lies(`document.getElementById('fensterInhalt').innerHTML.includes('Alles verkaufen')`) === false);
lies('fensterZu()');

/* -------------------------------- Leiter --------------------------------- */
/* An einer Leiter mit festem Boden darunter konnte Levi weder landen noch
   weitergraben: das Graben war mit !P.klettert gesperrt und die Schwerkraft
   beim Klettern aus. Da das Spiel zum Setzen von Balken auffordert, traf es
   genau den vorgesehenen Weg. */
const leiter = lies(`(() => {
  const x = 24, y = FUSS + 40;
  for (let dy = -6; dy <= 0; dy++){ boden[idx(x,y+dy)] = LEER; bau[idx(x,y+dy)] = 1; }
  boden[idx(x, y+1)] = ERDE;
  P.x = x + 0.15; P.y = y + 1 - P.h; P.vx = 0; P.vy = 0;
  for (let i=0;i<30;i++) aktualisiere(1/60);
  return {x, y, amBoden: P.amBoden, klettert: P.klettert};
})()`);
pruefe('Auf der Leiter mit Boden darunter steht Levi auf', leiter.amBoden === true);
pruefe('Und haengt dabei nicht in der Leiter', leiter.klettert === false);
lies('taste.ab = true');
pruefe('Abwaerts findet er dort eine Zielkachel', lies('zielKachel() !== null'));
/* Bis zum Ziel graben lassen statt fest 400 Bilder: mit der traegen Physik und
   wechselnder Haerte schafft er die vier Kacheln mal schneller, mal langsamer. */
for (let i = 0; i < 1200; i++){
  lies('aktualisiere(1/60)');
  if (lies('P.y + P.h') > leiter.y + 4.2) break;
}
lies('taste.ab = false');
pruefe('Und graebt sich weiter hinunter',
  lies('P.y + P.h') > leiter.y + 4,
  'von Zeile ' + (leiter.y+1) + ' auf ' + lies('(P.y + P.h).toFixed(1)'));

/* ------------------------------ Optionen --------------------------------- */
const inhalt = () => lies(`document.getElementById('fensterInhalt').innerHTML`);
lies('fensterZu()');
lies('zeigeOptionen()');
pruefe('Optionsfenster geht auf', lies('document.getElementById("schleier").hidden') === false);
pruefe('Optionsfenster heisst Pause',
  lies(`document.getElementById('fensterTitel').textContent`) === 'Pause');
for (const w of ['Neues Spiel', 'Ton', 'Laden', 'Berge', 'Hilfe', 'Weiterspielen'])
  pruefe('Optionen bieten ' + w, inhalt().includes(w));

/* Ein Neustart loescht den Spielstand, darum wird zuerst nachgefragt */
lies('tueEs("neu")');
pruefe('Neues Spiel fragt erst nach', inhalt().includes('Wirklich neu anfangen'));
pruefe('Die Nachfrage nennt den Verlust', inhalt().includes('Goldstücke'));
pruefe('Die Nachfrage laesst sich abbrechen', inhalt().includes('data-tat="zurueck"'));
lies('tueEs("zurueck")');
pruefe('Abbrechen schliesst das Fenster', lies('document.getElementById("schleier").hidden') === true);
pruefe('Abbrechen loescht nichts', speicher.has(lies('SCHLUESSEL')));

/* Ton laesst sich hier umschalten */
const tonVorher = lies('S.ton');
lies('zeigeOptionen(); tueEs("ton")');
pruefe('Ton laesst sich umschalten', lies('S.ton') === !tonVorher);
lies('tueEs("ton")');
pruefe('Und wieder zurueck', lies('S.ton') === tonVorher);

/* Erst die Bestaetigung raeumt wirklich ab */
lies('speichere()');
pruefe('Vor dem Neustart liegt ein Stand vor', speicher.has(lies('SCHLUESSEL')));
lies('tueEs("neuJa")');
pruefe('Bestaetigter Neustart loescht den Stand', !speicher.has(lies('SCHLUESSEL')));
/* Der eigentliche Fehler lag danach: beim Neuladen feuert beforeunload und
   ruft speichere(), das den eben geloeschten Stand zurueckschrieb. Der Stub
   fuehrt kein reload aus, darum wird der Aufruf hier von Hand nachgestellt. */
lies('speichere()');
pruefe('Nach dem Neustart schreibt auch beforeunload nichts zurueck',
  !speicher.has(lies('SCHLUESSEL')));
lies('S.gold = 999; speichere()');
pruefe('Auch der laufende Selbstspeicher bleibt gesperrt',
  !speicher.has(lies('SCHLUESSEL')));
lies('abgeraeumt = false');          // fuer die folgenden Pruefungen wieder freigeben
lies('fensterZu()');

/* --------------------------- Assetversion -------------------------------- */
/* Commit 833f93a hat die Version von 8 auf 3 zurueckgesetzt. Danach liefen
   Erhoehungen, die auf die alte Zahl ankerten, still ins Leere, und die Seite
   forderte weiter eine Fassung an, die Browser schon zwischengespeichert
   hatten. Diese Pruefung faengt wenigstens ein Auseinanderlaufen der beiden. */
const seite = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const vCss = (seite.match(/style\.css\?v=(\d+)/) || [])[1];
const vJs  = (seite.match(/spiel\.js\?v=(\d+)/) || [])[1];
pruefe('Beide Dateien tragen eine Version', !!vCss && !!vJs, `css ${vCss}, js ${vJs}`);
pruefe('Beide Versionen stimmen ueberein', vCss === vJs, `css ${vCss}, js ${vJs}`);

/* ------------------------------ Zeichnen --------------------------------- */
try { lies('zeichne(); hud()'); } catch (e){ fehler.push('zeichne/hud: ' + e.stack); }
pruefe('Zeichnen und HUD laufen durch', !fehler.some(f => f.includes('zeichne/hud')));

/* Der Sichtbarkeitstest von zeichneHaus verlaesst die Funktion, wenn die Basis
   ausserhalb des Bildes liegt. Dadurch blieb ein ReferenceError darin
   unentdeckt, bis der Browser ihn warf. Hier wird jede Zeichenfunktion einmal
   erzwungen, mit der Kamera an der Basis. */
let malFehler = null;
try {
  lies('ladeWelt(0)');
  lies('const z = kameraZiel(); kamera.x = z.x; kamera.y = z.y;');
  lies('zeichneHimmel(); zeichneHaus(); zeichneLevi(); zeichneDunkelheit();');
  lies('S.imFahrzeug = true; zeichneLevi(); S.imFahrzeug = false;');
} catch (e){ malFehler = e.message; }
pruefe('Jede Zeichenfunktion laeuft an der Basis durch', malFehler === null,
  malFehler || 'Himmel, Haus, Figur, Fahrzeug, Dunkelheit');
pruefe('47 Randfaelle statt 16', lies('FAELLE') === 47, lies('FAELLE') + ' Faelle');
pruefe('Randbilder je Gesteinsart gebaut',
  [lies('ERDE'), lies('STEIN'), lies('HARTSTEIN'), lies('GRANIT')]
    .every(t => lies(`randBild[${t}] && randBild[${t}].length`) === 47));
/* Der eigentliche Befund: mit vier Orthogonalen waren gerade Wand, Aussenecke
   und Innenecke dieselbe Maske, darum sahen senkrechte Waende gestuft aus. */
pruefe('Wand, Aussenecke und Innenecke sind unterscheidbar',
  lies('new Set([randFall[64], randFall[65], randFall[128]]).size') === 3);
pruefe('Eine Diagonale zaehlt nur bei zwei festen Orthogonalen',
  lies('randFall[128] !== randFall[128 | 1]') === true);
pruefe('Kachelvarianten gebaut', lies('kachelBild[ERDE].length') === lies('VARIANTEN'),
  lies('VARIANTEN') + ' Varianten');

/* --------------------------- Zeit und Elternsperre ------------------------ */
lies('localStorage.removeItem(ZEIT)');
pruefe('Standardlimit sind 20 Minuten', lies('limitMinuten()') === 20);

lies("zeitStand = {sekunden: 0, gewarnt: 0}; fensterZu()");
for (let i = 0; i < 120; i++) lies('aktualisiere(1/60)');
pruefe('Gespielte Zeit wird gezaehlt', lies('zeitStand.sekunden') > 1.5,
  lies('zeitStand.sekunden').toFixed(1) + ' s nach 2 s Spiel');
lies('hud()');
pruefe('Die Kopfleiste zeigt die Restzeit',
  /^\d+:\d\d$/.test(lies(`document.getElementById('zeitRest').textContent`)),
  lies(`document.getElementById('zeitRest').textContent`));

/* Kurz vor Schluss muss gewarnt werden, danach ist zu */
lies('zeitStand.sekunden = limitMinuten()*60 - 1; zeitStand.gewarnt = 0; fensterZu()');
for (let i = 0; i < 180; i++) lies('aktualisiere(1/60)');   // 3 s, also ueber die Null hinaus
pruefe('Vor dem Ende wird gewarnt', lies('zeitStand.gewarnt') > 0, 'Marke ' + lies('zeitStand.gewarnt'));
pruefe('Bei null ist Schluss', lies('document.getElementById("schleier").hidden') === false);
pruefe('Und das Fenster sagt es',
  lies(`document.getElementById('fensterTitel').textContent`) === 'Für heute ist Schluss');
lies('fensterZu()');

/* Ein neuer Tag setzt die Uhr zurueck */
/* Die Uhr laeuft NICHT mit dem Datum ab. Sonst setzte ein Tageswechsel sie von
   selbst zurueck, und die Systemuhr vorzustellen ist kein Kunststueck. */
lies("zeitStand = {sekunden: 9999, gewarnt: 0}; fensterZu()");
lies('zeitSichern(); zeitLaden()');
pruefe('Ein Neuladen setzt die Uhr nicht zurueck', lies('zeitStand.sekunden') > 9000,
  lies('zeitStand.sekunden').toFixed(0) + ' s');
pruefe('Es gibt keinen Tagesbezug mehr', !('tag' in lies('zeitStand')),
  Object.keys(lies('zeitStand')).join(', '));
lies('window.zeitZuruecksetzen()');
pruefe('Nur das Zuruecksetzen gibt frei', lies('zeitStand.sekunden') === 0);

/* ------------------------------- Bericht --------------------------------- */
function bericht(){
  console.log('');
  let schlecht = 0;
  for (const p of pruefungen){
    if (!p.ok) schlecht++;
    console.log((p.ok ? '  ok   ' : '  FEHL ') + p.name + (p.zusatz ? '   [' + p.zusatz + ']' : ''));
  }
  console.log('');
  if (fehler.length){
    console.log('Ausnahmen:');
    for (const f of fehler) console.log('  ' + f.split('\n').slice(0,3).join('\n  '));
    console.log('');
  }
  console.log(`${pruefungen.length - schlecht} von ${pruefungen.length} Pruefungen ok, ${fehler.length} Ausnahmen`);
  process.exitCode = (schlecht || fehler.length) ? 1 : 0;
}

/* Kein Elternbereich mehr im Spiel: was Levi sehen kann, kann Levi bedienen.
   Zurueckgesetzt wird ueber die Konsole. */
(async () => {
  try {
    pruefe('Kein Elternbereich im Optionsfenster', (() => {
      lies('zeigeOptionen()');
      const i = lies(`document.getElementById('fensterInhalt').innerHTML`);
      lies('fensterZu()');
      return !i.includes('Elternbereich') && !i.includes('Passwort');
    })());
    pruefe('Die Konsolenbefehle stehen bereit',
      lies('typeof window.zeitZuruecksetzen') === 'function'
      && lies('typeof window.zeitLimit') === 'function');
    lies('zeitStand.sekunden = 900; zeitStand.gewarnt = 300');
    lies('window.zeitZuruecksetzen()');
    pruefe('Zuruecksetzen stellt die Uhr auf null', lies('zeitStand.sekunden') === 0);
    pruefe('Und die Warnung wieder scharf', lies('zeitStand.gewarnt') === 0);
    lies('window.zeitLimit(35)');
    pruefe('Das Limit laesst sich setzen', lies('limitMinuten()') === 35);
    lies('window.zeitLimit(0)');
    pruefe('Null schaltet es ab', lies('limitMinuten()') === 0);
    lies('zeitStand.sekunden = 999999; fensterZu()');
    for (let i = 0; i < 60; i++) lies('aktualisiere(1/60)');
    pruefe('Ohne Limit ist nie Schluss',
      lies('document.getElementById("schleier").hidden') === true);
    lies('window.zeitLimit(20)');
    pruefe('Und wieder zurueck auf zwanzig', lies('limitMinuten()') === 20);

    /* Der Vorhang vor dem Spiel. Ausdruecklich kein Schloss, sondern eine
       Maske, die aufhaelt, wer einfach spielen will. */
    lies("localStorage.removeItem(SPIEL_PW); gesperrt = false");
    pruefe('Ohne eigenes Wort gilt das eingebaute', lies('pwDaten()') === null);
    pruefe('Das eingebaute Wort passt',
      (await lies("aufschliessen('bergmine höfen')")) === true);
    pruefe('Gross und klein sind egal',
      (await lies("aufschliessen('  Bergmine   HÖFEN ')")) === true);
    pruefe('Ein anderes Wort passt nicht',
      (await lies("aufschliessen('sesam')")) === false);
    await lies("window.spielPasswort('geheim')");
    pruefe('Ein Wort laesst sich setzen', lies('pwDaten()') !== null);
    pruefe('Es liegt nicht im Klartext',
      !JSON.stringify(lies('pwDaten()')).includes('geheim'),
      Object.keys(lies('pwDaten()')).join(', '));

    lies('gesperrt = true; zeigeSchloss()');
    pruefe('Die Maske fragt nach dem Wort',
      lies(`document.getElementById('fensterInhalt').innerHTML`).includes('schlossFeld'));
    lies('fensterZu()');
    pruefe('Escape schiebt den Vorhang nicht weg',
      lies('document.getElementById("schleier").hidden') === false);

    pruefe('Ein falsches Wort schliesst nicht auf',
      (await lies("aufschliessen('falsch')")) === false && lies('gesperrt') === true);
    pruefe('Das richtige schon',
      (await lies("aufschliessen('geheim')")) === true && lies('gesperrt') === false);

    await lies("window.spielPasswort('')");
    pruefe('Der Vorhang laesst sich wieder entfernen', lies('pwDaten()') === null);
    /* Der eigentliche Punkt: die Uhr haengt am Geraet, nicht am Spielstand.
       Sonst gaebe ein neuer Name auf dem Startbildschirm frische Minuten. */
    lies('zeitStand.sekunden = 600; zeitSichern()');
    pruefe('Die Zeit steht nicht im Spielstand',
      !JSON.stringify(lies('S')).includes('zeitHeute'));
    lies('SCHLUESSEL = schluesselFuer("EinAndererName"); lade()');
    pruefe('Ein anderer Spieler erbt die verbrauchte Zeit',
      lies('zeitStand.sekunden') === 600, lies('zeitStand.sekunden') + ' s');
  } catch (e){ fehler.push('bei der Spielzeit: ' + e.stack); }
  bericht();
})();
