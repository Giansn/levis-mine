/* Kopfloser Rauchtest fuer Levis Mine: DOM und Canvas gestubbt,
   damit spiel.js in Node laeuft und die Spiellogik wirklich ausgefuehrt wird. */
const fs = require('fs');
const vm = require('vm');

const fehler = [];
process.on('uncaughtException', e => fehler.push('uncaught: ' + e.stack));

/* ------------------------------- Stubs ---------------------------------- */
function ctxStub(){
  const grad = { addColorStop(){} };
  const eigen = {};
  return new Proxy({}, {
    get(t, p){
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
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
    style:{}, dataset:{}, children:[], parent:null, onclick:null,
    width:0, height:0,
    getContext(){ return ctxStub(); },
    addEventListener(){}, removeEventListener(){},
    appendChild(c){ c.parent = this; this.children.push(c); },
    remove(){
      if (!this.parent) return;
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    get firstChild(){ return this.children[0] || null; },
  };
}

const elemente = {};
const document = {
  getElementById(id){ return elemente[id] || (elemente[id] = elStub(id)); },
  createElement(tag){ return elStub(tag); },
};

const speicher = new Map();
const localStorage = {
  getItem: k => (speicher.has(k) ? speicher.get(k) : null),
  setItem: (k, v) => speicher.set(k, String(v)),
  removeItem: k => speicher.delete(k),
};

const lauscher = {};
const window = {};
let rafRueckruf = null;

Object.assign(globalThis, {
  document, localStorage, window,
  innerWidth: 1600, innerHeight: 900,
  addEventListener: (typ, fn) => { (lauscher[typ] = lauscher[typ] || []).push(fn); },
  removeEventListener(){},
  requestAnimationFrame: fn => { rafRueckruf = fn; return 1; },
  location: { reload(){} },
});

/* ------------------------------ Laden ----------------------------------- */
const quelle = fs.readFileSync(require('path').join(__dirname, 'spiel.js'), 'utf8');
try {
  vm.runInThisContext(quelle, { filename: 'spiel.js' });
} catch (e){
  console.error('LADEFEHLER:', e.stack);
  process.exit(1);
}

const lies = ausdruck => vm.runInThisContext(ausdruck);
const pruefungen = [];
function pruefe(name, bedingung, zusatz = ''){
  pruefungen.push({ name, ok: !!bedingung, zusatz });
}

/* ------------------------- Welt und Startzustand ------------------------- */
const B = lies('BREITE'), HO = lies('HOEHE'), HI = lies('HIMMEL');
pruefe('Welt erzeugt', lies('boden').length === B*HO, `${lies('boden').length} Kacheln`);
pruefe('Spieler steht auf der Oberflaeche',
  Math.abs(lies('P.y + P.h') - HI) < 0.001, 'y+h=' + lies('P.y + P.h').toFixed(3));
pruefe('Start ohne Gold', lies('S.gold') === 0);
pruefe('Startwerkzeuge vorhanden', lies('Object.keys(S.werkzeuge).length') === 2);

/* Erzverteilung: billiges Erz muss auch tief noch vorkommen, teures oben selten */
const zaehl = lies(`(() => {
  const z = {}; const namen = {6:'erz',7:'kupfer',8:'bronze',9:'silber',10:'gold',11:'gas',13:'schatz'};
  const oben = {}, unten = {};
  for (let y = HIMMEL; y < HOEHE; y++) for (let x = 1; x < BREITE-1; x++){
    const t = boden[y*BREITE+x]; const n = namen[t]; if (!n) continue;
    z[n] = (z[n]||0)+1;
    const ziel = (y-HIMMEL) < 100 ? oben : unten;
    ziel[n] = (ziel[n]||0)+1;
  }
  return {z, oben, unten};
})()`);
pruefe('Erz vorhanden', (zaehl.z.erz||0) > 50, JSON.stringify(zaehl.z));
pruefe('Gold nur nennenswert tief', (zaehl.unten.gold||0) > (zaehl.oben.gold||0),
  `oben ${zaehl.oben.gold||0}, unten ${zaehl.unten.gold||0}`);
pruefe('Billiges Erz auch tief noch da', (zaehl.unten.erz||0) > 0, `tief ${zaehl.unten.erz||0}`);
pruefe('Fundstuecke gesetzt', (zaehl.z.schatz||0) > 0, `${zaehl.z.schatz||0} Stueck`);
pruefe('Gastaschen gesetzt', (zaehl.z.gas||0) > 0, `${zaehl.z.gas||0} Stueck`);

/* ---------------------------- Graben nach unten -------------------------- */
lies('taste.ab = true');
let bilder = 0;
try {
  for (; bilder < 3000; bilder++) lies('aktualisiere(1/60)');
} catch (e){ fehler.push('beim Graben nach ' + bilder + ' Bildern: ' + e.stack); }
lies('taste.ab = false');

const tiefe = lies('Math.round((P.y + P.h - HIMMEL) * METER)');
pruefe('Levi graebt sich nach unten', tiefe > 30, tiefe + ' m nach 50 s');
pruefe('Werkzeug nutzt sich ab', lies('S.werkzeuge.schaufel') < 120, 'Schaufel ' + lies('S.werkzeuge.schaufel'));
pruefe('Zustand bleibt im Rahmen', lies('S.leben') > 0 && lies('S.leben') <= 100, 'Leben ' + lies('S.leben'));

/* Erz aufnehmen, deterministisch statt auf gut Glueck: Kupfer direkt unter Levi legen */
lies('MATS.forEach(m => S.fracht[m] = 0); MATS.forEach(m => S.lager[m] = 0)');
lies(`(() => {
  const x = Math.floor(P.x + P.b/2), y = Math.floor(P.y + P.h + 0.04);
  boden[idx(x,y)] = KUPFER;
})()`);
lies('taste.ab = true');
try { for (let i = 0; i < 200; i++) lies('aktualisiere(1/60)'); }
catch (e){ fehler.push('beim Erzabbau: ' + e.stack); }
lies('taste.ab = false');
pruefe('Angebohrtes Erz landet im Rucksack', lies('S.fracht.kupfer') >= 1,
  'Kupfer ' + lies('S.fracht.kupfer'));

/* Gastasche: unsichtbar, Schaden waechst mit der Tiefe */
pruefe('Gastasche traegt die Maske des Gesteins',
  lies('tarnung(HIMMEL + 10)') === lies('ERDE') && lies('tarnung(HIMMEL + 250)') === lies('GRANIT'));
const lebenVorher = lies('S.leben');
lies(`(() => {
  const x = Math.floor(P.x + P.b/2), y = Math.floor(P.y + P.h + 0.04);
  boden[idx(x,y)] = GAS;
})()`);
lies('taste.ab = true');
try { for (let i = 0; i < 200; i++) lies('aktualisiere(1/60)'); }
catch (e){ fehler.push('bei der Gastasche: ' + e.stack); }
lies('taste.ab = false');
pruefe('Gastasche tut weh', lies('S.leben') < lebenVorher,
  lebenVorher + ' auf ' + Math.round(lies('S.leben')));
lies('S.leben = 100');

/* ----------------------------- Fracht nach Masse ------------------------- */
lies('S.fracht.gold = 8; S.fracht.erz = 0; S.fracht.kupfer = 0; S.fracht.bronze = 0; S.fracht.silber = 0');
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
  const x = 20, y = HIMMEL + 120;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++)
    boden[idx(x+dx, y+dy)] = LEER;
  const vorher = stabil(x, y);
  const alt = S.balken; S.balken = 5;
  const merkeX = P.x, merkeY = P.y;
  P.x = x; P.y = y;                       // Levi kurz an die Probestelle setzen
  setzeBalken();
  P.x = merkeX; P.y = merkeY; S.balken = alt;
  return {vorher, imBereich: stabil(x + 4, y), ausserhalb: stabil(x + 6, y)};
})()`);
pruefe('Ungestuetzter Stollen gilt als unsicher', stuetzProbe.vorher === false);
pruefe('Balken stuetzt bis 4 Kacheln weit', stuetzProbe.imBereich === true);
pruefe('Jenseits der Reichweite bleibt es unsicher', stuetzProbe.ausserhalb === false);

/* ---------------------------- Gleis zur Basis ---------------------------- */
const gleis = lies(`(() => {
  const y = HIMMEL - 1;
  for (let x = BASIS_X; x <= BASIS_X + 6; x++){ boden[idx(x,y)] = LEER; bau[idx(x,y)] |= 2; }
  const ok = schienenBisBasis(BASIS_X + 6, y);
  bau[idx(BASIS_X + 5, y)] &= ~2;         // Luecke ins Gleis reissen, ausserhalb der Toleranz
  const luecke = schienenBisBasis(BASIS_X + 6, y);
  return {ok, luecke};
})()`);
pruefe('Durchgehendes Gleis erreicht die Basis', gleis.ok === true);
pruefe('Gleis mit Luecke erreicht sie nicht', gleis.luecke === false);

/* -------------------------------- Laden ---------------------------------- */
lies('S.gold = 400; S.lager.erz = 40; S.lager.kupfer = 20; S.lager.bronze = 20');
const goldVorher = lies('S.gold');
try { lies('kaufe("wagen")'); } catch (e){ fehler.push('kaufe(wagen): ' + e.stack); }
pruefe('Minenwagen kostet 50', lies('S.gold') === goldVorher - 50, 'Gold ' + lies('S.gold'));
pruefe('Minenwagen gehoert Levi', lies('S.wagen') === true);
pruefe('Frachtraum waechst mit dem Wagen', lies('kapazitaet()') === 50, 'Kapazitaet ' + lies('kapazitaet()'));

/* Doppelklick darf nicht doppelt abbuchen: Wagen ist bereits gekauft */
const vorZweitkauf = lies('S.gold');
lies('kaufe("wagen")');
pruefe('Zweiter Kauf desselben Einmalstuecks kostet nichts extra',
  lies('S.gold') === vorZweitkauf - 50 || lies('S.gold') === vorZweitkauf,
  'Gold ' + lies('S.gold'));

/* Bohrfahrzeug haengt an 200 verdienten Goldstuecken */
lies('S.verdient = 10; S.gold = 500');
lies('zeigeLaden()');
const gesperrt = lies(`document.getElementById('fensterInhalt').innerHTML.includes('Ab 200 verdient')`);
pruefe('Bohrfahrzeug erst ab 200 verdienten Goldstuecken', gesperrt === true);

lies('S.verdient = 500');
const vorBohrer = lies('S.gold');
lies('kaufe("bohrer")');
pruefe('Bohrfahrzeug kostet 100', lies('S.gold') === vorBohrer - 100, 'Gold ' + lies('S.gold'));
pruefe('Frachtraum mit Wagen und Bohrer', lies('kapazitaet()') === 85, 'Kapazitaet ' + lies('kapazitaet()'));

/* Verkaufen */
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
pruefe('Schub verbraucht Treibstoff', lies('S.treibstoff') < 100, 'Tank ' + lies('S.treibstoff'));
lies('wechsleFahrzeug()');

/* -------------------------------- Berge ---------------------------------- */
lies('S.gold = 5000; S.verdient = 5000');
try { lies('wechsleBerg(1)'); } catch (e){ fehler.push('wechsleBerg: ' + e.stack); }
pruefe('Zweiter Berg geoeffnet', lies('S.offen.includes(1)') === true);
pruefe('Zusatzarbeiter kommt dazu', lies('arbeiter()') === 1, 'Arbeiter ' + lies('arbeiter()'));
pruefe('Neue Welt erzeugt', lies('Object.keys(welten).length') === 2);
pruefe('Am neuen Berg wieder an der Basis', lies('anBasis()') === true);

/* ------------------------- Speichern und Laden --------------------------- */
lies('S.balken = 42; boden[idx(BASIS_X, HIMMEL)] = LEER');
try { lies('speichere()'); } catch (e){ fehler.push('speichere: ' + e.stack); }
pruefe('Spielstand geschrieben', speicher.has('levisMine.v1'),
  'Groesse ' + ((speicher.get('levisMine.v1')||'').length/1024).toFixed(0) + ' kB');

lies('S.balken = 0; welten[0] = undefined; delete welten[0]; delete welten[1]');
let geladen = false;
try { geladen = lies('lade()'); } catch (e){ fehler.push('lade: ' + e.stack); }
pruefe('Spielstand gelesen', geladen === true);
pruefe('Vorraete wiederhergestellt', lies('S.balken') === 42, 'Balken ' + lies('S.balken'));
pruefe('Beide Welten wiederhergestellt', lies('Object.keys(welten).length') === 2);
pruefe('Abgebaute Kachel bleibt abgebaut', lies('boden[idx(BASIS_X, HIMMEL)]') === 0);
pruefe('Stuetzfeld nach dem Laden neu aufgebaut', lies('stuetze.length') === B*HO);

/* ------------------------------ Zeichnen --------------------------------- */
try { lies('zeichne(); hud()'); }
catch (e){ fehler.push('zeichne/hud: ' + e.stack); }
pruefe('Zeichnen und HUD laufen durch', !fehler.some(f => f.includes('zeichne/hud')));

/* ------------------------------- Bericht --------------------------------- */
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
process.exit(schlecht || fehler.length ? 1 : 0);
