'use strict';
/* ==========================================================================
   Levis Mine — 2D Seitenansicht, Vorbild Motherload
   Bohren, Ladung heimbringen, Ausruestung kaufen, tiefer graben.
   ========================================================================== */

/* ------------------------------- Grundmasse ------------------------------ */
const K        = 34;                 // Pixel pro Kachel
const BREITE   = 56;                 // Kachelspalten
const HIMMEL   = 5;                  // Luftzeilen ueber dem Gipfel
const GIPFEL   = 22;                 // Hoehe des Bergs ueber seinem Fuss
const TIEFEN   = 300;                // Gestein unter dem Fuss
const FUSS     = HIMMEL + GIPFEL;    // Zeile des Bergfusses, dort steht die Basis
const HOEHE    = FUSS + TIEFEN;
const METER    = 2;                  // Meter pro Kachel
const FRANKEN  = 25;                 // Franken pro Goldstueck
const ZIEL     = 5000;               // Goldstuecke fuer den Sieg
const BASIS_X  = 9;                  // Spalte des Hauses
const STUETZ_R = 4;                  // Reichweite eines Stuetzbalkens

/* ------------------------------ Gesteinsarten ---------------------------- */
const LEER=0, ERDE=1, STEIN=2, HARTSTEIN=3, GRANIT=4, GEROELL=5,
      ERZ=6, KUPFER=7, BRONZE=8, SILBER=9, GOLDERZ=10, GAS=11, FELS=12, SCHATZ=13;

const GESTEIN = {
  [ERDE]:      {name:'Erde',       haerte:1,  farbe:'#6d4a2c', korn:'#553718'},
  [GEROELL]:   {name:'Geröll',     haerte:1,  farbe:'#6b5741', korn:'#53422f'},
  [STEIN]:     {name:'Stein',      haerte:2,  farbe:'#5c5147', korn:'#463d35'},
  [HARTSTEIN]: {name:'Hartstein',  haerte:3,  farbe:'#494139', korn:'#352f29'},
  [GRANIT]:    {name:'Granit',     haerte:4,  farbe:'#38332e', korn:'#26221e'},
  [FELS]:      {name:'Urgestein',  haerte:99, farbe:'#211e1b', korn:'#141210'},
  [GAS]:       {name:'Gastasche',  haerte:1,  farbe:'#3f5c34', korn:'#7cb45e'},
  [ERZ]:       {name:'Eisenerz',   haerte:2,  farbe:'#5c5147', korn:'#463d35', erz:'erz'},
  [KUPFER]:    {name:'Kupfer',     haerte:2,  farbe:'#5c5147', korn:'#463d35', erz:'kupfer'},
  [BRONZE]:    {name:'Bronze',     haerte:3,  farbe:'#494139', korn:'#352f29', erz:'bronze'},
  [SILBER]:    {name:'Silber',     haerte:3,  farbe:'#494139', korn:'#352f29', erz:'silber'},
  [GOLDERZ]:   {name:'Golderz',    haerte:4,  farbe:'#38332e', korn:'#26221e', erz:'gold'},
  [SCHATZ]:    {name:'Fundstück',  haerte:3,  farbe:'#3a2f22', korn:'#2a2118', schatz:400},
};

/* Der Wert steigt steiler als die Masse. Dadurch wird der Frachtraum mit jedem
   Meter Tiefe wertvoller und der Aufstieg zum Abliefern lohnt sich, statt zu nerven. */
const MATERIAL = {
  erz:    {name:'Eisenerz', wert:2,  masse:1, farbe:'#a8977c'},
  kupfer: {name:'Kupfer',   wert:4,  masse:1, farbe:'#d9803a'},
  bronze: {name:'Bronze',   wert:5,  masse:1, farbe:'#c99b45'},
  silber: {name:'Silber',   wert:14, masse:2, farbe:'#e2eaf2'},
  gold:   {name:'Gold',     wert:40, masse:3, farbe:'#ffc63d'},
};
const MATS = ['erz','kupfer','bronze','silber','gold'];

/* Tiefenmarken: der Fortschritt nach unten ist zugleich der Fortschritt im Spiel */
const FUNK = [
  {tiefe:80,  gold:50,   text:'Achtzig Meter. Levi, hier unten liegt schon Bronze.'},
  {tiefe:200, gold:150,  text:'Zweihundert Meter. Ab hier wird Silber häufig.'},
  {tiefe:360, gold:400,  text:'Dreihundertsechzig Meter. Das Gestein ist jetzt Granit.'},
  {tiefe:580, gold:1200, text:'Fast am Grund. So tief war noch niemand im Dorf.'},
];

/* Dauerhafte Ausruestung, im Gegensatz zu Verbrauchsgut. Der Laden zeigt den
   Stand an, damit ein naeheres Ziel sichtbar ist als die 5000 Goldstuecke. */
const AUSBAU = ['schaufel','pickel','hammer','nagel','lampe1','lampe2','lampe3','wagen','bohrer'];

/* ------------------------------- Werkzeuge ------------------------------- */
const WERKZEUG = [
  {id:'schaufel', name:'Schaufel',                   kurz:'Schaufel',   haerte:1, tempo:1.55, halt:120},
  {id:'pickel',   name:'Pickel',                     kurz:'Pickel',     haerte:2, tempo:1.10, halt:95},
  {id:'hammer',   name:'Hammer & Meissel',           kurz:'Hammer',     haerte:3, tempo:0.90, halt:75},
  {id:'nagel',    name:'Grosser Hammer & Nagel',     kurz:'Gr. Hammer', haerte:4, tempo:0.78, halt:60},
];
const WZ = Object.fromEntries(WERKZEUG.map(w => [w.id, w]));

/* --------------------------------- Berge --------------------------------- */
/* reich = Zusatzchance, dass eine Ader eine Seltenheitsstufe hochrutscht.
   bonus = härteres Grundgestein. */
const BERGE = [
  {name:'Grünhügel',  kosten:0,   stufe:1, bonus:0, reich:0.00,
   text:'Weiche Erde, viel Eisenerz und Kupfer. Der Berg zum Üben.'},
  {name:'Kupferkamm', kosten:150, stufe:2, bonus:0, reich:0.18,
   text:'Ergiebiger. Bronze kommt hier schon weit oben vor.'},
  {name:'Silbergrat', kosten:400, stufe:3, bonus:1, reich:0.34,
   text:'Härteres Gestein, dafür reichlich Silber ab der Mitte.'},
  {name:'Goldspitze', kosten:900, stufe:4, bonus:2, reich:0.52,
   text:'Der härteste Berg. Unten liegt das Gold in dicken Adern.'},
];

/* -------------------------------- Spielzeit ------------------------------ */
/* Zwanzig Minuten je Spieler und Tag. Kein Elternbereich im Spiel: was Levi
   sehen kann, kann Levi auch bedienen. Zurueckgesetzt wird von aussen, ueber
   die Entwicklerkonsole, siehe zeitZuruecksetzen() und zeitLimit() am Ende
   dieser Datei. */
const ZEIT = 'levisMine.zeit';           // das Limit in Minuten
const ZEIT_STAND = 'levisMine.zeitstand'; // die heute verbrauchte Zeit
const STANDARD_LIMIT = 20;               // Minuten je Geraet und Tag

/* Die verbrauchte Zeit haengt bewusst NICHT am Spielstand. Lag sie dort, gab
   ein neuer Name auf dem Startbildschirm frische zwanzig Minuten, und das Feld
   dafuer steht direkt daneben. Jetzt zaehlt sie geraeteweit, ueber alle Spieler
   hinweg. */
let zeitStand = {tag:'', sekunden:0, gewarnt:0};
let zeitSchreibUhr = 0;

function zeitLaden(){
  try {
    const d = JSON.parse(localStorage.getItem(ZEIT_STAND));
    if (d && typeof d.sekunden === 'number') zeitStand = d;
  } catch(e){}
  if (zeitStand.tag !== heute()) zeitStand = {tag: heute(), sekunden: 0, gewarnt: 0};
}
function zeitSichern(){
  try { localStorage.setItem(ZEIT_STAND, JSON.stringify(zeitStand)); } catch(e){}
}

const limitMinuten = () => {
  try {
    const n = parseInt(localStorage.getItem(ZEIT), 10);
    return Number.isFinite(n) ? n : STANDARD_LIMIT;
  } catch(e){ return STANDARD_LIMIT; }
};
const heute = () => new Date().toISOString().slice(0, 10);

/* Verbrauchte Zeit je Spieler und Tag. Sie zaehlt nur, waehrend wirklich
   gespielt wird: bei offenem Fenster laeuft die Schleife ohnehin nicht. */
function zeitTicken(dt){
  if (zeitStand.tag !== heute()) zeitStand = {tag: heute(), sekunden: 0, gewarnt: 0};
  zeitStand.sekunden += dt;
  // Nicht in jedem Bild schreiben, das waere sechzigmal je Sekunde
  zeitSchreibUhr += dt;
  if (zeitSchreibUhr > 5){ zeitSchreibUhr = 0; zeitSichern(); }
  const grenze = limitMinuten() * 60;
  if (grenze <= 0) return;
  const rest = grenze - zeitStand.sekunden;
  for (const marke of [300, 60]){
    if (rest <= marke && (zeitStand.gewarnt || 0) < marke){
      zeitStand.gewarnt = marke;
      melde(marke === 300 ? 'Noch fünf Minuten für heute' : 'Noch eine Minute für heute', 'schlecht');
      klang('kaputt');
    }
  }
  if (rest <= 0 && schleier.hidden){ zeitSichern(); zeigeZeitEnde(); }
}

function zeigeZeitEnde(){
  speichere();
  fenster('Für heute ist Schluss', `
    <p class="hinweis">Du hast heute ${limitMinuten()} Minuten gespielt.</p>
    <p>Dein Berg bleibt genau so, wie er jetzt ist, mit ${zahl(S.gold)} Goldstücken
    und ${S.tiefstes} Metern als tiefstem Punkt. Morgen geht es weiter.</p>`);
}

/* ---------------------------- Spielerauswahl ----------------------------- */

function zeigeAnmeldung(){
  const liste = spielerListe();
  const zuletzt = localStorage.getItem(SPIELER_ZULETZT) || '';
  const karte = n => {
    const roh = localStorage.getItem(schluesselFuer(n));
    let stand = 'neuer Berg';
    try {
      const d = JSON.parse(roh);
      if (d && d.S) stand = zahl(d.S.gold) + ' Goldstücke, tiefster Punkt ' + d.S.tiefstes + ' m';
    } catch(e){}
    return `<div class="ware ${n === zuletzt ? 'bergKarte hier' : ''}">
      <div class="kopf2"><b>${n}</b>${n === zuletzt ? '<span style="color:var(--gold)">zuletzt</span>' : ''}</div>
      <p>${stand}</p>
      <button class="kauf" data-tat="anmelden:${n}">Als ${n} spielen</button>
    </div>`;
  };
  fenster('Wer gräbt?', `
    <p class="hinweis">Jeder Name hat seinen eigenen Berg und seinen eigenen Spielstand.
    Kein Passwort: das Spiel läuft ohne Server, da liesse sich ohnehin keines prüfen.</p>
    ${liste.length ? '<div class="gitter">' + liste.map(karte).join('') + '</div>' : ''}
    <h3 class="abschnitt">Neuer Spieler</h3>
    <div class="gitter">
      <div class="ware">
        <div class="kopf2"><b>Namen eingeben</b></div>
        <input id="neuerName" maxlength="14" placeholder="zum Beispiel Levi"
               style="width:100%;padding:8px;background:var(--platte-tief);color:var(--schrift);
                      border:2px solid var(--kante);font:inherit;font-size:15px">
        <button class="kauf" data-tat="neuerSpieler">Anfangen</button>
      </div>
    </div>`);
  const feld = document.getElementById('neuerName');
  if (feld) setTimeout(() => feld.focus(), 30);
}

function anmelden(name){
  name = (name || '').trim().slice(0, 14);
  if (!name) return false;
  const liste = spielerListe();
  if (!liste.includes(name)){
    if (liste.length === 0) standUebernehmen(name);
    liste.push(name);
    spielerSchreiben(liste);
  }
  try { localStorage.setItem(SPIELER_ZULETZT, name); } catch(e){}
  // Neu laden statt den Zustand von Hand zurueckzusetzen: beim Entladen sichert
  // beforeunload noch den Stand des bisherigen Spielers, danach faengt die Seite
  // sauber mit dem gewaehlten an. Ein halb zurueckgesetzter Zustand kann so gar
  // nicht erst entstehen.
  location.reload();
  return true;
}

/* -------------------------------- Optionen ------------------------------- */

/* Mit Escape erreichbar. Solange ein Fenster offen ist, laeuft die Spielschleife
   nicht weiter, das Fenster ist damit zugleich die Pause. */
function zeigeOptionen(nachfrage){
  const knopf = (tat, text, art = '') =>
    `<button class="kauf ${art}" data-tat="${tat}">${text}</button>`;

  const gefahr = nachfrage
    ? `<div class="gefahr">
         <p><b>Wirklich neu anfangen?</b> Dein Spielstand wird gelöscht:
         ${zahl(S.gold)} Goldstücke, ${S.offen.length} ${S.offen.length === 1 ? 'Berg' : 'Berge'},
         tiefster Punkt ${S.tiefstes} Meter. Das lässt sich nicht rückgängig machen.</p>
         <div class="gitter" style="margin-top:10px">
           ${knopf('neuJa', 'Ja, alles löschen und neu anfangen')}
           ${knopf('zurueck', 'Nein, weiterspielen', 'zweit')}
         </div>
       </div>`
    : `<h3 class="abschnitt">Von vorn</h3>
       <div class="gitter">
         <div class="ware">
           <div class="kopf2"><b>Neues Spiel</b></div>
           <p>Löscht den Spielstand und erzeugt einen neuen Berg.</p>
           ${knopf('neu', 'Neues Spiel')}
         </div>
       </div>`;

  fenster('Pause', `
    <p class="hinweis">${zahl(S.gold)} Goldstücke, Stufe ${stufe()},
    tiefster Punkt ${S.tiefstes} Meter. Mit <kbd>Esc</kbd> geht es zurück ins Spiel.</p>
    <h3 class="abschnitt">Einstellungen</h3>
    <div class="gitter">
      <div class="ware">
        <div class="kopf2"><b>Ton</b><span style="color:var(--matt)">${S.ton ? 'an' : 'aus'}</span></div>
        <p>Hacken, Erzfunde, Einstürze und Münzen.</p>
        ${knopf('ton', S.ton ? 'Ton ausschalten' : 'Ton einschalten', 'zweit')}
      </div>
      <div class="ware">
        <div class="kopf2"><b>Weiter</b></div>
        <p>Zurück in den Berg.</p>
        ${knopf('zu', 'Weiterspielen', 'zweit')}
      </div>
    </div>
    <h3 class="abschnitt">Gehe zu</h3>
    <div class="gitter">
      <div class="ware"><div class="kopf2"><b>Laden</b></div><p>Ausrüstung kaufen und Erz verkaufen.</p>${knopf('laden', 'Laden öffnen', 'zweit')}</div>
      <div class="ware"><div class="kopf2"><b>Berge</b></div><p>Berg wechseln oder einen neuen öffnen.</p>${knopf('berge', 'Berge zeigen', 'zweit')}</div>
      <div class="ware"><div class="kopf2"><b>Hilfe</b></div><p>Steuerung und Spielregeln.</p>${knopf('hilfe', 'Hilfe zeigen', 'zweit')}</div>
      <div class="ware"><div class="kopf2"><b>Spieler</b><span style="color:var(--matt)">${spieler || 'ohne Namen'}</span></div>
        <p>Jeder Name hat einen eigenen Berg.</p>${knopf('wechseln', 'Spieler wechseln', 'zweit')}</div>
    </div>
    ${gefahr}`);
}

function tueEs(tat){
  if (tat === 'ton'){
    S.ton = !S.ton;
    document.getElementById('btnTon').textContent = S.ton ? '🔊' : '🔇';
    speichere();
    zeigeOptionen();
  }
  else if (tat === 'zu' || tat === 'zurueck') fensterZu();
  else if (tat === 'laden') zeigeLaden();
  else if (tat === 'berge') zeigeBerge();
  else if (tat === 'hilfe') zeigeHilfe();
  else if (tat === 'neu') zeigeOptionen(true);      // erst nachfragen
  else if (tat === 'neuJa') neuAnfangen();
  else if (tat === 'wechseln') zeigeAnmeldung();
  else if (tat.startsWith('anmelden:')) anmelden(tat.slice(9));
  else if (tat === 'neuerSpieler'){
    const feld = document.getElementById('neuerName');
    const name = feld ? feld.value : '';
    if (!name.trim()) melde('Gib zuerst einen Namen ein', 'schlecht', 'name');
    else anmelden(name);
  }
  else if (tat === 'allesVerkaufen'){
    for (const m of MATS) if (S.lager[m] > 0) verkaufe(m);
    zeigeLaden();
  }
}

/* --------------------------------- Laden --------------------------------- */
const LADEN = [
  {id:'schaufel', art:'werkzeug', name:'Schaufel', stufe:1,
   text:'Bricht Erde und Geröll, sehr schnell.', preis:{gold:6}},
  {id:'pickel', art:'werkzeug', name:'Pickel', stufe:1,
   text:'Bricht Stein, Eisenerz und Kupfer.', preis:{gold:14, erz:3}},
  {id:'hammer', art:'werkzeug', name:'Hammer & Meissel', stufe:2,
   text:'Bricht Hartstein, Bronze und Silber.', preis:{gold:45, erz:8, kupfer:5}},
  {id:'nagel', art:'werkzeug', name:'Grosser Hammer & Nagel', stufe:3,
   text:'Bricht Granit und Golderz, das tiefste Gestein.', preis:{gold:110, erz:14, bronze:6}},
  {id:'lampe', art:'lampe', stufe:1, name:'Lampe', text:''},
  {id:'dynamit', art:'stapel', anzahl:1, name:'Dynamit', stufe:1,
   text:'Sprengt alles im Umkreis. Einmal gezündet, dann weg.', preis:{gold:8}},
  {id:'balken', art:'stapel', anzahl:20, name:'Leitern und Stützbalken ×20', stufe:1,
   text:'Deine Leiter nach oben: an gesetzten Balken kletterst du mit ▲ und ▼. '
      + 'Zugleich stützen sie den Stollen gegen Einsturz. Setzen mit der Leertaste.',
   preis:{gold:12, erz:4}},
  {id:'seilwinde', art:'stapel', anzahl:2, name:'Seilwinde ×2', stufe:1,
   text:'Zieht dich samt Ladung sofort zur Basis hoch, wenn du unten feststeckst.', preis:{gold:10}},
  {id:'schienen', art:'stapel', anzahl:20, name:'Schienen ×20', stufe:1,
   text:'Gleis vom Stollen bis zur Basis.', preis:{gold:50}},
  {id:'wagen', art:'einmal', name:'Minenwagen', stufe:1,
   text:'Schickt die Ladung über die Schienen heim. Fracht +25.', preis:{gold:50}},
  {id:'bohrer', art:'einmal', name:'Bohrfahrzeug', stufe:1, verdient:200,
   text:'Bohrt jedes Gestein, fliegt mit Schub, Fracht +35.', preis:{gold:100}},
];

const STUFEN = [0, 150, 400, 900, 1800, 3200, 5000];

/* Die Lampe bestimmt, wie weit Levi im Berg sieht. Jede Stufe kostet mehr
   und leuchtet weiter, gemessen in Kacheln. */
const LAMPEN = [
  {name:'Helmlampe',          weite:5.0},
  {name:'Karbidlampe',        weite:7.4,  preis:{gold:28}},
  {name:'Starke Grubenlampe', weite:10.2, preis:{gold:90, kupfer:8}},
  {name:'Scheinwerfer',       weite:13.8, preis:{gold:230, silber:10}},
];

/* --------------------------------- Physik -------------------------------- */
/* Alles hat Masse. Kein Wert wird mehr gesetzt, jeder wird angefahren.
   Einheiten: Kacheln je Sekunde, Beschleunigungen Kacheln je Sekunde im
   Quadrat. Eine Kachel ist K = 34 Pixel.

   Sprunghöhe = SPRUNG² / (2*G) = 12.4² / 76 = 2.02 Kacheln.
   Damit bleibt die zugesicherte Treppenstufe von 1 Kachel klar erreichbar. */
const G          = 38;    // Schwerkraft, etwas herber als vorher
const MAX_FALL   = 26;    // Endgeschwindigkeit im freien Fall
const LAUF       = 6.4;   // Höchsttempo zu Fuss, unverändert
const ZUG        = 44;    // Anfahren am Boden, volles Tempo nach 0.15 s
const BREMS      = 40;    // Bremsen am Boden, Nachlauf rund eine halbe Kachel
const WENDE      = 1.9;   // Beim Richtungswechsel greift der Schuh stärker
const LUFT       = 0.42;  // Anteil der Bodenbeschleunigung, der in der Luft wirkt
const LUFT_BREMS = 3.2;   // In der Luft bremst fast nichts, der Schwung trägt
const SPRUNG     = 12.4;  // Absprunggeschwindigkeit
const KLETTERN   = 5.2;   // Tempo an Balken und Schienen
const KLETTER_ZUG= 40;    // auch die Leiter wird kurz angefahren
const SCHUB      = 54;    // Bohrfahrzeug: Schub nach oben, knapp über G
const SCHUB_SEIT = 20;    // Seitendüsen in der Luft, absichtlich träge
const KETTEN_GRIFF = 1.6;   // Am Boden greifen die Ketten besser als die Düsen
const MAX_SCHUB  = 13;    // Steiggeschwindigkeit des Fahrzeugs
const MAX_FAHRT  = 8.5;   // Seitentempo des Fahrzeugs
const FAHR_BREMS = 26;    // Fahrzeug bremst am Boden
const FAHR_ROLL  = 11;    // in der Luft rollt es lange aus
const LAST       = 0.28;  // So viel Beschleunigung nimmt eine volle Ladung weg
const STURZ_AB   = 18;    // ab dieser Fallgeschwindigkeit tut es weh
const AUFSETZ    = 13.5;  // ab hier setzt es hart auf, noch ohne Schaden

/* ========================================================================== */
/*                                 Zustand                                    */
/* ========================================================================== */

const S = {
  gold:0, verdient:0,
  bergNr:0, offen:[0],
  fracht:{erz:0, kupfer:0, bronze:0, silber:0, gold:0},
  lager: {erz:0, kupfer:0, bronze:0, silber:0, gold:0},
  werkzeuge:{schaufel:120, pickel:95},
  dynamit:0, balken:20, schienen:0, seilwinde:2,
  wagen:false, bohrer:false, imFahrzeug:false, lampe:0,
  gekauft:['schaufel','pickel'],
  treibstoff:100, leben:100,
  tiefstes:0, funk:[], gewonnen:false, ton:true,
};

const P = {
  x:BASIS_X, y:FUSS-1, vx:0, vy:0, b:0.70, h:0.92,
  amBoden:false, klettert:false, blick:1,
  zx:-1, zy:-1, fortschritt:0, grabt:false, schwung:0,
};

let boden, bau, stuetze;          // Kachelfelder des aktuellen Bergs
let ober = new Int16Array(BREITE); // Urspruengliches Oberflaechenprofil
const welten = {};                // bergNr -> {boden, bau, stuetze}

let W = 0, H = 0;
const kamera = {x:0, y:0};
let beben = 0;
const funken = [];
const broeckelt = [];
let arbeiterUhr = 0, einsturzUhr = 0, speicherUhr = 0, hudUhr = 0;

const taste = {};
const leinwand = document.getElementById('leinwand');
const ctx = leinwand.getContext('2d');

/* Ein Fehler soll sichtbar sein statt stumm. Ohne das bleibt bei einem
   Absturz nur ein leeres Fenster stehen und niemand weiss, woran es lag. */
function zeigeAbsturz(text){
  let kasten = document.getElementById('absturz');
  if (!kasten){
    kasten = document.createElement('div');
    kasten.id = 'absturz';
    kasten.addEventListener('click', () => kasten.remove());
    document.body.appendChild(kasten);
  }
  kasten.textContent = text + '\n(antippen zum Schliessen)';
}
addEventListener('error', e => {
  const wo = (e.filename || '').split('/').pop();
  zeigeAbsturz('Fehler: ' + (e.message || e.error) + (wo ? '  [' + wo + ':' + e.lineno + ']' : ''));
});
addEventListener('unhandledrejection', e => zeigeAbsturz('Fehler: ' + e.reason));

/* ========================================================================== */
/*                              Weltgenerierung                               */
/* ========================================================================== */

/* Das Gelaende ist ein Berg, kein flacher Boden. Die erhobene Kosinusglocke
   laeuft an beiden Enden waagrecht aus, dadurch bleibt die Flanke mit einem
   Sprung begehbar, statt in Zweikachelstufen abzubrechen. */
function profilFeld(nr){
  const ob = new Int16Array(BREITE);
  const phase = nr * 1.7;
  for (let x = 0; x < BREITE; x++){
    const m = (x - (BREITE-1)/2) / ((BREITE-1)/2);              // -1 … 1
    const glocke = 0.5 * (1 + Math.cos(m * Math.PI));
    const wellen = 0.055*Math.sin(x*0.55 + phase) + 0.035*Math.sin(x*1.7 + phase*2 + 1.1);
    const h = Math.max(0, Math.min(1, glocke + wellen));
    ob[x] = Math.round(FUSS - h*GIPFEL);
  }
  // Waagrechte Terrasse auf Fusshoehe, damit das Haus steht und die Tiefe bei 0 m beginnt
  for (let x = BASIS_X-3; x <= BASIS_X+3; x++){
    if (x >= 0 && x < BREITE) ob[x] = FUSS;
  }
  // Jede Stufe auf eine Kachel begrenzen, sonst reisst die Terrasse eine Klippe
  // in die Flanke und Levi kaeme nicht mehr zum Haus zurueck.
  for (let d = 0; d < 4; d++){
    for (let x = 1; x < BREITE; x++)     if (ob[x] < ob[x-1] - 1) ob[x] = ob[x-1] - 1;
    for (let x = BREITE-2; x >= 0; x--)  if (ob[x] < ob[x+1] - 1) ob[x] = ob[x+1] - 1;
  }
  return ob;
}

const basisY = () => ober[BASIS_X];

/* Weiches Rauschen auf einem groberen Gitter, zwischen den Stuetzstellen
   geglaettet. Damit waechst Gestein in Nestern statt Kachel fuer Kachel
   ausgewuerfelt zu werden, was als Punktraster ins Auge fiele. */
function wertRausch(x, y, skala, kern){
  const gx = x/skala, gy = y/skala;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const u = fx*fx*(3 - 2*fx), v = fy*fy*(3 - 2*fy);
  const e = (a, b) => hash(a*7919 + kern*131, b*104729 + kern*37);
  return (e(x0,y0)*(1-u) + e(x0+1,y0)*u) * (1-v)
       + (e(x0,y0+1)*(1-u) + e(x0+1,y0+1)*u) * v;
}

/* Mittlere Haerte nach Tiefe, das Rauschen verschiebt sie nach oben und unten */
function mittlereHaerte(t){
  if (t < 10)  return 1.05;
  if (t < 32)  return 1.45;
  if (t < 70)  return 2.10;
  if (t < 120) return 2.75;
  if (t < 170) return 3.25;
  return 3.60;
}

function grundstein(x, y, t, bonus){
  // Grobe Nester. Zu feines Rauschen laesst Arten kachelweise wechseln, und
  // dann liest sich das Feld wieder als Schachbrett.
  const n = 0.72*wertRausch(x, y, 9.0, 1) + 0.28*wertRausch(x, y, 3.4, 7);
  let s = Math.round(mittlereHaerte(t) + bonus*0.45 + (n - 0.5) * 1.9);
  // Bis 32 Kacheln nur Erde und Stein. Sonst sperrt eine einzelne
  // Hartstein-Kachel den senkrechten Schacht, bevor der Hammer bezahlbar ist.
  if (t < 32) s = Math.min(2, s);
  s = Math.max(1, Math.min(4, s));
  return [0, ERDE, STEIN, HARTSTEIN, GRANIT][s];
}

function grabeHoehlen(bo){
  for (let n = 0; n < 30; n++){
    let x = 3 + Math.floor(Math.random()*(BREITE-6));
    let y = FUSS + 14 + Math.floor(Math.random()*(TIEFEN-22));
    const laenge = 8 + Math.floor(Math.random()*24);
    for (let g = 0; g < laenge; g++){
      const rx = 1 + Math.floor(Math.random()*3), ry = 1 + Math.floor(Math.random()*2);
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++){
        const px = x+dx, py = y+dy;
        if (px < 1 || px > BREITE-2 || py < FUSS+10 || py > HOEHE-5) continue;
        bo[py*BREITE+px] = LEER;
      }
      x = Math.max(2, Math.min(BREITE-3, x + Math.round((Math.random()-0.5)*5)));
      y = Math.max(FUSS+12, Math.min(HOEHE-6, y + Math.round((Math.random()-0.5)*4)));
    }
  }
}

const ERZ_STUFEN = [ERZ, KUPFER, BRONZE, SILBER, GOLDERZ];
const ERZ_RATE   = 62;   // Tiefenzeilen, die eine zusätzliche Seltenheitsstufe freischalten

/* Die Tiefe weitet nur die Spannweite der Auslosung und deckelt oben.
   Billiges Erz verschwindet dadurch nie ganz, teures wird nach unten wahrscheinlicher. */
function erzStufe(tiefe, reich){
  let s = Math.floor(Math.random() * (tiefe/ERZ_RATE + 2));
  if (Math.random() < 0.20) s++;
  if (Math.random() < reich) s++;
  return Math.min(ERZ_STUFEN.length - 1, s);
}

function streueAdern(bo, berg){
  const adern = Math.round((TIEFEN + GIPFEL) * BREITE * 0.026);
  for (let a = 0; a < adern; a++){
    let x = 1 + Math.floor(Math.random()*(BREITE-2));
    let y = HIMMEL + 2 + Math.floor(Math.random()*(GIPFEL + TIEFEN - 3));
    const kachel = ERZ_STUFEN[erzStufe(y - FUSS, berg.reich)];
    const gr = 3 + Math.floor(Math.random()*6);
    for (let g = 0; g < gr; g++){
      const i = y*BREITE + x;
      if (bo[i] !== FELS && bo[i] !== LEER) bo[i] = kachel;
      if (Math.random() < 0.7) x += Math.random()<0.5 ? -1 : 1;
      if (Math.random() < 0.7) y += Math.random()<0.5 ? -1 : 1;
      x = Math.max(1, Math.min(BREITE-2, x));
      y = Math.max(HIMMEL+1, Math.min(HOEHE-3, y));
    }
  }
}

function streueGas(bo){
  for (let n = 0; n < 64; n++){
    const x = 1 + Math.floor(Math.random()*(BREITE-2));
    const y = FUSS + 40 + Math.floor(Math.random()*(TIEFEN-46));
    const i = y*BREITE + x;
    if (bo[i] !== LEER && bo[i] !== FELS) bo[i] = GAS;
  }
}

/* Tief unten liegen einzelne Fundstuecke, wie die Artefakte in Motherload */
function streueFundstuecke(bo){
  let gesetzt = 0;
  for (let n = 0; n < 400 && gesetzt < 6; n++){
    const x = 2 + Math.floor(Math.random()*(BREITE-4));
    const y = FUSS + 140 + Math.floor(Math.random()*(TIEFEN-146));
    const i = y*BREITE + x;
    if (bo[i] === LEER || bo[i] === FELS) continue;
    bo[i] = SCHATZ;
    gesetzt++;
  }
}

function neueWelt(nr){
  const berg = BERGE[nr];
  const ob = profilFeld(nr);
  const bo = new Uint8Array(BREITE*HOEHE);
  for (let y = 0; y < HOEHE; y++){
    for (let x = 0; x < BREITE; x++){
      const i = y*BREITE + x;
      if (y < ob[x]) continue;                     // Luft ueber der Bergflanke
      bo[i] = (x === 0 || x === BREITE-1 || y >= HOEHE-2)
        ? FELS : grundstein(x, y, y - FUSS, berg.bonus);
    }
  }
  grabeHoehlen(bo);
  streueAdern(bo, berg);
  streueGas(bo);
  streueFundstuecke(bo);
  // Vor dem Haus ein sauberes Stueck Erde, damit der Start ruhig ist
  for (let x = BASIS_X-3; x <= BASIS_X+3; x++){
    if (x < 1 || x > BREITE-2) continue;
    for (let y = ob[x]; y < ob[x]+2; y++) bo[y*BREITE+x] = ERDE;
  }
  return {boden:bo, bau:new Uint8Array(BREITE*HOEHE), stuetze:new Uint16Array(BREITE*HOEHE)};
}

function ladeWelt(nr){
  if (!welten[nr]) welten[nr] = neueWelt(nr);
  const w = welten[nr];
  boden = w.boden; bau = w.bau; stuetze = w.stuetze;
  ober = profilFeld(nr);          // rein rechnerisch, muss nicht gespeichert werden
  S.bergNr = nr;
  P.x = BASIS_X; P.y = basisY() - P.h; P.vx = 0; P.vy = 0;
  P.zx = P.zy = -1; P.fortschritt = 0;
  broeckelt.length = 0;
  const z = kameraZiel();
  kamera.x = z.x; kamera.y = z.y;   // geklemmt, sonst zeigt das erste Bild neben die Welt
}

/* Wohin die Kamera gehoert, innerhalb der Weltgrenzen */
function kameraZiel(){
  return {
    x: Math.max(0, Math.min(BREITE*K - W, (P.x + P.b/2)*K - W/2)),
    y: Math.max(0, Math.min(HOEHE*K - H, (P.y + P.h/2)*K - H*0.52)),
  };
}

/* ========================================================================== */
/*                             Kachel-Hilfsmittel                             */
/* ========================================================================== */

const idx = (x,y) => y*BREITE + x;

function art(x, y){
  if (x < 1 || x > BREITE-2) return FELS;
  if (y < 0) return LEER;
  if (y >= HOEHE) return FELS;
  return boden[idx(x,y)];
}
const fest = (x,y) => art(x,y) !== LEER;

function hash(x, y){
  let h = x*374761393 + y*668265263;
  h = (h ^ (h>>13)) * 1274126177;
  return ((h ^ (h>>16)) >>> 0) / 4294967296;
}

function stabil(x, y){
  if (x < 0 || x >= BREITE) return true;
  if (y < ober[x] + 4) return true;        // dicht unter der Bergflanke haelt es von selbst
  return stuetze[idx(x,y)] > 0;
}

function balkenBuchen(x, y, richtung){
  for (let dy = -STUETZ_R; dy <= STUETZ_R; dy++){
    for (let dx = -STUETZ_R; dx <= STUETZ_R; dx++){
      const px = x+dx, py = y+dy;
      if (px < 0 || px >= BREITE || py < 0 || py >= HOEHE) continue;
      stuetze[idx(px,py)] += richtung;
    }
  }
}

function bauLoeschen(x, y){
  const i = idx(x,y);
  if (bau[i] & 1) balkenBuchen(x, y, -1);
  bau[i] = 0;
}

/* ========================================================================== */
/*                                  Fracht                                    */
/* ========================================================================== */

const lagerWert = () => MATS.reduce((s,m) => s + S.lager[m]*MATERIAL[m].wert, 0);
const kapazitaet = () => 25 + (S.wagen ? 25 : 0) + (S.bohrer ? 35 : 0);
const frachtMasse = () => MATS.reduce((s,m) => s + S.fracht[m]*MATERIAL[m].masse, 0);
const frachtStueck = () => MATS.reduce((s,m) => s + S.fracht[m], 0);
const stufe = () => { let s = 1; for (let i = 1; i < STUFEN.length; i++) if (S.verdient >= STUFEN[i]) s = i+1; return s; };
const arbeiter = () => S.offen.length - 1;

function nimmMaterial(m, n){
  const masse = MATERIAL[m].masse;
  const platz = kapazitaet() - frachtMasse();
  if (platz < masse){
    melde(MATERIAL[m].name + ' passt nicht mehr rein, bring die Ladung heim', 'schlecht', 'voll');
    return 0;
  }
  const echt = Math.min(Math.floor(platz/masse), n);
  S.fracht[m] += echt;
  return echt;
}

function abliefern(){
  if (frachtStueck() <= 0) return;
  let goldstuecke = 0;
  const teile = [];
  for (const m of MATS){
    const n = S.fracht[m];
    if (!n) continue;
    if (m === 'gold'){ goldstuecke += n * MATERIAL.gold.wert; }
    else S.lager[m] += n;
    teile.push(n + '× ' + MATERIAL[m].name);
    S.fracht[m] = 0;
  }
  if (goldstuecke){ S.gold += goldstuecke; S.verdient += goldstuecke; }
  klang('muenze');
  melde('Abgeliefert: ' + teile.join(', ') + (goldstuecke ? '  →  +' + goldstuecke + ' Goldstücke' : ''), 'gut');
  // Erz wird nicht von selbst zu Gold. Wer das nicht weiss, steht mit vollem
  // Lager und null Goldstuecken da und versteht nicht, warum nichts geht.
  const wert = lagerWert();
  if (wert > 0) melde('Im Lager liegt Erz für ' + wert + ' Goldstücke. Im Laden mit K verkaufen', 'gold', 'verkaufen');
  pruefeSieg();
}

function pruefeSieg(){
  if (S.gewonnen || S.verdient < ZIEL) return;
  S.gewonnen = true;
  fenster('Levis Mine läuft', `
    <p class="hinweis">${ZIEL} Goldstücke verdient, das sind CHF ${zahl(ZIEL*FRANKEN)}.</p>
    <p>Die Mine trägt sich selbst. Die Arbeiter schaffen weiter, die Stollen sind gestützt,
    und der Berg gibt immer noch etwas her. Grab weiter, so tief du magst.</p>`);
}

/* ========================================================================== */
/*                                  Eingabe                                   */
/* ========================================================================== */

const KARTE = {
  ArrowUp:'auf', ArrowDown:'ab', ArrowLeft:'links', ArrowRight:'rechts',
  w:'auf', s:'ab', a:'links', d:'rechts',
};

addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = KARTE[e.key] || KARTE[e.key.toLowerCase()];
  if (k){ taste[k] = true; e.preventDefault(); return; }
  const z = e.key.toLowerCase();
  if (z === ' ' || e.key === ' '){ setzeBalken(); e.preventDefault(); return; }
  if (z === 'r') legeSchiene();
  else if (z === 'f') zuendeDynamit();
  else if (z === 'v') wechsleFahrzeug();
  else if (z === 'e') sendeWagen();
  else if (z === 'l') nutzeSeilwinde();
  else if (z === 'k') zeigeLaden();
  else if (z === 'm') zeigeBerge();
  else if (z === 'h') zeigeHilfe();
  else if (e.key === 'Escape') schleier.hidden ? zeigeOptionen() : fensterZu();
});

addEventListener('keyup', e => {
  const k = KARTE[e.key] || KARTE[e.key.toLowerCase()];
  if (k) taste[k] = false;
});

addEventListener('blur', () => { for (const k in taste) taste[k] = false; });

/* Touch-Steuerung, nur auf Geräten, die wirklich mit dem Finger bedient werden.
   'ontouchstart' allein blendet sie auch auf Laptops mit Touchscreen ein. */
function nurFinger(){
  return navigator.maxTouchPoints > 0
      && matchMedia('(pointer: coarse)').matches
      && !matchMedia('(pointer: fine)').matches;
}
if (nurFinger()){
  const feld = document.getElementById('touch');
  feld.hidden = false;
  for (const knopf of feld.querySelectorAll('button')){
    const t = knopf.dataset.taste;
    const k = KARTE[t];
    const halten = ev => {
      ev.preventDefault();
      if (k) taste[k] = true;
      else if (t === ' ') setzeBalken();
      else if (t === 'r') legeSchiene();
      else if (t === 'f') zuendeDynamit();
      else if (t === 'v') wechsleFahrzeug();
    };
    const los = ev => { ev.preventDefault(); if (k) taste[k] = false; };
    knopf.addEventListener('pointerdown', halten);
    knopf.addEventListener('pointerup', los);
    knopf.addEventListener('pointercancel', los);
    knopf.addEventListener('pointerleave', los);
  }
}

/* ========================================================================== */
/*                             Bewegung und Physik                            */
/* ========================================================================== */

function kachelBereich(){
  return {
    x0: Math.floor(P.x), x1: Math.floor(P.x + P.b - 1e-6),
    y0: Math.floor(P.y), y1: Math.floor(P.y + P.h - 1e-6),
  };
}

function loeseX(){
  const r = kachelBereich();
  for (let y = r.y0; y <= r.y1; y++){
    if (P.vx > 0 && fest(r.x1, y)){ P.x = r.x1 - P.b; P.vx = 0; return; }
    if (P.vx < 0 && fest(r.x0, y)){ P.x = r.x0 + 1;   P.vx = 0; return; }
  }
}

function loeseY(){
  const r = kachelBereich();
  for (let x = r.x0; x <= r.x1; x++){
    if (P.vy > 0 && fest(x, r.y1)){
      if (P.vy > STURZ_AB) sturzSchaden(P.vy);
      P.y = r.y1 - P.h; P.vy = 0; P.amBoden = true; return;
    }
    if (P.vy < 0 && fest(x, r.y0)){ P.y = r.y0 + 1; P.vy = 0; return; }
  }
}

function sturzSchaden(v){
  const schaden = Math.round((v - STURZ_AB) * 3.4);
  if (schaden <= 0) return;
  verletze(schaden, 'Harte Landung');
  beben = Math.max(beben, Math.min(9, schaden*0.4));
  staub(P.x + P.b/2, P.y + P.h, 10, '#8b7a63');
  klang('rums');
}

function verletze(schaden, grund){
  S.leben = Math.max(0, S.leben - schaden);
  if (S.leben > 0){ melde(grund + ', −' + schaden, 'schlecht', 'aua'); return; }
  // Ohnmacht: halbe Ladung bleibt im Berg, Levi wacht im Haus auf
  let verloren = 0;
  for (const m of MATS){ const w = Math.floor(S.fracht[m]/2); S.fracht[m] -= w; verloren += w; }
  S.leben = 100;
  S.imFahrzeug = false;
  P.x = BASIS_X; P.y = basisY() - P.h; P.vx = 0; P.vy = 0;
  melde('Verschüttet. Zurück im Haus, ' + verloren + ' Einheiten liegen im Berg', 'schlecht');
  klang('einsturz');
}

function leiterAn(x, y){
  return y >= 0 && y < HOEHE && x >= 0 && x < BREITE && bau[idx(x,y)] !== 0 && !fest(x,y);
}
/* Balken und Schienen sind Leitern. Auch der Fussraum zaehlt, damit man
   oben auf einer Balkenreihe nicht sofort wieder abrutscht. */
function klettertHier(){
  const cx = Math.floor(P.x + P.b/2);
  return leiterAn(cx, Math.floor(P.y + P.h/2)) || leiterAn(cx, Math.floor(P.y + P.h - 0.06));
}

/* Einen Wert ans Ziel heranfahren, höchstens um rate*dt je Bild. Das ist
   die ganze Trägheit in einer Zeile: wer schwer ist, bekommt eine kleine
   Rate. Überschiessen kann nichts, das Ziel wird nie überschritten. */
function ziehe(wert, ziel, rate, dt){
  const d = ziel - wert;
  const s = rate * dt;
  if (d > s)  return wert + s;
  if (d < -s) return wert - s;
  return ziel;
}

function bewege(dt){
  const links = taste.links, rechts = taste.rechts, auf = taste.auf, ab = taste.ab;
  if (links) P.blick = -1;
  if (rechts) P.blick = 1;

  const richtung = (rechts ? 1 : 0) - (links ? 1 : 0);
  // Die Ladung hängt an allem, was beschleunigt. Voll beladen fällt das
  // Anfahren merklich schwerer, das Höchsttempo bleibt aber gleich.
  const traegheit = 1 - LAST * Math.min(1, frachtMasse() / kapazitaet());

  if (S.imFahrzeug){
    /* --- Bohrfahrzeug: schwerer Körper mit Schub --- */
    const sprit = S.treibstoff > 0;
    if (auf && sprit){
      // Schub liegt nur knapp über der Schwerkraft, das Abheben braucht Zeit
      P.vy -= SCHUB * dt;   // Schub traegt die Ladung mit, sonst steigt es voll nicht mehr
      P.vy = Math.max(P.vy, -MAX_SCHUB);
      S.treibstoff = Math.max(0, S.treibstoff - 7.5*dt);
      if (Math.random() < 0.7) funke(P.x+P.b/2, P.y+P.h, (Math.random()-0.5)*3, 6+Math.random()*5, '#ffb347', 0.28);
    }
    if (richtung){
      // Kein Zuschlag beim Wenden: eine Maschine mit Masse dreht nicht flinker,
      // nur weil man dagegenhält. Am Boden beissen dafür die Ketten.
      const zug = SCHUB_SEIT * traegheit * (P.amBoden ? KETTEN_GRIFF : 1);
      P.vx = ziehe(P.vx, richtung*MAX_FAHRT, zug, dt);
      S.treibstoff = Math.max(0, S.treibstoff - (P.amBoden?0:1.6)*dt);
    } else {
      P.vx = ziehe(P.vx, 0, P.amBoden ? FAHR_BREMS : FAHR_ROLL, dt);
    }
    P.klettert = false;
  } else {
    /* --- Zu Fuss --- */
    // Steht Levi auf festem Boden, haelt er sich nicht fest, sonst schwebt er
    // ueber dem Boden statt aufzusetzen und amBoden bleibt falsch.
    const bodenUnterFuss = fest(Math.floor(P.x + P.b/2), Math.floor(P.y + P.h + 0.02));
    P.klettert = klettertHier()
      && (auf || ab || (Math.abs(P.vy) < 0.6 && !bodenUnterFuss));
    if (P.klettert && (auf || ab)){
      P.vy = ziehe(P.vy, (ab ? 1 : -1) * KLETTERN, KLETTER_ZUG, dt);
    } else if (P.klettert && !auf && !ab){
      P.vy = 0;                                   // an der Leiter hält er sich fest
    }
    // Beim Diagonalgraben bleibt Levi stehen, sonst laeuft er vom Ziel weg
    const graebtSchraeg = diagonalZiel() !== null;
    if (graebtSchraeg){
      P.vx = ziehe(P.vx, 0, BREMS*2, dt);
    } else if (richtung){
      // Am Boden trägt der Schuh, in der Luft nur der Schwung. Wer gegen die
      // eigene Fahrt drückt, stemmt sich dagegen und wendet darum schneller,
      // als er anfährt. Ohne das wirkt Masse nicht schwer, sondern unwillig.
      const gegen = richtung * P.vx < 0;
      const zug = ZUG * traegheit * (gegen ? WENDE : 1) * (P.amBoden ? 1 : LUFT);
      P.vx = ziehe(P.vx, richtung*LAUF, zug, dt);
    } else {
      P.vx = ziehe(P.vx, 0, P.amBoden ? BREMS : LUFT_BREMS, dt);
    }
    // Nicht springen, solange die Schraege abgebaut wird
    if (auf && P.amBoden && !P.klettert && !graebtSchraeg
        && !fest(Math.floor(P.x+P.b/2), Math.floor(P.y)-1)){
      P.vy = -SPRUNG; P.amBoden = false; klang('sprung');
    }
  }

  if (!P.klettert) P.vy = Math.min(MAX_FALL, P.vy + G*dt);

  P.amBoden = false;
  P.x += P.vx*dt; loeseX();
  const fallVor = P.vy;                 // loeseY setzt vy auf null, vorher merken
  P.y += P.vy*dt; loeseY();

  /* Aufsetzen. Der Schwung geht in die Knie und nicht in die Beine, darum
     verliert Levi beim harten Landen einen Teil seines Tempos. Unterhalb der
     Schadensschwelle bleibt es beim Rums, darüber übernimmt sturzSchaden. */
  if (P.amBoden && fallVor > AUFSETZ){
    P.vx *= 0.45;
    if (fallVor <= STURZ_AB){
      beben = Math.max(beben, 3.2);
      staub(P.x + P.b/2, P.y + P.h, 5, '#8b7a63');
      klang('rums');
    }
  }

  // Rand der Welt: bis knapp ueber den Gipfel darf Levi steigen
  P.x = Math.max(1, Math.min(BREITE-1-P.b, P.x));
  if (P.y < 0.6){ P.y = 0.6; if (P.vy < 0) P.vy = 0; }
}

/* ========================================================================== */
/*                                  Bohren                                    */
/* ========================================================================== */

function bestesWerkzeug(haerte){
  let treffer = null;
  for (const w of WERKZEUG){
    if (w.haerte < haerte) continue;
    if ((S.werkzeuge[w.id] || 0) <= 0) continue;
    treffer = w; break;              // schwaechstes ausreichendes Werkzeug schont das gute
  }
  return treffer;
}

/* Die Kachel schraeg ueber Levi auf der Seite, in die er drueckt.
   Gibt null zurueck, wenn dort nichts zu holen ist. */
function diagonalZiel(){
  if (!taste.auf || P.klettert) return null;
  if (!taste.links && !taste.rechts) return null;
  const zx = Math.floor(P.x + P.b/2) + (taste.rechts ? 1 : -1);
  const zy = Math.floor(P.y) - 1;
  return fest(zx, zy) ? [zx, zy] : null;
}

function zielKachel(){
  const cx = Math.floor(P.x + P.b/2);
  const mitte = Math.floor(P.y + P.h*0.5);
  const unten = Math.floor(P.y + P.h + 0.04);
  // Levi ist 0.92 Kacheln hoch, sein Kopf liegt also in der Zeile floor(P.y).
  // Die Kachel darueber ist floor(P.y) - 1, nicht floor(P.y - 0.04).
  const oben  = Math.floor(P.y) - 1;
  const seitlich = P.amBoden || P.klettert || S.imFahrzeug;

  // Diagonal nach oben, mit Pfeil hoch und einer Seitentaste zusammen.
  // Damit graebt Levi sich eine Treppe und kommt ohne Balken und Schienen
  // wieder hoch. Muss vor den anderen Zielen stehen.
  const dz = diagonalZiel();
  if (dz) return [dz[0], dz[1], 0.7];

  // Kein !P.klettert mehr: an einer Leiter mit festem Boden darunter war das
  // Graben gesperrt, und weil zugleich die Schwerkraft aus ist, sass Levi fest.
  // Ist die Kachel unter den Fuessen frei, greift fest() nicht und er klettert.
  if (taste.ab && fest(cx, unten))                                    return [cx, unten, 1];
  if (seitlich && taste.links  && fest(Math.floor(P.x-0.16), mitte))  return [Math.floor(P.x-0.16), mitte, 1];
  if (seitlich && taste.rechts && fest(Math.floor(P.x+P.b+0.16), mitte)) return [Math.floor(P.x+P.b+0.16), mitte, 1];
  if (taste.auf && !P.klettert && fest(cx, oben))                     return [cx, oben, 0.5];
  return null;
}

function bohre(dt){
  const ziel = zielKachel();
  P.grabt = false;
  if (!ziel){ P.zx = P.zy = -1; P.fortschritt = 0; return; }

  const [x, y, faktor] = ziel;
  const typ = art(x, y);
  if (typ === FELS){
    P.zx = P.zy = -1; P.fortschritt = 0;
    melde('Urgestein, da geht nichts durch', 'schlecht', 'fels');
    return;
  }
  const g = GESTEIN[typ];
  if (!g) return;

  if (x !== P.zx || y !== P.zy){ P.zx = x; P.zy = y; P.fortschritt = 0; }

  let tempo, werkzeug = null;
  if (S.imFahrzeug){
    if (S.treibstoff <= 0){ melde('Tank leer, der Bohrer steht', 'schlecht', 'sprit'); return; }
    tempo = 2.4;
    S.treibstoff = Math.max(0, S.treibstoff - 1.1*dt);
  } else {
    werkzeug = bestesWerkzeug(g.haerte);
    if (!werkzeug){
      P.fortschritt = 0;
      melde(g.name + ' braucht ein stärkeres Werkzeug. Grab seitlich daran vorbei',
        'schlecht', 'schwach');
      return;
    }
    tempo = werkzeug.tempo;
  }

  P.grabt = true;
  P.schwung += dt * 11;
  P.fortschritt += dt * tempo * faktor;

  if (Math.random() < dt*22) funke(x+0.5, y+0.5, (Math.random()-0.5)*4, -Math.random()*3, g.korn, 0.3);
  if (Math.random() < dt*9) klang('hack');

  const arbeit = 0.34 + 0.36 * g.haerte;
  if (P.fortschritt < arbeit) return;

  /* ---- Kachel bricht ---- */
  P.fortschritt = 0;
  brichKachel(x, y, werkzeug);
}

function brichKachel(x, y, werkzeug){
  const typ = art(x, y);
  if (typ === LEER || typ === FELS) return;
  const g = GESTEIN[typ];
  boden[idx(x,y)] = LEER;

  if (typ === GAS){
    // Der Schaden wächst mit der Tiefe, nicht mit einem festen Wert
    verletze(10 + Math.round(Math.max(0, y - FUSS)/TIEFEN * 26), 'Gastasche geplatzt');
    beben = Math.max(beben, 7);
    staub(x+0.5, y+0.5, 22, '#8fd36a');
    klang('zisch');
  } else if (g.schatz){
    S.gold += g.schatz; S.verdient += g.schatz;
    beben = Math.max(beben, 5);
    staub(x+0.5, y+0.5, 40, '#ffc63d');
    klang('muenze');
    melde('Fundstück aus alter Zeit, +' + g.schatz + ' Goldstücke', 'gold');
    pruefeSieg();
  } else if (g.erz){
    const n = nimmMaterial(g.erz, 1);
    if (n) melde('+1 ' + MATERIAL[g.erz].name, 'gold', 'erz');
    staub(x+0.5, y+0.5, 9, MATERIAL[g.erz].farbe);
    klang('erz');
  } else {
    staub(x+0.5, y+0.5, 6, g.korn);
    klang('bruch');
  }

  if (werkzeug){
    S.werkzeuge[werkzeug.id] = Math.max(0, (S.werkzeuge[werkzeug.id]||0) - 1);
    if (S.werkzeuge[werkzeug.id] === 0){
      delete S.werkzeuge[werkzeug.id];
      melde(werkzeug.name + ' ist durchgebraucht', 'schlecht');
      klang('kaputt');
    }
  }
}

/* ========================================================================== */
/*                         Balken, Schienen, Dynamit                          */
/* ========================================================================== */

function meinFeld(){
  return [Math.floor(P.x + P.b/2), Math.floor(P.y + P.h/2)];
}

function setzeBalken(){
  const [x, y] = meinFeld();
  if (fest(x,y)) return;
  const i = idx(x,y);
  if (bau[i] & 1){ melde('Hier steht schon ein Balken', 'schlecht', 'balken'); return; }
  if (S.balken <= 0){ melde('Keine Stützbalken mehr', 'schlecht', 'balken'); return; }
  S.balken--;
  bau[i] |= 1;
  balkenBuchen(x, y, +1);
  // Stuetzt der Balken einen broeckelnden Stollen, hoert das Rieseln auf
  for (let n = broeckelt.length-1; n >= 0; n--){
    if (stabil(broeckelt[n].x, broeckelt[n].y)) broeckelt.splice(n,1);
  }
  klang('holz');
  melde('Stützbalken gesetzt, ' + S.balken + ' übrig', 'gut', 'balken');
}

function legeSchiene(){
  const [x, y] = meinFeld();
  if (fest(x,y)) return;
  const i = idx(x,y);
  if (bau[i] & 2){ melde('Hier liegt schon eine Schiene', 'schlecht', 'schiene'); return; }
  if (S.schienen <= 0){ melde('Keine Schienen mehr', 'schlecht', 'schiene'); return; }
  S.schienen--;
  bau[i] |= 2;
  klang('metall');
  melde('Schiene gelegt, ' + S.schienen + ' übrig', 'gut', 'schiene');
}

function zuendeDynamit(){
  if (S.dynamit <= 0){ melde('Kein Dynamit dabei', 'schlecht', 'dyn'); return; }
  S.dynamit--;
  const [cx, cy] = meinFeld();
  const R = 2.4;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){
    if (dx*dx + dy*dy > R*R) continue;
    const x = cx+dx, y = cy+dy;
    if (x < 1 || x > BREITE-2 || y < 0 || y >= HOEHE) continue;
    if (art(x,y) === FELS || art(x,y) === LEER) continue;
    brichKachel(x, y, null);
  }
  beben = 16;
  staub(cx+0.5, cy+0.5, 46, '#ffb347');
  klang('bumm');
  melde('Dynamit gezündet', 'gold');
}

function schienenBisBasis(sx, sy){
  if (sy < 0 || sy >= HOEHE || !(bau[idx(sx,sy)] & 2)) return false;
  const gesehen = new Set([idx(sx,sy)]);
  const rand = [[sx, sy]];
  while (rand.length){
    const [x, y] = rand.pop();
    // Das Gleis muss bis ans Haus heran, nicht bloss in dessen Naehe
    if (y <= basisY() && Math.abs(x - BASIS_X) <= 2) return true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = x+dx, ny = y+dy;
      if (nx < 1 || nx > BREITE-2 || ny < 0 || ny >= HOEHE) continue;
      const ni = idx(nx,ny);
      if (gesehen.has(ni) || !(bau[ni] & 2)) continue;
      gesehen.add(ni); rand.push([nx, ny]);
    }
  }
  return false;
}

function sendeWagen(){
  if (!S.wagen){ melde('Dafür brauchst du einen Minenwagen', 'schlecht'); return; }
  if (frachtStueck() <= 0){ melde('Der Rucksack ist leer', 'schlecht'); return; }
  const [x, y] = meinFeld();
  if (!schienenBisBasis(x, y)){
    melde('Kein durchgehendes Gleis bis zur Basis', 'schlecht');
    return;
  }
  abliefern();
  klang('wagen');
  melde('Der Minenwagen rollt heim', 'gut');
}

/* Der verlaessliche Weg zurueck nach oben, wenn der Schacht zu tief
   oder die Balken aufgebraucht sind. */
function nutzeSeilwinde(){
  if (anBasis()){ melde('Du stehst schon an der Basis', 'schlecht', 'seil'); return; }
  if (S.seilwinde <= 0){
    melde('Keine Seilwinde mehr. Grab dich hoch oder setz Balken als Leiter', 'schlecht', 'seil');
    return;
  }
  S.seilwinde--;
  S.imFahrzeug = false;
  P.x = BASIS_X; P.y = basisY() - P.h; P.vx = 0; P.vy = 0;
  const z = kameraZiel(); kamera.x = z.x; kamera.y = z.y;
  klang('wagen');
  melde('Die Seilwinde zieht dich hoch, ' + S.seilwinde + ' übrig', 'gut');
}

function wechsleFahrzeug(){
  if (!S.bohrer){ melde('Du hast noch kein Bohrfahrzeug', 'schlecht'); return; }
  S.imFahrzeug = !S.imFahrzeug;
  P.vx = 0;
  klang(S.imFahrzeug ? 'motor' : 'motoraus');
  melde(S.imFahrzeug ? 'Bohrfahrzeug an' : 'Wieder zu Fuss', 'gut');
  hud();
}

/* ========================================================================== */
/*                                 Einsturz                                   */
/* ========================================================================== */

function pruefeEinsturz(dt){
  einsturzUhr -= dt;
  if (einsturzUhr <= 0){
    einsturzUhr = 1.3;
    const cx = Math.floor(P.x + P.b/2), cy = Math.floor(P.y + P.h/2);
    for (let versuch = 0; versuch < 5; versuch++){
      const x = cx + Math.round((Math.random()-0.5)*18);
      const y = cy + Math.round((Math.random()-0.5)*14);
      if (x < 1 || x > BREITE-2 || y >= HOEHE-2) continue;
      if (fest(x,y) || stabil(x,y)) continue;
      if (broeckelt.some(b => b.x === x && b.y === y)) continue;
      const tiefe = Math.max(0, y - FUSS) / TIEFEN;
      if (Math.random() > 0.05 + tiefe*0.14) continue;
      broeckelt.push({x, y, t:1.2});
      klang('rieseln');
      break;
    }
  }

  for (let n = broeckelt.length-1; n >= 0; n--){
    const b = broeckelt[n];
    b.t -= dt;
    if (Math.random() < dt*7) funke(b.x + Math.random(), b.y + 0.15, 0, 2, '#6b5a45', 0.4);
    if (b.t > 0) continue;
    broeckelt.splice(n, 1);
    if (stabil(b.x, b.y) || fest(b.x, b.y)) continue;

    const trifftLevi = P.x + P.b > b.x && P.x < b.x + 1 && P.y + P.h > b.y && P.y < b.y + 1;
    if (trifftLevi){
      verletze(20, 'Der Stollen bricht ein');
    } else {
      bauLoeschen(b.x, b.y);
      boden[idx(b.x, b.y)] = GEROELL;
    }
    staub(b.x + 0.5, b.y + 0.5, 16, '#6b5a45');
    beben = Math.max(beben, 6);
    klang('einsturz');
  }
}

/* ========================================================================== */
/*                                  Basis                                     */
/* ========================================================================== */

function anBasis(){
  const cx = P.x + P.b/2, fuss = basisY();
  return Math.abs(cx - (BASIS_X + 0.5)) < 2.8 && P.y + P.h > fuss - 1.6 && P.y + P.h < fuss + 0.6;
}

function basisTick(dt){
  if (!anBasis()) return;
  /* Sicherheitsnetz gegen die Sackgasse. Ohne Werkzeug, ohne Gold und mit
     leerem Lager kann Levi nichts mehr brechen, also nichts mehr verdienen,
     also nie wieder ein Werkzeug kaufen. Gemessen: 0 Meter nach zehn Sekunden
     Graben. Das Haus haelt darum eine Reserveschaufel bereit. */
  if (bestesWerkzeug(1) === null && lagerWert() === 0
      && frachtStueck() === 0
      && S.gold < ((LADEN.find(w => w.id === 'schaufel').preis || {}).gold || 0)){
    S.werkzeuge.schaufel = WZ.schaufel.halt;
    melde('Im Haus lag noch eine Reserveschaufel', 'gut', 'reserve');
    klang('kaufen');
  }
  /* Zweite Sackgasse, gemessen an einem Durchlauf: unten gestrandet, Seilwinden
     verbraucht, Gestein zu hart zum Weitergraben in jede Richtung. Wer die Mine
     verlaesst, nimmt darum immer mindestens ein Seil mit. */
  if (S.seilwinde === 0 && S.gold < ((LADEN.find(w => w.id === 'seilwinde').preis || {}).gold || 0)){
    S.seilwinde = 1;
    melde('Im Haus hing noch ein Seil, nimm es mit', 'gut', 'seilreserve');
  }
  if (frachtStueck() > 0) abliefern();
  if (S.leben < 100) S.leben = Math.min(100, S.leben + 34*dt);
  if (S.bohrer && S.treibstoff < 100) S.treibstoff = Math.min(100, S.treibstoff + 42*dt);
}

/* ========================================================================== */
/*                            Funken und Klang                                */
/* ========================================================================== */

function funke(x, y, vx, vy, farbe, leben){
  if (funken.length > 420) return;
  funken.push({x, y, vx, vy, farbe, leben, max:leben, gr:1.5 + Math.random()*2.5});
}
function staub(x, y, n, farbe){
  for (let i = 0; i < n; i++)
    funke(x, y, (Math.random()-0.5)*7, (Math.random()-0.8)*6, farbe, 0.35 + Math.random()*0.5);
}
function funkenTick(dt){
  for (let i = funken.length-1; i >= 0; i--){
    const f = funken[i];
    f.leben -= dt;
    if (f.leben <= 0){ funken.splice(i,1); continue; }
    f.vy += 22*dt;
    f.x += f.vx*dt; f.y += f.vy*dt;
  }
}

let audio = null;
const KLANG = {
  hack:     {f:150, d:0.05, t:'square',   v:0.035},
  bruch:    {f:110, d:0.11, t:'triangle', v:0.07},
  erz:      {f:880, d:0.12, t:'sine',     v:0.08, zu:1320},
  muenze:   {f:660, d:0.20, t:'sine',     v:0.10, zu:1180},
  holz:     {f:210, d:0.10, t:'triangle', v:0.08},
  metall:   {f:520, d:0.09, t:'square',   v:0.05},
  bumm:     {f:70,  d:0.42, t:'sawtooth', v:0.16, zu:24},
  zisch:    {f:300, d:0.30, t:'sawtooth', v:0.09, zu:90},
  einsturz: {f:90,  d:0.32, t:'sawtooth', v:0.12, zu:38},
  rieseln:  {f:420, d:0.16, t:'triangle', v:0.03, zu:260},
  rums:     {f:130, d:0.16, t:'sawtooth', v:0.10, zu:52},
  sprung:   {f:420, d:0.08, t:'sine',     v:0.05, zu:660},
  kaputt:   {f:300, d:0.24, t:'square',   v:0.07, zu:80},
  kaufen:   {f:540, d:0.16, t:'sine',     v:0.09, zu:900},
  motor:    {f:120, d:0.24, t:'sawtooth', v:0.07, zu:260},
  motoraus: {f:260, d:0.22, t:'sawtooth', v:0.06, zu:100},
  wagen:    {f:330, d:0.26, t:'square',   v:0.06, zu:520},
};
let klangSperre = 0;

function klang(name){
  if (!S.ton) return;
  const k = KLANG[name];
  if (!k) return;
  const jetzt = performance.now();
  if (name === 'hack' && jetzt - klangSperre < 70) return;
  if (name === 'hack') klangSperre = jetzt;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = k.t;
    o.frequency.setValueAtTime(k.f, t);
    if (k.zu) o.frequency.exponentialRampToValueAtTime(Math.max(20, k.zu), t + k.d);
    g.gain.setValueAtTime(k.v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + k.d);
    o.connect(g); g.connect(audio.destination);
    o.start(t); o.stop(t + k.d + 0.02);
  } catch(e){ /* ohne Ton weiterspielen */ }
}

/* ========================================================================== */
/*                                Meldungen                                   */
/* ========================================================================== */

const meldungsSperre = {};
function melde(text, klasse = '', schluessel = null){
  const jetzt = performance.now();
  if (schluessel){
    if (meldungsSperre[schluessel] && jetzt - meldungsSperre[schluessel] < 1400) return;
    meldungsSperre[schluessel] = jetzt;
  }
  const kasten = document.getElementById('meldungen');
  const d = document.createElement('div');
  d.className = 'meldung ' + klasse;
  d.textContent = text;
  kasten.appendChild(d);
  setTimeout(() => d.remove(), 2550);
  while (kasten.children.length > 5) kasten.firstChild.remove();
}

const zahl = n => Math.round(n).toLocaleString('de-CH');

/* ========================================================================== */
/*                              Kachelbilder                                  */
/* ========================================================================== */

const kachelBild = {};
const randBild = {};          // Gesteinsart -> Bild je Randfall

/* Randfaelle nach dem Autotile-Verfahren. Bits, gesetzt heisst Nachbar ist
   Hohlraum: 1 N, 2 NO, 4 O, 8 SO, 16 S, 32 SW, 64 W, 128 NW.

   Mit nur vier Orthogonalen sind gerade Wand, Aussenecke und Innenecke nicht
   unterscheidbar, alle Kacheln einer senkrechten Hoehlenwand tragen dieselbe
   Maske. Daher sahen senkrechte Waende zwangslaeufig gestuft aus. Eine
   Diagonale ist nur formbestimmend, wenn beide angrenzenden Orthogonalen fest
   sind; ist eine offen, liegt die Ecke ohnehin frei. Damit schrumpfen die 256
   rohen Kombinationen auf genau 47 unterscheidbare. */
const randFall = new Uint8Array(256);
const fallMaske = [];
(function baueFalltabelle(){
  const norm = m => {
    let r = m;
    if ((m & 1)  || (m & 4))  r &= ~2;
    if ((m & 4)  || (m & 16)) r &= ~8;
    if ((m & 16) || (m & 64)) r &= ~32;
    if ((m & 64) || (m & 1))  r &= ~128;
    return r;
  };
  const gesehen = new Map();
  for (let m = 0; m < 256; m++){
    const n = norm(m);
    if (!gesehen.has(n)){ gesehen.set(n, fallMaske.length); fallMaske.push(n); }
    randFall[m] = gesehen.get(n);
  }
})();
const FAELLE = fallMaske.length;

/* Zu welcher Grundart eine Kachel gehoert. Untergrund und Randbild richten sich
   danach, nicht nach dem Tiefenband: sonst weicht in der Uebergangszone fast
   jede Kachel vom Band ab, legt ihren Fleck, und es entsteht ein Fleckenraster
   samt harter waagrechter Naht dort, wo tarnung(y) umspringt. */
const GRUNDART = {
  [ERDE]:ERDE, [GEROELL]:ERDE,
  [STEIN]:STEIN, [ERZ]:STEIN, [KUPFER]:STEIN,
  [HARTSTEIN]:HARTSTEIN, [BRONZE]:HARTSTEIN, [SILBER]:HARTSTEIN, [SCHATZ]:HARTSTEIN,
  [GRANIT]:GRANIT, [GOLDERZ]:GRANIT, [FELS]:GRANIT,
};

const zahlFarbe = hex => {
  const n = parseInt(hex.slice(1), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
};
const VARIANTEN = 8;

/* Farbe heller oder dunkler stellen, ohne eine Bibliothek dafuer */
function ton(hex, d){
  const n = parseInt(hex.slice(1), 16);
  const f = k => Math.max(0, Math.min(255, Math.round(k + d*255)));
  return `rgb(${f((n>>16)&255)},${f((n>>8)&255)},${f(n&255)})`;
}

/* Durchgehender Untergrund je Tiefenband, zwoelf Kacheln breit. Er wird nach
   Weltkoordinaten angeschnitten, darum laeuft die Zeichnung ueber Kachelgrenzen
   hinweg und wiederholt sich erst nach zwoelf Kacheln statt nach jeder. */
const GRUND_KACHELN = 12;
const grundBild = {};

function baueGrundbild(typ){
  const S2 = K * GRUND_KACHELN;
  const c = document.createElement('canvas');
  c.width = c.height = S2;
  const d = c.getContext('2d');
  const g = GESTEIN[typ];
  d.fillStyle = g.farbe;
  d.fillRect(0, 0, S2, S2);

  const umlauf = [[0,0],[S2,0],[-S2,0],[0,S2],[0,-S2],[S2,S2],[-S2,-S2],[S2,-S2],[-S2,S2]];

  // grosse weiche Schollen
  for (let i = 0; i < 200; i++){
    const mx = hash(i*7 + typ, typ*13 + i*3) * S2;
    const my = hash(typ*17 + i*11, i*5 + typ) * S2;
    const rz = hash(i*3 + typ, i*5);
    d.globalAlpha = 0.17 + rz*0.34;
    d.fillStyle = rz < 0.5 ? g.korn : ton(g.farbe, 0.06);
    for (const [ox, oy] of umlauf){
      d.beginPath();
      for (let n = 0; n <= 10; n++){
        const w = n/10 * Math.PI*2;
        const rr = K * (0.35 + rz*0.85) * (0.6 + hash(i*13 + n, n*7 + typ)*0.7);
        const px = mx + ox + Math.cos(w)*rr, py = my + oy + Math.sin(w)*rr*0.7;
        if (n) d.lineTo(px, py); else d.moveTo(px, py);
      }
      d.closePath(); d.fill();
    }
  }
  // feine Koernung
  for (let i = 0; i < 900; i++){
    const mx = hash(i*23 + typ, typ*29 + i) * S2;
    const my = hash(typ*31 + i*19, i*11 + typ) * S2;
    const rz = hash(i*11 + typ, i*13);
    d.globalAlpha = 0.30 + rz*0.68;
    d.fillStyle = rz < 0.6 ? g.korn : ton(g.farbe, 0.09);
    for (const [ox, oy] of umlauf){
      d.beginPath(); d.arc(mx+ox, my+oy, 0.8 + rz*2.2, 0, 7); d.fill();
    }
  }
  d.globalAlpha = 1;
  return c;
}

/* Ein Kachelbild ist jetzt ein durchsichtiger Fleck, kein volles Quadrat.
   Nachbarkacheln gleicher Art fliessen dadurch ineinander. */
function baueKachelbild(typ, variante){
  const c = document.createElement('canvas');
  c.width = c.height = K;
  const d = c.getContext('2d');
  const g = GESTEIN[typ];

  // Der Abstand der Varianten bleibt klein, er soll die Wiederholung brechen
  // und keinen Flickenteppich erzeugen. Das Vorbild trennt um 3 bis 7 von 255.
  d.fillStyle = ton(g.farbe, (hash(variante*17+3, typ*29+7) - 0.5) * 0.022);
  d.beginPath();
  for (let n = 0; n <= 13; n++){
    const w = n/13 * Math.PI*2;
    const r = K * (0.52 + hash(variante*29 + n*7, n*11 + typ) * 0.20);
    const px = K/2 + Math.cos(w)*r, py = K/2 + Math.sin(w)*r;
    if (n) d.lineTo(px, py); else d.moveTo(px, py);
  }
  d.closePath();
  d.fill();
  d.globalCompositeOperation = 'source-atop';   // alles Weitere bleibt im Fleck

  // Koernung als runde Krumen, ueber den Rand hinaus, damit keine Kante entsteht
  for (let i = 0; i < 30; i++){
    const rx = hash(variante*97 + i*13, typ*31 + i*7);
    const ry = hash(typ*13 + i*3, variante*57 + i*11);
    const rz = hash(i*5 + variante, typ*7 + i);
    d.globalAlpha = 0.17 + rz*0.34;
    d.fillStyle = rz < 0.62 ? g.korn : ton(g.farbe, 0.07);
    d.beginPath();
    d.arc(rx*K, ry*K, 1.1 + rz*3.4, 0, 7);
    d.fill();
  }
  // Unregelmaessige Schollen, ueber den Kachelrand hinaus gezeichnet und
  // umlaufend wiederholt. Dadurch endet die Zeichnung nicht an der Kante und
  // das Feld liest sich als gewachsene Erde statt als Reihe von Kloetzen.
  for (let i = 0; i < 4; i++){
    const mx = hash(variante*41 + i*19, typ*11 + i*23) * K;
    const my = hash(typ*37 + i*29, variante*13 + i*3) * K;
    const dunkel = i % 2 === 0;
    d.globalAlpha = dunkel ? 0.20 : 0.09;
    d.fillStyle = dunkel ? g.korn : ton(g.farbe, 0.06);
    for (const [ox, oy] of [[0,0],[K,0],[-K,0],[0,K],[0,-K]]){
      d.beginPath();
      for (let n = 0; n <= 11; n++){
        const w = n/11 * Math.PI*2;
        const r = K * (0.16 + hash(variante*13 + i*7 + n*3, n*11 + typ) * 0.22);
        const px = mx + ox + Math.cos(w)*r;
        const py = my + oy + Math.sin(w)*r*0.78;
        if (n === 0) d.moveTo(px, py); else d.lineTo(px, py);
      }
      d.closePath();
      d.fill();
    }
  }
  d.globalAlpha = 1;

  // Erznester
  if (g.erz){
    // Kantige Splitter mit heller und dunkler Facette, das liest sich als
    // Kristall. Runde Kiesel wirken daneben wie Kaugummi.
    const f = MATERIAL[g.erz].farbe;
    const n = g.erz === 'gold' ? 4 : 5;
    for (let i = 0; i < n; i++){
      const rx = hash(variante*31 + i*11, typ*17);
      const ry = hash(typ*23, variante*41 + i*13);
      const mx = 6 + rx*(K-13), my = 6 + ry*(K-13);
      const gr = 3.2 + hash(i, variante)*3.0;
      const dreh = hash(i*7, variante*3) * Math.PI*2;
      const ecke = (k, r) => [mx + Math.cos(dreh + k)*r, my + Math.sin(dreh + k)*r*0.9];
      const a = ecke(0, gr), b = ecke(2.2, gr*0.95), c = ecke(4.1, gr*0.8);
      d.fillStyle = 'rgba(0,0,0,.40)';
      d.beginPath(); d.moveTo(a[0]+1, a[1]+1.6); d.lineTo(b[0]+1, b[1]+1.6);
      d.lineTo(c[0]+1, c[1]+1.6); d.closePath(); d.fill();
      d.fillStyle = f;
      d.beginPath(); d.moveTo(a[0], a[1]); d.lineTo(b[0], b[1]);
      d.lineTo(c[0], c[1]); d.closePath(); d.fill();
      // helle Facette auf der Lichtseite
      d.fillStyle = 'rgba(255,255,255,.42)';
      d.beginPath(); d.moveTo(a[0], a[1]); d.lineTo(b[0], b[1]);
      d.lineTo(mx, my); d.closePath(); d.fill();
      // dunkle Facette gegenueber
      d.fillStyle = 'rgba(0,0,0,.28)';
      d.beginPath(); d.moveTo(b[0], b[1]); d.lineTo(c[0], c[1]);
      d.lineTo(mx, my); d.closePath(); d.fill();
    }
  }
  if (typ === GAS){
    d.fillStyle = 'rgba(140,220,110,.5)';
    for (let i = 0; i < 5; i++){
      const rx = hash(i*7, variante*3), ry = hash(variante*9, i*5);
      d.beginPath(); d.arc(5 + rx*(K-10), 5 + ry*(K-10), 2.5 + rx*3, 0, 7); d.fill();
    }
  }
  if (typ === SCHATZ){
    // Truhe im Gestein
    d.fillStyle = '#6b4520'; d.fillRect(5, K*0.42, K-10, K*0.44);
    d.fillStyle = '#8a5a2b';
    d.beginPath(); d.ellipse(K/2, K*0.42, (K-10)/2, K*0.2, 0, Math.PI, 0); d.fill();
    d.fillStyle = '#ffc63d'; d.fillRect(5, K*0.56, K-10, 4);
    d.fillRect(K/2 - 3, K*0.52, 6, 9);
    d.fillStyle = 'rgba(255,240,180,.35)'; d.fillRect(6, K*0.44, 3, K*0.4);
  }
  return c;
}

/* Saum fuer die Seiten, die an Hohlraum grenzen. Unregelmaessig, damit die
   Wand gegraben aussieht und nicht geschnitten. Die Maske hat ein Bit je
   Seite: 1 oben, 2 rechts, 4 unten, 8 links. */
/* Ein Randbild je Gesteinsart und Fall. Volle Deckung, kein Saum: der Uebergang
   von Fels zu Hohlraum wird INNERHALB der Kachel gemalt, nicht an ihrem Rand.
   Dazu ein Abstandsfeld zum Hohlraum, aus dem die Helligkeit folgt. Der helle
   Saum knapp innerhalb der Bruchkante traegt die Lichtstimmung. */
function baueRandbild(typ, fall){
  const m = fallMaske[fall];
  const c = document.createElement('canvas');
  c.width = c.height = K;
  const d = c.getContext('2d');
  const bild = d.createImageData(K, K);
  const dat = bild.data;

  const g = GESTEIN[typ];
  const grund = zahlFarbe(g.farbe), korn = zahlFarbe(g.korn);
  const lippe = grund.map(k => Math.min(255, k * 1.42));
  const hohl = [10, 9, 8];
  const R = K * 0.42;
  const oN = m & 1, oO = m & 4, oS = m & 16, oW = m & 64;

  for (let y = 0; y < K; y++){
    for (let x = 0; x < K; x++){
      const dN = y + 0.5, dO = K - x - 0.5, dS = K - y - 0.5, dW = x + 0.5;
      let ab = 1e9;
      if (oN) ab = Math.min(ab, dN);
      if (oO) ab = Math.min(ab, dO);
      if (oS) ab = Math.min(ab, dS);
      if (oW) ab = Math.min(ab, dW);
      // Aussenecke: zwei offene Seiten, das Gestein wird dort abgerundet
      const paare = [[oN,oW,dN,dW], [oN,oO,dN,dO], [oS,oO,dS,dO], [oS,oW,dS,dW]];
      for (let i = 0; i < 4; i++){
        const [a, b, da, db] = paare[i];
        if (a && b && da < R && db < R) ab = Math.min(ab, R - Math.hypot(R-da, R-db));
      }
      // Innenecke: offene Diagonale bei zwei festen Orthogonalen
      if (m & 128) ab = Math.min(ab, Math.hypot(dW, dN));
      if (m & 2)   ab = Math.min(ab, Math.hypot(dO, dN));
      if (m & 8)   ab = Math.min(ab, Math.hypot(dO, dS));
      if (m & 32)  ab = Math.min(ab, Math.hypot(dW, dS));
      // Bruchkante unregelmaessig machen, sonst wirkt sie gedrechselt
      ab += (wertRausch(x + fall*37, y + fall*23, 5.5, fall + 11) - 0.5) * K * 0.22;

      const t = Math.max(0, Math.min(1, ab / (K * 0.46)));
      let r, gr, b;
      if (t < 0.18){                       // Hohlraum bis heller Saum
        const u = t / 0.18;
        r  = hohl[0] + (lippe[0] - hohl[0]) * u;
        gr = hohl[1] + (lippe[1] - hohl[1]) * u;
        b  = hohl[2] + (lippe[2] - hohl[2]) * u;
      } else {                             // Saum zurueck auf den Grundton
        const u = (t - 0.18) / 0.82;
        r  = lippe[0] + (grund[0] - lippe[0]) * u;
        gr = lippe[1] + (grund[1] - lippe[1]) * u;
        b  = lippe[2] + (grund[2] - lippe[2]) * u;
      }
      // Koernung, damit die Flaeche nicht glatt wirkt
      const n = wertRausch(x + fall*13, y + fall*29, 2.6, fall + 3);
      const k = 0.88 + n * 0.24;
      r *= k; gr *= k; b *= k;
      if (n > 0.72 && t > 0.3){            // vereinzelte dunkle Krumen
        r = r*0.7 + korn[0]*0.3; gr = gr*0.7 + korn[1]*0.3; b = b*0.7 + korn[2]*0.3;
      }
      const i = (y*K + x) * 4;
      dat[i]   = Math.max(0, Math.min(255, r));
      dat[i+1] = Math.max(0, Math.min(255, gr));
      dat[i+2] = Math.max(0, Math.min(255, b));
      dat[i+3] = 255;                      // volle Deckung
    }
  }
  d.putImageData(bild, 0, 0);
  return c;
}

function baueAlleKachelbilder(){
  for (const typ of [ERDE, STEIN, HARTSTEIN, GRANIT]){
    grundBild[typ] = baueGrundbild(typ);
    randBild[typ] = [];
    for (let f = 0; f < FAELLE; f++) randBild[typ].push(baueRandbild(typ, f));
  }
  for (const typ of [ERDE, GEROELL, STEIN, HARTSTEIN, GRANIT, FELS, GAS, ERZ, KUPFER, BRONZE, SILBER, GOLDERZ, SCHATZ]){
    kachelBild[typ] = [];
    for (let v = 0; v < VARIANTEN; v++) kachelBild[typ].push(baueKachelbild(typ, v));
  }
}

/* ========================================================================== */
/*                                 Zeichnen                                   */
/* ========================================================================== */

const dunkel = document.createElement('canvas');
const dctx = dunkel.getContext('2d');

function passeGroesseAn(){
  W = leinwand.width = innerWidth;
  H = leinwand.height = innerHeight;
  dunkel.width = W; dunkel.height = H;
}
addEventListener('resize', passeGroesseAn);

/* Gastaschen tragen die Maske des umgebenden Gesteins. Man sieht sie erst,
   wenn man sie angebohrt hat, und genau das macht sie gefährlich. */
function tarnung(y){
  const t = y - FUSS;
  if (t < 30)  return ERDE;
  if (t < 100) return STEIN;
  if (t < 200) return HARTSTEIN;
  return GRANIT;
}

function tiefenFarbe(t){
  if (t < 30)  return [64, 44, 28];
  if (t < 70)  return [52, 46, 44];
  if (t < 120) return [40, 40, 52];
  if (t < 170) return [32, 30, 50];
  return [26, 20, 40];
}

const KETTEN = [
  {faktor:0.10, punkte:24, abstand:150, basis:2.4, streu:10.0, kern:11, saum:0,
   flaeche:'#93a6bd', schatten:'#8b9fb8', kante:'rgba(255,250,240,.14)',
   schnee:null, schneeSchatten:null, schneeAb:0, dunst:false},
  {faktor:0.18, punkte:26, abstand:132, basis:2.6, streu:12.0, kern:29, saum:0,
   flaeche:'#7d93b0', schatten:'#6d84a3', kante:'rgba(255,250,240,.20)',
   schnee:'#d3dde8', schneeSchatten:'#b3c3d5', schneeAb:7.0, dunst:false},
  {faktor:0.30, punkte:30, abstand:116, basis:2.2, streu:13.0, kern:53, saum:0,
   flaeche:'#61799c', schatten:'#4e6788', kante:'rgba(255,248,235,.28)',
   schnee:'#c6d4e3', schneeSchatten:'#a3b6cd', schneeAb:7.0, dunst:false},
  {faktor:0.46, punkte:36, abstand:98,  basis:1.4, streu:6.0, kern:71, saum:7,
   flaeche:'#465f80', schatten:'#35496a', kante:null,
   schnee:null, schneeSchatten:null, schneeAb:0, dunst:true},
];

function zeichneHimmel(){
  const oben  = -kamera.y;                  // Bildschirmzeile der Weltoberkante
  const grund = FUSS*K - kamera.y;          // Bildschirmzeile des Bergfusses

  /* ------------------------------- Himmel -------------------------------- */
  /* Die Farbe kippt von oben nach unten: kaltes Höhenblau, darunter Tagblau,
     zuunterst der blasse Dunst über dem Tal. */
  const himmel = ctx.createLinearGradient(0, oben, 0, grund);
  himmel.addColorStop(0.00, '#14264a');
  himmel.addColorStop(0.32, '#274a7d');
  himmel.addColorStop(0.62, '#5981ad');
  himmel.addColorStop(0.86, '#a3b9cb');
  himmel.addColorStop(1.00, '#ccccc4');
  ctx.fillStyle = himmel;
  // nach oben weit überzeichnen, sonst klafft über dem Himmel ein schwarzes Band
  ctx.fillRect(0, oben - H, W, H + FUSS*K + 4);

  /* -------------------------------- Sonne -------------------------------- */
  /* Sie steht tief über den fernen Ketten und liegt links, damit die hellen
     Kanten weiter unten eine Quelle haben. Bewegungsfaktor 0.04, also
     praktisch unendlich weit weg. In der Höhe hängt sie am Grund, dadurch
     wandert sie beim Aufstieg richtig mit. */
  // Auf schmalen Geräten schiebt das Höchstmass sie hinter der Statustafel hervor
  const sx = Math.max(W*0.24, 7*K) - kamera.x*0.04;
  const sy = Math.max(grund - 10.5*K, 96);   // nicht hinter die Kopfleiste rutschen
  const hof = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7.5*K);
  hof.addColorStop(0, 'rgba(255,238,198,.26)');
  hof.addColorStop(1, 'rgba(255,238,198,0)');
  ctx.fillStyle = hof;
  ctx.fillRect(sx - 7.5*K, sy - 7.5*K, 15*K, 15*K);
  ctx.fillStyle = 'rgba(255,240,201,.94)';
  ctx.beginPath(); ctx.arc(sx, sy, 0.55*K, 0, 7); ctx.fill();

  /* ------------------------------- Ketten -------------------------------- */
  const px = [], py = [];
  for (const kk of KETTEN){

    /* Dunst vor der vordersten Kette. Er nimmt den hinteren Ketten den Fuss,
       erst dadurch stehen sie wirklich weit hinten. Der Vorberg wird danach
       darüber gezeichnet und tritt damit nach vorn. */
    if (kk.dunst){
      const d = ctx.createLinearGradient(0, grund - 11*K, 0, grund);
      d.addColorStop(0.00, 'rgba(203,211,213,0)');
      d.addColorStop(0.55, 'rgba(203,211,213,.32)');
      d.addColorStop(1.00, 'rgba(212,210,200,.60)');
      ctx.fillStyle = d;
      ctx.fillRect(0, grund - 11*K, W, 11*K);
      // Warmer Schein unter der Sonne, er begründet das Licht auf den Flanken
      const s = ctx.createRadialGradient(sx, grund - 3*K, 0, sx, grund - 3*K, 14*K);
      s.addColorStop(0, 'rgba(255,226,172,.22)');
      s.addColorStop(1, 'rgba(255,226,172,0)');
      ctx.fillStyle = s;
      ctx.fillRect(sx - 14*K, grund - 17*K, 28*K, 14*K);
    }

    // Kammpunkte einsammeln, ein Punkt mehr als nötig auf jeder Seite
    const vx = kamera.x * kk.faktor;
    const i0 = Math.floor(vx / kk.abstand) - 1;
    const i1 = Math.ceil((vx + W) / kk.abstand) + 1;
    px.length = 0; py.length = 0;
    for (let i = i0; i <= i1; i++){
      const j = ((i % kk.punkte) + kk.punkte) % kk.punkte;
      const a = hash(j*17 + kk.kern*3, kk.kern*11 + 5);
      const b = hash(kk.kern*29 + 7, j*13 + kk.kern);
      // Jeder zweite Punkt ist ein Sattel, dazwischen steht ein Gipfel
      const zacke = (j % 2 === 0) ? 1 : 0.46;
      const hoch = (kk.basis + kk.streu * zacke * (0.30 + 0.70*a) * (0.62 + 0.38*b)) * K;
      px.push(i*kk.abstand - vx);
      py.push(grund - hoch);
    }
    const n1 = px.length - 1;

    // Grundfläche der Kette, ein einziger Ton bis hinunter zum Grund
    ctx.fillStyle = kk.flaeche;
    ctx.beginPath();
    ctx.moveTo(px[0], grund);
    for (let n = 0; n <= n1; n++) ctx.lineTo(px[n], py[n]);
    ctx.lineTo(px[n1], grund);
    ctx.closePath();
    ctx.fill();

    /* Facetten. Das Licht kommt von links, also bleibt die linke Flanke jedes
       Gipfels im Grundton und die rechte bekommt eine eigene, dunklere Fläche.
       Die Kante zwischen beiden läuft senkrecht durch den Gipfel. */
    ctx.fillStyle = kk.schatten;
    ctx.beginPath();
    for (let n = 0; n < n1; n++){
      if (py[n+1] <= py[n]) continue;         // steigt an, liegt im Licht
      ctx.moveTo(px[n], py[n]);
      ctx.lineTo(px[n+1], py[n+1]);
      ctx.lineTo(px[n+1], grund);
      ctx.lineTo(px[n], grund);
      ctx.closePath();
    }
    ctx.fill();

    /* Schneekappen, nur auf den hohen Gipfeln. Auch sie sind zwei Flächen mit
       einer harten Kante, sonst fielen sie aus der Machart heraus. */
    if (kk.schnee){
      for (let n = 1; n < n1; n++){
        if (!(py[n] < py[n-1] && py[n] < py[n+1])) continue;   // kein Gipfel
        if (grund - py[n] < kk.schneeAb*K) continue;           // zu niedrig
        const lx = px[n] + (px[n-1] - px[n])*0.30, ly = py[n] + (py[n-1] - py[n])*0.30;
        const rx = px[n] + (px[n+1] - px[n])*0.22, ry = py[n] + (py[n+1] - py[n])*0.22;
        const mx = (lx + rx)/2, my = Math.max(ly, ry) + 0.10*K;
        ctx.fillStyle = kk.schnee;
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(px[n], py[n]); ctx.lineTo(rx, ry); ctx.lineTo(mx, my);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = kk.schneeSchatten;
        ctx.beginPath();
        ctx.moveTo(px[n], py[n]); ctx.lineTo(rx, ry); ctx.lineTo(mx, my);
        ctx.closePath(); ctx.fill();
      }
    }

    // Dünne helle Linie auf der Lichtseite, das einzige Licht im Hintergrund
    if (kk.kante){
      ctx.strokeStyle = kk.kante;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let n = 0; n < n1; n++){
        if (py[n+1] > py[n]) continue;        // Schattenseite bleibt ohne Linie
        ctx.moveTo(px[n],   py[n]   + 0.7);
        ctx.lineTo(px[n+1], py[n+1] + 0.7);
      }
      ctx.stroke();
    }

    /* Nadelwald auf dem Kamm des Vorbergs. Kleine Zacken im selben Ton wie die
       Fläche darunter, hell auf der Licht-, dunkel auf der Schattenseite.
       Das gibt der nächsten Kette eine andere Kante als den fernen und hält
       sie trotzdem ruhig. */
    if (kk.saum){
      for (let d = 0; d < 2; d++){
        ctx.fillStyle = d ? kk.schatten : kk.flaeche;
        ctx.beginPath();
        for (let n = 0; n < n1; n++){
          if ((py[n+1] > py[n]) !== (d === 1)) continue;
          const j = (((i0 + n) % kk.punkte) + kk.punkte) % kk.punkte;
          const breit = px[n+1] - px[n];
          const anzahl = Math.max(1, Math.round(breit/9));
          for (let s = 0; s < anzahl; s++){
            const t = (s + 0.5)/anzahl;
            const bx = px[n] + breit*t;
            const by = py[n] + (py[n+1] - py[n])*t;
            const bh = kk.saum * (0.55 + hash(j*31 + s*7, s*13 + kk.kern));
            ctx.moveTo(bx - 3.1, by + 1.5);
            ctx.lineTo(bx,       by - bh);
            ctx.lineTo(bx + 3.1, by + 1.5);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
    }
  }

  /* Ganz unten derselbe Dunst noch einmal dünn darüber. Damit verliert auch der
     Vorberg seinen Fuss, und das eigene Gelände setzt gleich darunter mit
     vollem Ton an. */
  const talDunst = ctx.createLinearGradient(0, grund - 3.4*K, 0, grund);
  talDunst.addColorStop(0, 'rgba(198,205,207,0)');
  talDunst.addColorStop(1, 'rgba(198,205,207,.38)');
  ctx.fillStyle = talDunst;
  ctx.fillRect(0, grund - 3.4*K, W, 3.4*K);
}

const BASIS_TON = {
  fels:'#57545f',   felsHell:'#6e6b78',   felsDunkel:'#3c3945',
  stahl:'#4d5a68',  stahlHell:'#8394a3',  stahlDunkel:'#333d49',
  holz:'#8a5f36',   holzHell:'#b17d47',   holzDunkel:'#5d3f22',
  blech:'#3f6270',  blechHell:'#5c8b9d',
  rost:'#c8722c',
  glut:'#8a5a22',   glutHell:'#c9903a',   licht:'#ffd479',
  halde:'#6f6555',  haldeHell:'#8c8069',  haldeDunkel:'#544c40',
  kante:'rgba(255,238,205,.55)',
  schild:'#241d2c', schildHell:'#332a3e',
  tief:'#1a1410',
};

/* Das Bergwerk auf der Terrasse: Foerderturm ueber dem beleuchteten Mundloch,
   Maschinenhaus an der Flanke, Verladerampe mit Halde daneben. Alles in
   Weltkoordinaten, damit es mit der Kamera mitwandert.
   Masse: rund 4,8 Kacheln breit, 3,7 Kacheln hoch. Levi ist 24 x 31 Pixel gross
   und steht beim Start genau in der Oeffnung. */

function zeichneHaus(){
  const bod = basisY()*K - kamera.y;            // Bodenlinie der Terrasse
  const pc  = (BASIS_X + 0.35)*K - kamera.x;    // Mitte des Mundlochs, dort steht Levi
  // Ausserhalb des Bildes gibt es nichts zu zeichnen
  if (pc < -300 || pc > W + 300 || bod < -420 || bod > H + 80) return;

  const t = performance.now()/1000;
  const F = BASIS_TON;

  /* Eine Flaeche aus Eckpunkten, ein Ton, harte Kanten */
  const fl = (farbe, punkte) => {
    ctx.fillStyle = farbe;
    ctx.beginPath();
    ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.closePath();
    ctx.fill();
  };
  /* Ein Linienzug, meist die helle Kante auf der Lichtseite */
  const li = (farbe, dicke, punkte) => {
    ctx.strokeStyle = farbe;
    ctx.lineWidth = dicke;
    ctx.beginPath();
    ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  };
  const kasten = (farbe, x0, y0, x1, y1) => fl(farbe, [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
  /* Halbe Breite des Foerderturms auf Hoehe dy ueber dem Boden */
  const bein = dy => 44 - 28*dy/104;
  /* Hoehe der Verladerampe an dieser Stelle */
  const rampe = x => bod - 1 + (x - (pc-34)) * 0.5;

  /* ---------------------------- Bodenschatten ---------------------------- */
  ctx.fillStyle = 'rgba(0,0,0,.26)';
  ctx.fillRect(pc - 114, bod, 236, 6);

  /* ------------------- Verladerampe und Halde, links --------------------- */
  // Stuetzen zuerst, die Halde deckt ihre Fuesse spaeter zu
  for (const sx of [pc-50, pc-70, pc-90]){
    kasten(F.holzDunkel, sx-3.5, rampe(sx)+3, sx+3.5, bod);
    li(F.kante, 1, [[sx-3.5, rampe(sx)+4],[sx-3.5, bod]]);
  }
  // Rampendeck, darueber kippt die Lore das Taube auf die Halde
  fl(F.holz, [[pc-34,bod-1],[pc-96,bod-32],[pc-96,bod-26],[pc-34,bod+5]]);
  li(F.kante, 1.4, [[pc-34,bod-0.4],[pc-96,bod-31.4]]);
  li(F.stahlHell, 1.4, [[pc-36,bod-3],[pc-94,bod-32]]);

  // Halde: zwei Flaechen an einer Gratlinie, links Licht, rechts Schatten
  fl(F.haldeDunkel, [[pc-64,bod],[pc-52,bod-9],[pc-38,bod]]);
  fl(F.haldeHell,   [[pc-114,bod],[pc-94,bod-18],[pc-84,bod]]);
  fl(F.halde,       [[pc-84,bod],[pc-94,bod-18],[pc-56,bod]]);
  li(F.kante, 1.3, [[pc-113,bod],[pc-94,bod-17]]);
  // Ausgekipptes Erz, die Lage haengt am hash und bleibt darum stehen
  for (let i = 0; i < 11; i++){
    const u = (i + 0.5)/11;
    const hoehe = (u < 0.4 ? u/0.4 : (1-u)/0.6) * 14;
    ctx.fillStyle = [MATERIAL.erz.farbe, MATERIAL.kupfer.farbe, MATERIAL.gold.farbe][i % 3];
    ctx.fillRect(pc - 112 + u*54, bod - 2.5 - hash(i*13+3, 7)*hoehe, 3, 3);
  }

  // Lore auf der Rampe, sie steht schraeg wie das Deck
  ctx.save();
  ctx.translate(pc-54, rampe(pc-54));
  ctx.rotate(0.464);
  fl(F.stahl,       [[-11,-15],[11,-15],[9,-3],[-9,-3]]);
  fl(F.stahlHell,   [[-11,-15],[-6,-15],[-5,-3],[-9,-3]]);
  fl(F.stahlDunkel, [[-9,-3],[9,-3],[8,-1],[-8,-1]]);
  li(F.kante, 1.4, [[-11,-14.4],[11,-14.4]]);
  ctx.fillStyle = MATERIAL.kupfer.farbe; ctx.fillRect(-7,-18,4,3);
  ctx.fillStyle = MATERIAL.erz.farbe;    ctx.fillRect(-2,-19,4,4);
  ctx.fillStyle = MATERIAL.gold.farbe;   ctx.fillRect(3,-18,3,3);
  ctx.fillStyle = F.stahlDunkel;
  ctx.beginPath(); ctx.arc(-6,0,3,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(6,0,3,0,7); ctx.fill();
  ctx.restore();

  /* ------------------- Maschinenhaus, rechts am Hang --------------------- */
  const mx0 = pc+50, mx1 = pc+120, my0 = bod-52, my1 = bod-60;
  const wandY = x => my0 + (x - mx0) * (my1 - my0)/(mx1 - mx0);
  fl(F.holz,       [[mx0,my0],[mx1,my1],[mx1,bod],[mx0,bod]]);
  fl(F.holzDunkel, [[mx1-18,wandY(mx1-18)],[mx1,my1],[mx1,bod],[mx1-18,bod]]);
  li(F.kante, 1.4, [[mx0+1,my0+2],[mx0+1,bod]]);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fillRect(mx0+23, my0+4, 1.5, 48);
  ctx.fillRect(mx0+46, my0+2, 1.5, 50);
  // Sockel
  fl(F.felsDunkel, [[mx0-3,bod-9],[mx1+3,bod-9],[mx1+3,bod],[mx0-3,bod]]);
  li(F.kante, 1, [[mx0-3,bod-8.4],[mx1+3,bod-8.4]]);
  // Blechdach mit Ueberstand, Deckflaeche heller als die Stirnflaeche
  fl(F.blech,     [[mx0-7,wandY(mx0-7)],[mx1+7,wandY(mx1+7)],[mx1+7,wandY(mx1+7)-6],[mx0-7,wandY(mx0-7)-6]]);
  fl(F.blechHell, [[mx0-7,wandY(mx0-7)-6],[mx1+7,wandY(mx1+7)-6],[mx1+7,wandY(mx1+7)-9],[mx0-7,wandY(mx0-7)-9]]);
  li(F.kante, 1.4, [[mx0-7,wandY(mx0-7)-8.3],[mx1+7,wandY(mx1+7)-8.3]]);

  // Beleuchtetes Maschinenfenster, dahinter laeuft die Foerdermaschine
  const fx = mx0+14, fy = bod-44, fb = 40, fh = 26;
  kasten(F.holzDunkel, fx-3, fy-3, fx+fb+3, fy+fh+3);
  kasten(F.glut, fx, fy, fx+fb, fy+fh);
  ctx.save();
  ctx.beginPath(); ctx.rect(fx, fy, fb, fh); ctx.clip();
  // Fundamentbank, Seiltrommel rechts, Schwungrad links
  kasten(F.stahlDunkel, fx+2, fy+20, fx+fb-2, fy+fh);
  kasten(F.stahlDunkel, fx+22, fy+7, fx+36, fy+21);
  li(F.glutHell, 1.4, [[fx+24, fy+10],[fx+34, fy+10]]);
  li(F.glutHell, 1.4, [[fx+24, fy+14],[fx+34, fy+14]]);
  ctx.fillStyle = F.stahlDunkel;
  ctx.beginPath(); ctx.arc(fx+12, fy+13, 9, 0, 7); ctx.fill();
  ctx.strokeStyle = F.glutHell; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++){
    const a = t*0.55 + i*2.094;
    ctx.beginPath();
    ctx.moveTo(fx+12 + Math.cos(a)*2, fy+13 + Math.sin(a)*2);
    ctx.lineTo(fx+12 + Math.cos(a)*8, fy+13 + Math.sin(a)*8);
    ctx.stroke();
  }
  ctx.fillStyle = F.licht;
  ctx.beginPath(); ctx.arc(fx+12, fy+13, 2.5, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = F.holzDunkel;
  ctx.fillRect(fx + 19, fy, 2.5, fh);
  li(F.kante, 1.2, [[fx, fy+0.8],[fx+fb, fy+0.8]]);
  // Lichtschein aus dem Fenster auf Wand und Vorplatz
  fl('rgba(255,199,110,.10)', [[fx,fy+fh],[fx+fb,fy+fh],[fx+fb+10,bod+6],[fx-10,bod+6]]);

  // Lueftungsrohr und ein bisschen Dampf
  const lx = mx1-24, ly = wandY(lx) - 9;
  kasten(F.stahl,       lx-4, ly-18, lx+4, ly+2);
  kasten(F.stahlHell,   lx-4, ly-18, lx-1.5, ly+2);
  kasten(F.stahlDunkel, lx-7, ly-22, lx+7, ly-18);
  for (let i = 0; i < 3; i++){
    const u = (t*0.32 + i/3) % 1;
    ctx.globalAlpha = 0.24*(1-u);
    ctx.fillStyle = '#dfe7ee';
    ctx.beginPath(); ctx.arc(lx + u*12, ly - 25 - u*26, 3 + u*6, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Kisten am Weg, damit der Vorplatz bewohnt wirkt
  fl(F.holz,     [[pc+56,bod-13],[pc+72,bod-13],[pc+72,bod],[pc+56,bod]]);
  fl(F.holzHell, [[pc+56,bod-13],[pc+60,bod-13],[pc+60,bod],[pc+56,bod]]);
  li(F.kante, 1.2, [[pc+56,bod-12.4],[pc+72,bod-12.4]]);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(pc+58, bod-8, 12, 1.5);

  /* -------------------- Portalblock mit dem Mundloch --------------------- */
  const kx0 = pc-40, kx1 = pc+40, ky = bod-58;
  fl(F.fels,       [[kx0,ky],[kx1,ky],[kx1,bod],[kx0,bod]]);
  fl(F.felsHell,   [[kx0,ky],[kx0+11,ky],[kx0+11,bod],[kx0,bod]]);
  fl(F.felsDunkel, [[kx1-9,ky],[kx1,ky],[kx1,bod],[kx1-9,bod]]);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fillRect(kx0, bod-40, 80, 1.5);
  ctx.fillRect(kx0, bod-21, 80, 1.5);
  // Kranz oben
  fl(F.felsHell, [[kx0-5,ky-7],[kx1+5,ky-7],[kx1+5,ky],[kx0-5,ky]]);
  li(F.kante, 1.4, [[kx0-5,ky-6.2],[kx1+5,ky-6.2]]);

  // Rahmen aus schweren Balken
  fl(F.holz, [[pc-31,bod],[pc-23,bod],[pc-23,bod-30],[pc-31,bod-34]]);
  fl(F.holz, [[pc+23,bod],[pc+31,bod],[pc+31,bod-34],[pc+23,bod-30]]);
  fl(F.holzHell, [[pc-31,bod-34],[pc-15,bod-47],[pc+15,bod-47],[pc+31,bod-34],
                  [pc+23,bod-30],[pc+15,bod-40],[pc-15,bod-40],[pc-23,bod-30]]);
  li(F.kante, 1.4, [[pc-31,bod-33.4],[pc-15,bod-46.4],[pc+15,bod-46.4],[pc+31,bod-33.4]]);

  // Die Oeffnung selbst, kantig statt rund
  fl(F.tief, [[pc-23,bod],[pc-23,bod-30],[pc-15,bod-40],[pc+15,bod-40],[pc+23,bod-30],[pc+23,bod]]);
  // Licht aus dem Stollen, drei Stufen, jede eine eigene Flaeche
  fl('#3d2a16',  [[pc-22,bod],[pc+22,bod],[pc+14,bod-19],[pc-14,bod-19]]);
  fl(F.glut,     [[pc-20,bod],[pc+20,bod],[pc+12,bod-12],[pc-12,bod-12]]);
  fl(F.glutHell, [[pc-16,bod],[pc+16,bod],[pc+9,bod-6],[pc-9,bod-6]]);
  // Grubenlampe an der Stollenwand
  ctx.fillStyle = 'rgba(255,212,120,.18)';
  ctx.beginPath(); ctx.arc(pc-17.5, bod-25.5, 7, 0, 7); ctx.fill();
  ctx.fillStyle = F.licht;
  ctx.fillRect(pc-19, bod-27, 3, 3);
  // Lichtteppich auf dem Vorplatz
  fl('rgba(255,199,110,.12)', [[pc-21,bod],[pc+21,bod],[pc+29,bod+7],[pc-29,bod+7]]);

  // Aussenlampe ueber dem Eingang
  kasten(F.stahlDunkel, pc-32, bod-53, pc-24, bod-49);
  ctx.fillStyle = F.licht;
  ctx.fillRect(pc-31, bod-49, 6, 2.5);
  fl('rgba(255,212,120,.08)', [[pc-31,bod-46],[pc-25,bod-46],[pc-17,bod],[pc-41,bod]]);

  // Seilfuehrung ueber dem Sturz, hier faehrt der Korb in den Schacht
  kasten(F.stahlDunkel, pc-13, bod-57, pc+13, bod-47);
  kasten(F.stahl,       pc-13, bod-57, pc+13, bod-54);
  li(F.kante, 1.2, [[pc-13,bod-56.4],[pc+13,bod-56.4]]);

  /* ------------------ Foerderturm ueber dem Mundloch --------------------- */
  fl(F.stahl,       [[pc-48,bod],[pc-40,bod],[pc-13,bod-104],[pc-19,bod-104]]);
  fl(F.stahlDunkel, [[pc+40,bod],[pc+48,bod],[pc+19,bod-104],[pc+13,bod-104]]);
  li(F.kante, 1.4, [[pc-46.6,bod],[pc-17.6,bod-104]]);
  // Riegel, das unterste Feld bleibt offen, damit der Eingang frei ist
  for (const dy of [34, 62, 90]){
    const bb = bein(dy) + 3;
    fl(F.stahlDunkel, [[pc-bb,bod-dy],[pc+bb,bod-dy],[pc+bb,bod-dy+4],[pc-bb,bod-dy+4]]);
    li(F.kante, 1, [[pc-bb,bod-dy+0.7],[pc+bb,bod-dy+0.7]]);
  }
  // Andreaskreuze in den oberen Feldern
  ctx.strokeStyle = F.stahlDunkel; ctx.lineWidth = 2;
  for (const [a1, a2] of [[34,62],[62,90],[90,104]]){
    ctx.beginPath();
    ctx.moveTo(pc-bein(a1), bod-a1); ctx.lineTo(pc+bein(a2), bod-a2);
    ctx.moveTo(pc+bein(a1), bod-a1); ctx.lineTo(pc-bein(a2), bod-a2);
    ctx.stroke();
  }
  // Kopfplattform und Lagerboecke
  fl(F.stahl, [[pc-23,bod-104],[pc+23,bod-104],[pc+23,bod-97],[pc-23,bod-97]]);
  li(F.kante, 1.4, [[pc-23,bod-103.3],[pc+23,bod-103.3]]);
  fl(F.stahl, [[pc-17,bod-104],[pc-11,bod-104],[pc-11,bod-118],[pc-17,bod-118]]);
  fl(F.stahl, [[pc+11,bod-104],[pc+17,bod-104],[pc+17,bod-118],[pc+11,bod-118]]);

  // Seilscheibe, dreht sich langsam
  const wy = bod-116, dreh = t*0.55;
  ctx.strokeStyle = F.stahlHell; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(pc, wy, 11, 0, 7); ctx.stroke();
  ctx.fillStyle = F.stahl;
  ctx.beginPath(); ctx.arc(pc, wy, 8, 0, 7); ctx.fill();
  ctx.strokeStyle = F.stahlDunkel; ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++){
    const a = dreh + i*Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(pc + Math.cos(a)*2, wy + Math.sin(a)*2);
    ctx.lineTo(pc + Math.cos(a)*8, wy + Math.sin(a)*8);
    ctx.stroke();
  }
  ctx.fillStyle = F.rost;
  ctx.beginPath(); ctx.arc(pc, wy, 3, 0, 7); ctx.fill();

  // Foerderseil in den Schacht, Antriebsseil zum Maschinenhaus
  li('#2b333d', 1.8, [[pc-6, wy+9],[pc-6, bod-57]]);
  li('#2b333d', 1.8, [[pc+7, wy+8],[mx0+16, wandY(mx0+16)-9]]);

  /* ------------ Schild, auf den Turm geschraubt statt schwebend ---------- */
  fl(F.schild,     [[pc-28,bod-80],[pc+28,bod-80],[pc+28,bod-64],[pc-28,bod-64]]);
  fl(F.schildHell, [[pc-28,bod-80],[pc+28,bod-80],[pc+28,bod-77],[pc-28,bod-77]]);
  ctx.strokeStyle = F.rost; ctx.lineWidth = 1.6;
  ctx.strokeRect(pc-27.2, bod-79.2, 54.4, 14.4);
  ctx.fillStyle = '#ffc63d';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BASIS', pc, bod-67.5);
  ctx.textAlign = 'left';
  ctx.fillStyle = F.stahlHell;
  for (const [nx, ny] of [[pc-24.5,bod-74],[pc+24.5,bod-74],[pc-24.5,bod-68],[pc+24.5,bod-68]]){
    ctx.beginPath(); ctx.arc(nx, ny, 1.3, 0, 7); ctx.fill();
  }

  /* ---------------- Gleis vom Mundloch auf die Rampe -------------------- */
  ctx.fillStyle = F.holzDunkel;
  for (let sx = pc-44; sx <= pc-12; sx += 7) ctx.fillRect(sx, bod+1, 5, 2);
  li(F.stahlHell, 1.3, [[pc-46, bod+0.6],[pc-8, bod+0.6]]);
  li(F.stahlHell, 1.3, [[pc-46, bod+3.4],[pc-8, bod+3.4]]);
}

function zeichneBau(x, y, px, py){
  const b = bau[idx(x,y)];
  if (!b) return;
  if (b & 2){
    ctx.fillStyle = '#3a2f24';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 3, py + 8 + i*9, K-6, 4);
    ctx.fillStyle = '#b9b9c6';
    ctx.fillRect(px + 5, py + 10, K-10, 2.5);
    ctx.fillRect(px + 5, py + K-11, K-10, 2.5);
    if (bau[idx(x, y-1)] & 2 || bau[idx(x, Math.min(HOEHE-1,y+1))] & 2){
      ctx.fillRect(px + 8, py, 2.5, K);
      ctx.fillRect(px + K-11, py, 2.5, K);
    }
  }
  if (b & 1){
    ctx.fillStyle = '#8a5f36';
    ctx.fillRect(px + 2, py, 5, K);
    ctx.fillRect(px + K-7, py, 5, K);
    ctx.fillRect(px + 2, py, K-4, 6);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(px + 2, py + 4, K-4, 2);
    ctx.fillStyle = 'rgba(255,220,150,.14)';
    ctx.fillRect(px + 3, py + 6, 2, K-6);
  }
}

const LEVI = {
  helm:'#e2971b',  helmH:'#ffd25e',  helmD:'#94590c',
  haut:'#e9b083',  hautD:'#a97143',
  jacke:'#35678f', jackeH:'#5f9dcb', jackeD:'#1d3a58',
  hose:'#3d4a68',  hoseD:'#2f3950',  stiefel:'#3b4150',
  guertel:'#8f5a20',
  sack:'#4c5b39',  sackD:'#2e3722',
  stiel:'#8a5f36', metall:'#c9ced8', metallH:'#f4f7fb', metallD:'#6b717d',
  licht:'#fff3c0',
  pod:'#cf7c1c',   podH:'#ffb14b',   podD:'#8a4c10',  rahmen:'#2a2531',
  glas:'#2b6f8c',  glasH:'#9ee6ff',
  stahl:'#b7bdc8', stahlD:'#5b616d',
  flammeA:'#ff8a1e', flammeB:'#ffe07a',
};

/* Eine Flaeche mit harten Kanten, ein einziger Ton. Punkte als [x,y]-Paare. */
function flaeche(punkte, farbe){
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.moveTo(punkte[0][0], punkte[0][1]);
  for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
  ctx.closePath();
  ctx.fill();
}

/* Die duenne helle Linie auf der Lichtseite. Offener Zug, kein Umriss:
   ein voller Umriss wuerde die Figur bei 24 Pixeln zukleben. */
function lichtLinie(punkte, farbe, breite){
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.beginPath();
  ctx.moveTo(punkte[0][0], punkte[0][1]);
  for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
  ctx.stroke();
}

/* Der Lampenschein leuchtet in Blickrichtung, nicht rundum. Ein flacher Kegel
   plus ein kleiner Hof direkt an der Lampe, damit Levi nicht vor schwarzem
   Nichts steht. Liegt hinter der Figur, sonst waescht das Licht sie aus. */
function zeichneLampenschein(cx, py, b, h){
  const nachVorn = P.blick;
  const lx = cx + nachVorn * b * (S.imFahrzeug ? 0.54 : 0.38);
  const ly = py + h * (S.imFahrzeug ? 0.39 : 0.14);
  const R  = K * (LAMPEN[S.lampe].weite * 0.62 + (S.imFahrzeug ? 1.4 : 0));

  // Radialer Abfall innerhalb des Kegels: laengs allein liess die beiden
  // Schraegen als harte Kanten stehen.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lx - nachVorn*2, ly - 3);
  ctx.lineTo(lx + nachVorn*R, ly - R*0.50);
  ctx.lineTo(lx + nachVorn*R, ly + R*0.62);
  ctx.lineTo(lx - nachVorn*2, ly + 3);
  ctx.closePath();
  ctx.clip();
  const kegel = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
  kegel.addColorStop(0,    'rgba(255,228,152,.30)');
  kegel.addColorStop(0.45, 'rgba(255,216,132,.12)');
  kegel.addColorStop(1,    'rgba(255,210,120,0)');
  ctx.fillStyle = kegel;
  ctx.fillRect(lx - R, ly - R, R*2, R*2);
  ctx.restore();

  const hof = ctx.createRadialGradient(lx, ly, 0, lx, ly, K*1.7);
  hof.addColorStop(0, 'rgba(255,236,180,.26)');
  hof.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = hof;
  ctx.beginPath(); ctx.arc(lx, ly, K*1.7, 0, 7); ctx.fill();
}

/* Ein Bein als zwei Flaechen: Hosenbein und Stiefel. Der Fuss wandert beim
   Laufen, die Huefte bleibt stehen, dadurch entsteht der Schritt. */
function zeichneBein(hx, fx, y0, y1, farbe){
  const d = 3.2;
  flaeche([[hx-d, y0], [hx+d, y0], [hx+fx+d, y1-3.4], [hx+fx-d, y1-3.4]], farbe);
  flaeche([[hx+fx-d-0.6, y1-3.6], [hx+fx+d, y1-3.6],
           [hx+fx+d+3.0, y1],     [hx+fx-d-0.6, y1]], LEVI.stiefel);
}

/* Der Bergmann. Getragen wird die Figur von drei grossen Formen: Helm mit
   vorspringendem Schirm, breiter Rumpf, dunkle Beine. Alles Weitere ist
   Beiwerk und darf bei 24 Pixeln ruhig verschwimmen. */
function zeichneBergmann(b, h, takt, laeuft){
  const wippe    = laeuft ? (Math.abs(takt) - 0.5) * 1.1 : 0;
  const schulter = 0.395*h + wippe;
  const huefte   = 0.665*h + wippe;

  // Rucksack, dunkel und hinten: er macht die Silhouette unverwechselbar
  flaeche([[-0.30*b, 0.42*h+wippe], [-0.60*b, 0.47*h+wippe],
           [-0.58*b, 0.66*h+wippe], [-0.28*b, 0.68*h+wippe]], LEVI.sack);
  flaeche([[-0.59*b, 0.58*h+wippe], [-0.58*b, 0.66*h+wippe],
           [-0.28*b, 0.68*h+wippe], [-0.29*b, 0.60*h+wippe]], LEVI.sackD);
  lichtLinie([[-0.30*b, 0.425*h+wippe], [-0.59*b, 0.475*h+wippe]],
             'rgba(255,238,205,.40)', 1.2);

  // Beine, hinten dunkler als vorn
  zeichneBein(-0.19*b, -takt*0.19*b, huefte-1, h, LEVI.hoseD);
  zeichneBein( 0.13*b,  takt*0.19*b, huefte-1, h, LEVI.hose);

  // Rumpf: breite Schulter, schmale Huefte
  flaeche([[-0.46*b, schulter], [ 0.42*b, schulter],
           [ 0.35*b, huefte],   [-0.37*b, huefte]], LEVI.jacke);
  flaeche([[-0.46*b, schulter], [-0.15*b, schulter],
           [-0.13*b, huefte],   [-0.37*b, huefte]], LEVI.jackeD);
  flaeche([[ 0.20*b, schulter], [ 0.42*b, schulter],
           [ 0.35*b, huefte],   [ 0.18*b, huefte]], LEVI.jackeH);
  lichtLinie([[-0.42*b, schulter+0.9], [0.39*b, schulter+0.9]],
             'rgba(255,244,220,.45)', 1.3);

  // Guertel, schmal gehalten: ein breites Band schneidet die Figur in zwei
  flaeche([[-0.34*b, huefte-2.4], [0.32*b, huefte-2.4],
           [ 0.31*b, huefte-0.2], [-0.33*b, huefte-0.2]], LEVI.guertel);
  flaeche([[ 0.07*b, huefte-2.2], [0.17*b, huefte-2.2],
           [ 0.165*b, huefte-0.4], [0.065*b, huefte-0.4]], LEVI.metall);

  // Gesicht: zwei Flaechen Haut und ein Schnauzer als einzige Binnenzeichnung.
  // Unter dem Schirm bleiben knapp vier Pixel Hoehe, ein Auge kaeme darin
  // nicht mehr als Auge an, sondern als Schmutzfleck.
  const kopfO = 0.225*h + wippe, kopfU = 0.425*h + wippe;
  flaeche([[-0.24*b, kopfO], [0.30*b, kopfO], [0.26*b, kopfU], [-0.20*b, kopfU]], LEVI.haut);
  flaeche([[-0.24*b, kopfO], [-0.04*b, kopfO], [-0.02*b, kopfU], [-0.20*b, kopfU]], LEVI.hautD);

  // Helm: Kuppel, helle Facette vorn oben, dunkle hinten, kurzer Schirm nach vorn.
  // Die Kuppel bleibt schmaler als der Rumpf, sonst wird aus dem Helm ein Hut.
  flaeche([[-0.42*b, 0.250*h+wippe], [-0.40*b, 0.115*h+wippe], [-0.22*b, 0.022*h+wippe],
           [ 0.10*b, 0.004*h+wippe], [ 0.36*b, 0.080*h+wippe], [ 0.40*b, 0.180*h+wippe],
           [ 0.38*b, 0.250*h+wippe]], LEVI.helm);
  flaeche([[-0.22*b, 0.022*h+wippe], [ 0.10*b, 0.004*h+wippe], [0.36*b, 0.080*h+wippe],
           [ 0.18*b, 0.110*h+wippe], [-0.13*b, 0.090*h+wippe]], LEVI.helmH);
  flaeche([[-0.42*b, 0.250*h+wippe], [-0.40*b, 0.115*h+wippe], [-0.22*b, 0.022*h+wippe],
           [-0.15*b, 0.090*h+wippe], [-0.26*b, 0.250*h+wippe]], LEVI.helmD);
  // Kurzer Schirm. Ragt er weiter vor, wird aus dem Helm ein Schnabel.
  flaeche([[-0.28*b, 0.222*h+wippe], [ 0.44*b, 0.232*h+wippe],
           [ 0.42*b, 0.276*h+wippe], [-0.28*b, 0.270*h+wippe]], LEVI.helmD);
  lichtLinie([[-0.20*b, 0.030*h+wippe], [0.10*b, 0.013*h+wippe], [0.35*b, 0.081*h+wippe]],
             'rgba(255,248,215,.70)', 1.3);
  lichtLinie([[-0.24*b, 0.230*h+wippe], [0.42*b, 0.239*h+wippe]],
             'rgba(255,240,200,.30)', 1.1);

  // Helmlampe, sie sitzt auf der Helmfront und zeigt die Blickrichtung an
  flaeche([[0.22*b, 0.112*h+wippe], [0.42*b, 0.098*h+wippe],
           [0.43*b, 0.176*h+wippe], [0.23*b, 0.186*h+wippe]], LEVI.metallD);
  flaeche([[0.33*b, 0.106*h+wippe], [0.42*b, 0.100*h+wippe],
           [0.43*b, 0.170*h+wippe], [0.34*b, 0.178*h+wippe]], LEVI.licht);

  // Vorderer Arm: beim Graben haelt er den Pickel, sonst schwingt er mit
  const sx = 0.26*b, sy = schulter + 2;
  const handX = P.grabt ? 0.34*b : 0.24*b + takt*0.13*b;
  const handY = P.grabt ? 0.50*h + wippe : 0.60*h + wippe;
  flaeche([[sx-3.4, sy-1.4], [sx+3.2, sy-2.2],
           [handX+2.8, handY], [handX-2.6, handY+1.6]], LEVI.jacke);
  lichtLinie([[sx+2.6, sy-1.8], [handX+2.2, handY+0.2]], 'rgba(255,244,220,.35)', 1.1);

  if (P.grabt){
    // Der Pickel schlaegt aus der Schulter nach vorn unten, gefuehrt von P.schwung
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(Math.sin(P.schwung)*0.55 + 0.30);
    flaeche([[-2.2, 2.6], [0.6, 3.8], [9.8, -8.8], [7.2, -10.6]], LEVI.stiel);
    lichtLinie([[-1.0, 2.0], [8.4, -9.4]], 'rgba(255,226,178,.45)', 1.1);
    // Der Kopf ist eine schmale Spitze, keine Flaeche: breiter Stahl frisst
    // bei dieser Groesse die halbe Figur auf
    flaeche([[5.2, -13.8], [16.2, -5.4], [7.0, -9.2]], LEVI.metall);
    lichtLinie([[5.4, -13.4], [15.8, -5.6]], 'rgba(244,247,251,.85)', 1.2);
    ctx.restore();
  }
}

/* Das Bohrfahrzeug: ein kantiger Rumpf, vorn die Kanzel, unten der Bohrkopf.
   Keine runden Formen, damit es neben dem Gestein als Geraet lesbar bleibt. */

/* Das bestehende Bohrfahrzeug, unveraendert. Der Entwurf aus dem Faecher
   wurde nicht uebernommen: die Eigenstaendigkeitspruefung sah darin das
   bekannteste Einzelobjekt des Vorbilds nachgebildet, nicht dessen Machart. */
function zeichneMeinFahrzeug(px, py, b, h, cx){

    // Bohrfahrzeug
    ctx.fillStyle = '#c8791f';
    ctx.beginPath();
    ctx.roundRect(px - 4, py - 3, b + 8, h + 2, 7);
    ctx.fill();
    ctx.fillStyle = '#8f5312';
    ctx.fillRect(px - 4, py + h*0.62, b + 8, h*0.34);
    ctx.fillStyle = '#7fd4ff';
    ctx.beginPath(); ctx.arc(cx + P.blick*3, py + h*0.3, b*0.28, 0, 7); ctx.fill();
    // Bohrkopf
    ctx.fillStyle = '#d8d8e4';
    ctx.beginPath();
    ctx.moveTo(cx - 7, py + h + 1);
    ctx.lineTo(cx + 7, py + h + 1);
    ctx.lineTo(cx, py + h + 12);
    ctx.closePath(); ctx.fill();
    if (P.grabt){
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 2;
      const w = P.schwung;
      ctx.beginPath(); ctx.arc(cx, py + h + 6, 7, w, w + 2.4); ctx.stroke();
    }
    // Rader
    ctx.fillStyle = '#26222c';
    ctx.beginPath(); ctx.arc(px + 2, py + h - 1, 5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(px + b - 2, py + h - 1, 5, 0, 7); ctx.fill();
}

function zeichneLevi(){
  const px = P.x*K - kamera.x, py = P.y*K - kamera.y;
  const b = P.b*K, h = P.h*K;
  const cx = px + b/2;
  const laeuft = P.amBoden && Math.abs(P.vx) > 0.6;
  const takt   = laeuft ? Math.sin(performance.now()/70) : 0;

  zeichneLampenschein(cx, py, b, h);

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(cx, py + h + 2, b*0.55, 4, 0, 0, 7); ctx.fill();

  // Alles wird nach rechts gezeichnet und fuer den Blick nach links gespiegelt.
  // So liegt das Licht immer auf der Seite, in die Levi schaut.
  if (S.imFahrzeug){
    zeichneMeinFahrzeug(px, py, b, h, cx);      // rechnet in absoluten Koordinaten
  } else {
    ctx.save();
    ctx.translate(cx, py);
    ctx.scale(P.blick < 0 ? -1 : 1, 1);
    zeichneBergmann(b, h, takt, laeuft);
    ctx.restore();
  }
}

function zeichneDunkelheit(){
  // Tiefe unter der Bergoberflaeche der eigenen Spalte, nicht unter der Basis.
  // Sonst bleibt es hell, wenn Levi waagrecht in die Flanke graebt.
  const cx = Math.max(0, Math.min(BREITE-1, Math.floor(P.x + P.b/2)));
  const t = (P.y + P.h/2) - ober[cx];
  const a = Math.max(0, Math.min(0.90, (t/14) * 0.90));
  if (a < 0.02) return;
  dctx.clearRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'source-over';
  dctx.fillStyle = `rgba(3,2,7,${a})`;
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  const sx = (P.x + P.b/2)*K - kamera.x, sy = (P.y + P.h/2)*K - kamera.y;
  const r = K * (LAMPEN[S.lampe].weite + (S.imFahrzeug ? 1.6 : 0));
  const g = dctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  // Innen alles voll sichtbar, danach ein schleichender Abfall. Die Stufen
  // werden gerechnet statt von Hand gesetzt: wenige Marken erzeugen sichtbare
  // Ringe, viele mit weicher Kurve blenden aus, ohne eine Kante zu zeigen.
  const KERN = 0.38;
  g.addColorStop(0,    'rgba(0,0,0,1)');
  g.addColorStop(KERN, 'rgba(0,0,0,1)');
  for (let n = 1; n <= 14; n++){
    const s = KERN + (1 - KERN) * (n/14);
    const u = n/14;
    const w = (1 - u) * (1 - u) * (1 - u*0.35);   // weich auslaufend
    g.addColorStop(Math.min(1, s), `rgba(0,0,0,${w.toFixed(3)})`);
  }
  g.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = g;
  dctx.beginPath(); dctx.arc(sx, sy, r, 0, 7); dctx.fill();
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(dunkel, 0, 0);
}

function zeichne(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  if (beben > 0.05){
    ctx.translate((Math.random()-0.5)*beben, (Math.random()-0.5)*beben);
  }

  // Untergrund-Hintergrund nach Tiefe
  const tOben = Math.max(0, (kamera.y/K) - FUSS);
  const [r,g,b] = tiefenFarbe(tOben);
  ctx.fillStyle = `rgb(${r*0.55|0},${g*0.55|0},${b*0.55|0})`;
  ctx.fillRect(0, 0, W, H);

  if (kamera.y < FUSS*K) zeichneHimmel();

  const x0 = Math.max(0, Math.floor(kamera.x/K));
  const x1 = Math.min(BREITE-1, Math.ceil((kamera.x + W)/K));
  const y0 = Math.max(0, Math.floor(kamera.y/K));
  const y1 = Math.min(HOEHE-1, Math.ceil((kamera.y + H)/K));

  for (let y = y0; y <= y1; y++){
    const py = y*K - kamera.y;
    for (let x = x0; x <= x1; x++){
      const px = x*K - kamera.x;
      const typ = boden[idx(x,y)];
      if (typ === LEER){
        // Hohlraum nur zeichnen, wo er im Berg liegt, sonst scheint der Himmel durch
        if (y >= ober[x]){
          const [cr,cg,cb] = tiefenFarbe(Math.max(0, y - FUSS));
          ctx.fillStyle = `rgb(${cr*0.13|0},${cg*0.12|0},${cb*0.11|0})`;
          ctx.fillRect(px, py, K, K);
        }
        zeichneBau(x, y, px, py);
        if (!stabil(x,y)){
          const stark = broeckelt.some(bb => bb.x === x && bb.y === y);
          ctx.strokeStyle = stark ? 'rgba(255,120,90,.75)' : 'rgba(200,90,70,.20)';
          ctx.lineWidth = stark ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(px + K*0.2, py + 2); ctx.lineTo(px + K*0.42, py + K*0.34);
          ctx.lineTo(px + K*0.28, py + K*0.52);
          ctx.moveTo(px + K*0.72, py + 2); ctx.lineTo(px + K*0.6, py + K*0.3);
          ctx.stroke();
        }
        continue;
      }
      // Acht Nachbarn, reduziert auf einen von 47 Randfaellen
      let maske = 0;
      if (!fest(x,   y-1)) maske |= 1;
      if (!fest(x+1, y-1)) maske |= 2;
      if (!fest(x+1, y  )) maske |= 4;
      if (!fest(x+1, y+1)) maske |= 8;
      if (!fest(x,   y+1)) maske |= 16;
      if (!fest(x-1, y+1)) maske |= 32;
      if (!fest(x-1, y  )) maske |= 64;
      if (!fest(x-1, y-1)) maske |= 128;
      const fall = randFall[maske];
      // Grundart der Kachel selbst, nicht des Tiefenbands
      const grundTyp = GRUNDART[typ === GAS ? tarnung(y) : typ] || tarnung(y);

      if (fall > 0 && randBild[grundTyp]){
        // Randkachel: der Uebergang steckt im Bild, kein Untergrund darunter
        ctx.drawImage(randBild[grundTyp][fall], px, py);
      } else {
        // Innen im Gestein: durchgehender Untergrund nach Weltkoordinaten
        const grund = grundBild[grundTyp];
        if (grund){
          const gx = (((x % GRUND_KACHELN) + GRUND_KACHELN) % GRUND_KACHELN) * K;
          const gy = (((y % GRUND_KACHELN) + GRUND_KACHELN) % GRUND_KACHELN) * K;
          ctx.drawImage(grund, gx, gy, K, K, px, py, K, K);
        }
      }
      // Nur noch Erz und Fundstuecke legen einen Fleck. Gewoehnliches Gestein
      // traegt der Untergrund seiner eigenen Art, das laesst keine Kachel stehen.
      const zTyp = typ === GAS ? tarnung(y) : typ;
      const gg = GESTEIN[zTyp];
      if (gg.erz || gg.schatz){
        const bilder = kachelBild[zTyp];
        if (bilder) ctx.drawImage(bilder[(hash(x,y)*VARIANTEN)|0], px, py);
      }
      // Erdkamm auf jede freiliegende Oberkante. Die Zeile darueber ist
      // bereits gezeichnet, darum genuegt ein Durchgang. Bricht die Treppe
      // der Bergflanke und laesst Stollenboeden gegraben aussehen.
      if (maske & 1){
        ctx.fillStyle = GESTEIN[typ === GAS ? tarnung(y) : typ].farbe;
        ctx.beginPath();
        ctx.moveTo(px, py + 3);
        for (let n = 0; n <= 4; n++){
          ctx.lineTo(px + n*K/4, py - hash(x*7 + n*3, y*13 + n) * K*0.28);
        }
        ctx.lineTo(px + K, py + 3);
        ctx.closePath();
        ctx.fill();
        // duenne helle Linie auf der Oberkante, sie traegt die Lichtstimmung
        ctx.strokeStyle = 'rgba(255,236,200,.30)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let n = 0; n <= 4; n++){
          const hx = px + n*K/4, hy = py - hash(x*7 + n*3, y*13 + n) * K*0.28;
          if (n) ctx.lineTo(hx, hy); else ctx.moveTo(hx, hy);
        }
        ctx.stroke();
      }
      // zuletzt die vorspringenden Ecken abrunden, damit sie ueber allem liegen
    }
  }

  // Grabfortschritt
  if (P.grabt && P.zx >= 0){
    const typ = art(P.zx, P.zy);
    if (typ !== LEER && GESTEIN[typ]){
      const arbeit = 0.34 + 0.36*GESTEIN[typ].haerte;
      const anteil = Math.max(0, Math.min(1, P.fortschritt/arbeit));
      const px = P.zx*K - kamera.x, py = P.zy*K - kamera.y;
      ctx.strokeStyle = 'rgba(255,220,120,.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, K-2, K-2);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(px + 4, py + K - 9, K - 8, 5);
      ctx.fillStyle = '#ffc63d';
      ctx.fillRect(px + 4, py + K - 9, (K - 8)*anteil, 5);
    }
  }

  zeichneHaus();

  // Funken
  for (const f of funken){
    ctx.globalAlpha = Math.max(0, f.leben/f.max);
    ctx.fillStyle = f.farbe;
    ctx.fillRect(f.x*K - kamera.x, f.y*K - kamera.y, f.gr, f.gr);
  }
  ctx.globalAlpha = 1;

  zeichneLevi();
  zeichneDunkelheit();

  // Tiefenlinie am rechten Rand
  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  for (let y = Math.ceil(y0/10)*10; y <= y1; y += 10){
    if (y < FUSS) continue;
    const py = y*K - kamera.y;
    ctx.fillRect(W - 46, py, 30, 1);
    ctx.fillText((y-FUSS)*METER + ' m', W - 50, py + 4);
  }
  ctx.textAlign = 'left';
}

/* ========================================================================== */
/*                                   HUD                                      */
/* ========================================================================== */

function hud(){
  const berg = BERGE[S.bergNr];
  const tiefe = Math.max(0, Math.round((P.y + P.h - FUSS) * METER));
  document.getElementById('bergName').textContent = berg.name;
  document.getElementById('tiefe').textContent = tiefe + ' m';
  document.getElementById('goldZahl').textContent = zahl(S.gold);
  document.getElementById('franken').textContent = 'CHF ' + zahl(S.gold*FRANKEN);
  document.getElementById('stufe').textContent = stufe();
  document.getElementById('arbeiterZahl').textContent = arbeiter();
  const zf = document.getElementById('zeitFeld');
  if (zf){
    const grenze = limitMinuten() * 60;
    zf.hidden = grenze <= 0;
    if (grenze > 0){
      const rest = Math.max(0, Math.ceil(grenze - zeitStand.sekunden));
      document.getElementById('zeitRest').textContent =
        Math.floor(rest/60) + ':' + String(rest % 60).padStart(2, '0');
    }
  }

  const leben = Math.round(S.leben);
  document.getElementById('zustandText').textContent = leben + ' %';
  const zb = document.getElementById('zustandBalken');
  zb.style.width = leben + '%';
  zb.className = 'fuellung ' + (leben < 35 ? 'warn' : 'gruen');

  const tbox = document.getElementById('treibstoffBox');
  tbox.hidden = !S.bohrer;
  if (S.bohrer){
    const t = Math.round(S.treibstoff);
    document.getElementById('treibstoffText').textContent = t;
    const tb = document.getElementById('treibstoffBalken');
    tb.style.width = t + '%';
    tb.className = 'fuellung ' + (t < 25 ? 'warn' : 'blau');
  }

  const menge = frachtMasse(), kap = kapazitaet();
  document.getElementById('frachtText').textContent = menge + ' / ' + kap;
  const fb = document.getElementById('frachtBalken');
  fb.style.width = (menge/kap*100) + '%';
  fb.className = 'fuellung ' + (menge >= kap ? 'warn' : 'orange');

  document.getElementById('fracht').innerHTML = MATS
    .filter(m => S.fracht[m] > 0)
    .map(m => `<li><i style="background:${MATERIAL[m].farbe}"></i><span>${MATERIAL[m].name}</span><b>${S.fracht[m]}</b></li>`)
    .join('');

  const lk = document.getElementById('lagerKopf');
  if (lk){
    const wert = lagerWert();
    lk.textContent = wert > 0 ? 'Lager im Haus · ' + zahl(wert) + ' Goldstücke wert' : 'Lager im Haus';
  }
  document.getElementById('lager').innerHTML = MATS
    .filter(m => S.lager[m] > 0)
    .map(m => `<li><i style="background:${MATERIAL[m].farbe}"></i><span>${MATERIAL[m].name}</span><b>${S.lager[m]}</b></li>`)
    .join('');

  document.getElementById('werkzeuge').innerHTML = WERKZEUG.map(w => {
    const rest = S.werkzeuge[w.id] || 0;
    const anteil = Math.round(rest / w.halt * 100);
    const aktiv = !S.imFahrzeug && rest > 0 && bestesWerkzeug(w.haerte) === w;
    return `<div class="karte ${rest ? '' : 'leer'} ${aktiv ? 'aktiv' : ''}">
      <b>${w.kurz}</b>Härte ${w.haerte}
      <div class="rille"><i class="fuellung ${anteil < 25 ? 'warn' : 'gruen'}" style="width:${anteil}%"></i></div>
    </div>`;
  }).join('');

  document.getElementById('vorrat').innerHTML = [
    ['Dynamit', S.dynamit, 'F'],
    ['Leitern', S.balken, '␣'],
    ['Schienen', S.schienen, 'R'],
    ['Seilwinde', S.seilwinde, 'L'],
    ['Lampe', (S.lampe+1) + '/' + LAMPEN.length, 'K'],
    ['Fahrzeug', S.bohrer ? (S.imFahrzeug ? 'AN' : 'aus') : '–', 'V'],
  ].map(([n, v, t]) => `<div class="vorratKarte ${v === 0 || v === '–' ? 'null' : ''}"><b>${v}</b>${n} <kbd>${t}</kbd></div>`).join('');
}

/* ========================================================================== */
/*                                 Fenster                                    */
/* ========================================================================== */

const schleier = document.getElementById('schleier');
document.getElementById('fensterZu').onclick = fensterZu;
schleier.addEventListener('click', e => { if (e.target === schleier) fensterZu(); });

/* Ein einziger Zuhoerer fuer alle Fensterknoepfe, sonst summieren sie sich
   bei jedem Oeffnen und ein Kauf wird mehrfach abgebucht. */
document.getElementById('fensterInhalt').addEventListener('click', e => {
  const knopf = e.target.closest('button');
  if (!knopf || knopf.disabled) return;
  const {kauf, verkauf, berg, tat} = knopf.dataset;
  if (kauf) kaufe(kauf);
  else if (verkauf) verkaufe(verkauf);
  else if (berg !== undefined) wechsleBerg(+berg);
  else if (tat) tueEs(tat);
});

function fenster(titel, html){
  const kopf = document.getElementById('fensterTitel');
  const inhalt = document.getElementById('fensterInhalt');
  kopf.textContent = titel;
  try { inhalt.innerHTML = html; } catch(e){ inhalt.textContent = ''; }
  // Falls der Browser das Einsetzen von HTML unterbindet, wenigstens den Text zeigen
  if (html && !inhalt.children.length){
    inhalt.textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  schleier.hidden = false;
  for (const k in taste) taste[k] = false;
}

function fensterZu(){ schleier.hidden = true; }

/* --------------------------------- Laden --------------------------------- */

const kommaZahl = n => n.toFixed(1).replace('.', ',');
const ausbauStand = () => AUSBAU.filter(m => S.gekauft.includes(m)).length;

/* Die Lampe ist ein Stufenkauf, Name und Preis haengen davon ab, welche
   Stufe als naechste kommt. Darum wird der Ladeneintrag hier aufgeloest. */
function ladenListe(){
  return LADEN.map(w => {
    if (w.art !== 'lampe') return w;
    const naechste = LAMPEN[S.lampe + 1];
    if (!naechste) return {...w, name:LAMPEN[S.lampe].name, fertig:true, preis:{},
      text:'Die stärkste Lampe brennt schon, ' + kommaZahl(LAMPEN[S.lampe].weite) + ' Kacheln weit.'};
    return {...w, name:naechste.name, preis:naechste.preis,
      text:'Leuchtet ' + kommaZahl(naechste.weite) + ' statt ' + kommaZahl(LAMPEN[S.lampe].weite) +
           ' Kacheln weit. Im Berg siehst du mehr vom Stollen.'};
  });
}

function habeGenug(preis){
  for (const [k, v] of Object.entries(preis)){
    if (k === 'gold'){ if (S.gold < v) return false; }
    else if ((S.lager[k] || 0) < v) return false;
  }
  return true;
}

function preisHtml(preis){
  return '<div class="preis">' + Object.entries(preis).map(([k, v]) => {
    const habe = k === 'gold' ? S.gold : (S.lager[k] || 0);
    const name = k === 'gold' ? 'Goldstücke' : MATERIAL[k].name;
    return `<span class="${habe < v ? 'fehlt' : ''}">${v} ${name}</span>`;
  }).join('') + '</div>';
}

function zeigeLaden(){
  const st = stufe();
  const waren = ladenListe().map(w => {
    const gesperrt = (w.stufe && st < w.stufe) || (w.verdient && S.verdient < w.verdient);
    const schonDa = (w.art === 'einmal' && S[w.id]) || w.fertig;
    const bezahlbar = habeGenug(w.preis);
    let knopfText = 'Kaufen';
    if (schonDa) knopfText = w.fertig ? 'Beste Stufe' : 'Gehört dir';
    else if (w.stufe && st < w.stufe) knopfText = 'Ab Stufe ' + w.stufe;
    else if (w.verdient && S.verdient < w.verdient) knopfText = 'Ab ' + w.verdient + ' verdient';
    else if (!bezahlbar) knopfText = 'Zu teuer';
    const rest = w.art === 'werkzeug' ? ` <small style="color:var(--matt)">(${S.werkzeuge[w.id] || 0} / ${WZ[w.id].halt})</small>` : '';
    return `<div class="ware">
      <div class="kopf2"><b>${w.name}</b>${rest}</div>
      <p>${w.text}</p>
      ${preisHtml(w.preis)}
      <button class="kauf" data-kauf="${w.id}" ${gesperrt || schonDa || !bezahlbar ? 'disabled' : ''}>${knopfText}</button>
    </div>`;
  }).join('');

  const gesamt = lagerWert();
  const allesKnopf = gesamt > 0
    ? `<div class="ware" style="border-color:var(--gold)">
         <div class="kopf2"><b>Alles verkaufen</b><span style="color:var(--gold)">${zahl(gesamt)} Goldstücke</span></div>
         <p>Macht das ganze Lager auf einmal zu Goldstücken. Was du für Werkzeuge brauchst,
         kaufst du danach mit dem Gold.</p>
         <button class="kauf" data-tat="allesVerkaufen">Alles verkaufen</button>
       </div>`
    : '';
  const verkauf = allesKnopf + MATS.filter(m => S.lager[m] > 0).map(m => `
    <div class="ware">
      <div class="kopf2"><b>${MATERIAL[m].name}</b><span style="color:var(--gold)">${S.lager[m]} Stück</span></div>
      <p>${MATERIAL[m].wert} Goldstücke pro Einheit, macht ${S.lager[m]*MATERIAL[m].wert} Goldstücke.</p>
      <button class="kauf zweit" data-verkauf="${m}">Alles verkaufen</button>
    </div>`).join('') || '<p class="hinweis">Das Lager im Haus ist leer. Bring Erz von unten herauf.</p>';

  fenster('Laden an der Basis', `
    <p class="hinweis">${zahl(S.gold)} Goldstücke im Haus, das sind CHF ${zahl(S.gold*FRANKEN)}. Stufe ${st}.
    Ausrüstung ${ausbauStand()} von ${AUSBAU.length}.</p>
    <h3 class="abschnitt">Ausrüstung</h3>
    <div class="gitter">${waren}</div>
    <h3 class="abschnitt">Erz verkaufen</h3>
    <div class="gitter">${verkauf}</div>`);
}

function kaufe(id){
  const w = ladenListe().find(x => x.id === id);
  if (!w || w.fertig || !habeGenug(w.preis)) return;
  for (const [k, v] of Object.entries(w.preis)){
    if (k === 'gold') S.gold -= v; else S.lager[k] -= v;
  }
  if (w.art === 'werkzeug') S.werkzeuge[id] = WZ[id].halt;
  else if (w.art === 'stapel') S[id] += w.anzahl;
  else if (w.art === 'lampe') S.lampe++;
  else S[id] = true;

  const marke = w.art === 'lampe' ? 'lampe' + S.lampe : id;
  if (AUSBAU.includes(marke) && !S.gekauft.includes(marke)){
    S.gekauft.push(marke);
    if (ausbauStand() === AUSBAU.length){
      melde('Die Ausrüstung ist vollständig, alle ' + AUSBAU.length + ' Stücke', 'gold');
      klang('muenze');
    }
  }

  klang('kaufen');
  melde(w.name + ' gekauft', 'gold');
  if (id === 'bohrer') melde('Steig mit V ins Bohrfahrzeug', 'gut');
  hud(); speichere(); zeigeLaden();
}

function verkaufe(m){
  const n = S.lager[m];
  if (!n) return;
  const g = n * MATERIAL[m].wert;
  S.lager[m] = 0; S.gold += g; S.verdient += g;
  klang('muenze');
  melde('+' + g + ' Goldstücke für ' + n + '× ' + MATERIAL[m].name, 'gold');
  pruefeSieg();
  hud(); speichere(); zeigeLaden();
}

/* --------------------------------- Berge --------------------------------- */

function zeigeBerge(){
  const st = stufe();
  const karten = BERGE.map((b, i) => {
    const offen = S.offen.includes(i);
    const hier = S.bergNr === i;
    const zuTief = st < b.stufe;
    const bezahlbar = S.gold >= b.kosten;
    let knopf, aus = false;
    if (hier){ knopf = 'Du bist hier'; aus = true; }
    else if (offen) knopf = 'Hinfahren';
    else if (zuTief){ knopf = 'Ab Stufe ' + b.stufe; aus = true; }
    else if (!bezahlbar){ knopf = b.kosten + ' Goldstücke nötig'; aus = true; }
    else knopf = 'Für ' + b.kosten + ' öffnen';
    return `<div class="ware bergKarte ${hier ? 'hier' : ''} ${offen ? '' : 'zu'}">
      <div class="kopf2"><b>${b.name}</b><span style="color:var(--matt)">Stufe ${b.stufe}</span></div>
      <p>${b.text}</p>
      <button class="kauf ${offen ? 'zweit' : ''}" data-berg="${i}" ${aus ? 'disabled' : ''}>${knopf}</button>
    </div>`;
  }).join('');

  fenster('Die Berge', `
    <p class="hinweis">Jeder neue Berg bringt einen Zusatzarbeiter mit. Deine ${arbeiter()}
    ${arbeiter() === 1 ? 'Arbeiter schafft' : 'Arbeiter schaffen'} auch dann weiter, wenn du woanders gräbst,
    und liefern zusammen ${arbeiter()*(1+stufe())*10} Goldstücke pro Minute ab.</p>
    <div class="gitter">${karten}</div>`);
}

function wechsleBerg(nr){
  const b = BERGE[nr];
  if (!S.offen.includes(nr)){
    if (stufe() < b.stufe || S.gold < b.kosten) return;
    S.gold -= b.kosten;
    S.offen.push(nr);
    klang('kaufen');
    melde(b.name + ' geöffnet, ein Zusatzarbeiter kommt dazu', 'gold');
  }
  ladeWelt(nr);
  fensterZu();
  melde('Du bist am ' + b.name, 'gut');
  hud(); speichere();
}

/* --------------------------------- Hilfe --------------------------------- */

function zeigeHilfe(){
  fenster('Levis Mine', `
    <p class="hinweis">Grab dich in den Berg, sammle Erz, bring es zur Basis und kauf dir bessere Ausrüstung.
    Ein Goldstück ist CHF ${FRANKEN} wert. Bei ${zahl(ZIEL)} Goldstücken trägt sich die Mine selbst.</p>

    <h3 class="abschnitt">Steuerung</h3>
    <table class="tafel">
      <tr><td>Laufen, seitlich bohren</td><td><kbd>◀</kbd><kbd>▶</kbd> oder <kbd>A</kbd><kbd>D</kbd></td></tr>
      <tr><td>Nach unten bohren</td><td><kbd>▼</kbd></td></tr>
      <tr><td>Springen, klettern, nach oben bohren</td><td><kbd>▲</kbd></td></tr>
      <tr><td>Stützbalken setzen</td><td><kbd>Leer</kbd></td></tr>
      <tr><td>Schiene legen</td><td><kbd>R</kbd></td></tr>
      <tr><td>Dynamit zünden</td><td><kbd>F</kbd></td></tr>
      <tr><td>Seilwinde, zieht dich zur Basis</td><td><kbd>L</kbd></td></tr>
      <tr><td>Minenwagen heimschicken</td><td><kbd>E</kbd></td></tr>
      <tr><td>Ins Bohrfahrzeug steigen</td><td><kbd>V</kbd></td></tr>
      <tr><td>Laden, Berge, Hilfe</td><td><kbd>K</kbd><kbd>M</kbd><kbd>H</kbd></td></tr>
    </table>

    <h3 class="abschnitt">So kommst du wieder hoch</h3>
    <table class="tafel">
      <tr><td>Nach oben graben</td><td>Mit <kbd>▲</kbd> brichst du die Kachel über deinem Kopf,
        etwas langsamer als nach unten. So gräbst du dich immer wieder heraus.</td></tr>
      <tr><td>Treppe graben</td><td>Halte <kbd>▲</kbd> zusammen mit <kbd>◀</kbd> oder <kbd>▶</kbd>, dann
        brichst du die Kachel <b>schräg über dir</b>. Die Kachel darunter bleibt als Stufe stehen,
        und auf die springst du hinauf. So gräbst du dir eine Treppe, auch wenn Balken und
        Schienen aufgebraucht sind.</td></tr>
      <tr><td>Balken als Leiter</td><td>Setz beim Abstieg mit <kbd>Leer</kbd> Stützbalken in den Schacht.
        An ihnen kletterst du mit <kbd>▲</kbd> und <kbd>▼</kbd> hoch und runter. Schienen taugen auch dazu.</td></tr>
      <tr><td>Seilwinde</td><td>Steckst du fest, zieht dich <kbd>L</kbd> samt Ladung sofort zur Basis.
        Zwei hast du dabei, weitere kosten 14 Goldstücke.</td></tr>
      <tr><td>Zu hartes Gestein</td><td>Bricht eine Kachel nicht, grab seitlich daran vorbei,
        statt im Schacht stehen zu bleiben.</td></tr>
    </table>

    <h3 class="abschnitt">So läuft es</h3>
    <table class="tafel">
      <tr><td>Der Berg</td><td>Das Haus steht am Fuss des Bergs. Die Flanke kannst du hinauflaufen,
        gegraben wird nach innen und nach unten. Die Tiefe zählt ab der Basis.</td></tr>
      <tr><td>Werkzeug</td><td>Schaufel bricht Erde, Pickel bricht Stein, Hammer und Meissel brechen Hartstein,
        der grosse Hammer mit Nagel bricht Granit. Jedes Werkzeug nutzt sich ab und muss ersetzt werden.</td></tr>
      <tr><td>Lampe</td><td>Je tiefer du im Berg steckst, desto weniger siehst du. Wie weit dein
        Licht reicht, hängt an der Lampe: ${LAMPEN.map(l => l.name + ' ' + kommaZahl(l.weite)).join(', ')} Kacheln.
        Bessere Lampen kaufst du im Laden.</td></tr>
      <tr><td>Dynamit</td><td>Sprengt alles im Umkreis und ist danach weg.</td></tr>
      <tr><td>Stützbalken</td><td>Halten den Stollen im Umkreis von ${STUETZ_R} Kacheln. Wo rote Risse zu sehen sind,
        fehlt die Stütze und die Decke kommt herunter. Balken sind ausserdem Leitern.</td></tr>
      <tr><td>Schienen und Wagen</td><td>Schienen ×20 kosten 50 Goldstücke, der Minenwagen ebenfalls 50.
        Liegt ein durchgehendes Gleis vom Stollen bis zur Basis, schickst du die Ladung mit <kbd>E</kbd> heim,
        statt selbst hochzuklettern.</td></tr>
      <tr><td>Bohrfahrzeug</td><td>Kostet 100 Goldstücke und braucht 200 verdiente Goldstücke.
        Es bohrt jedes Gestein, verbraucht dabei aber Treibstoff. Getankt und repariert wird an der Basis, gratis.</td></tr>
      <tr><td>Berge</td><td>Vier Berge, jeder härter und reicher. Jeder neue Berg bringt einen Zusatzarbeiter,
        der auch ohne dich Gold abliefert.</td></tr>
    </table>

    <h3 class="abschnitt">Warum sich die Tiefe lohnt</h3>
    <table class="tafel">
      <tr><td>Gewicht</td><td>Der Rucksack fasst Gewicht, nicht Stückzahl. Eisenerz, Kupfer und Bronze wiegen 1,
        Silber wiegt 2, Gold wiegt 3. Der Wert steigt aber viel steiler als das Gewicht:
        ${MATS.map(m => MATERIAL[m].name + ' ' + MATERIAL[m].wert).join(', ')} Goldstücke.
        Eine volle Ladung aus der Tiefe ist darum ein Vielfaches wert.</td></tr>
      <tr><td>Erzverteilung</td><td>Je tiefer, desto eher liegt wertvolles Erz im Gestein. Eisenerz gibt es
        aber bis ganz unten, es verschwindet nie.</td></tr>
      <tr><td>Fundstücke</td><td>Ganz tief liegen einzelne alte Truhen. Wer eine aufbricht, bekommt
        400 Goldstücke auf einen Schlag.</td></tr>
      <tr><td>Tiefenmarken</td><td>Bei ${FUNK.map(f => f.tiefe + ' m').join(', ')} gibt es eine Nachricht
        und eine Belohnung.</td></tr>
    </table>

    <div class="gefahr">Pass auf: ungestützte Stollen brechen ein, und ein tiefer Sturz tut weh.
    Gastaschen sehen aus wie gewöhnliches Gestein, du merkst sie erst beim Anbohren, und je tiefer du bist,
    desto heftiger platzen sie. Bei null Prozent Zustand wachst du im Haus auf und die halbe Ladung bleibt im Berg.</div>`);
}

/* ========================================================================== */
/*                              Speichern                                     */
/* ========================================================================== */

// v2: der Berg hat die Weltmasse geaendert, alte Staende passen nicht mehr
/* Spielerauswahl statt Anmeldung. Das Spiel liegt als reine Seite ohne Server,
   eine Passwortpruefung liefe im Browser und waere mit einem Blick in den
   Quelltext zu umgehen. Was hier zaehlt, ist etwas anderes: mehrere Kinder an
   einem Geraet sollen getrennte Spielstaende haben. */
const SPIELER_LISTE   = 'levisMine.spieler';
const SPIELER_ZULETZT = 'levisMine.zuletzt';
const ALT_SCHLUESSEL  = 'levisMine.v2';
let SCHLUESSEL = ALT_SCHLUESSEL;
let spieler = '';

const spielerListe = () => {
  try { return JSON.parse(localStorage.getItem(SPIELER_LISTE)) || []; } catch(e){ return []; }
};
const spielerSchreiben = l => {
  try { localStorage.setItem(SPIELER_LISTE, JSON.stringify(l)); } catch(e){}
};
const schluesselFuer = name =>
  'levisMine.v2.' + name.toLowerCase().replace(/[^a-z0-9äöüß]/g, '') ;

/* Ein vorhandener Stand aus der Zeit ohne Auswahl wird dem ersten Namen
   zugeschlagen, damit niemand seinen Berg verliert. */
function standUebernehmen(name){
  try {
    const alt = localStorage.getItem(ALT_SCHLUESSEL);
    if (alt && !localStorage.getItem(schluesselFuer(name))){
      localStorage.setItem(schluesselFuer(name), alt);
      localStorage.removeItem(ALT_SCHLUESSEL);
    }
  } catch(e){}
}

function packe(arr){
  let s = '';
  for (let i = 0; i < arr.length; i += 4096) s += String.fromCharCode.apply(null, arr.subarray(i, i+4096));
  return btoa(s);
}
function entpacke(text, len, Typ){
  const bin = atob(text);
  if (bin.length !== len) return null;      // Stand aus einer anderen Weltgroesse
  const a = new Typ(len);
  for (let i = 0; i < len; i++) a[i] = bin.charCodeAt(i);
  return a;
}

/* Nach einem Neustart darf nichts mehr geschrieben werden. Ohne diese Sperre
   feuert beim Neuladen beforeunload, ruft speichere(), und der eben geloeschte
   Stand steht sofort wieder da. Genau daran ist der Neustart gescheitert. */
let abgeraeumt = false;

function speichere(){
  if (abgeraeumt) return;
  try {
    const w = {};
    for (const nr in welten) w[nr] = {boden: packe(welten[nr].boden), bau: packe(welten[nr].bau)};
    localStorage.setItem(SCHLUESSEL, JSON.stringify({S, P:{x:P.x, y:P.y}, welten:w}));
  } catch(e){ /* voller Speicher stoppt das Spiel nicht */ }
}

function lade(){
  let daten;
  try { daten = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch(e){ return false; }
  if (!daten || !daten.S) return false;
  Object.assign(S, daten.S);
  for (const nr in daten.welten){
    const bo = entpacke(daten.welten[nr].boden, BREITE*HOEHE, Uint8Array);
    const ba = entpacke(daten.welten[nr].bau, BREITE*HOEHE, Uint8Array);
    if (!bo || !ba) return false;           // unpassender Stand, lieber neu anfangen
    const st = new Uint16Array(BREITE*HOEHE);
    welten[nr] = {boden:bo, bau:ba, stuetze:st};
    // Stuetzfeld aus den vorhandenen Balken neu aufbauen
    boden = bo; bau = ba; stuetze = st;
    for (let y = 0; y < HOEHE; y++) for (let x = 0; x < BREITE; x++)
      if (ba[idx(x,y)] & 1) balkenBuchen(x, y, +1);
  }
  ladeWelt(S.bergNr);
  if (daten.P){ P.x = daten.P.x; P.y = daten.P.y; }
  return true;
}

function neuAnfangen(){
  abgeraeumt = true;                 // sperrt jedes weitere Schreiben, auch beforeunload
  localStorage.removeItem(SCHLUESSEL);
  location.reload();
}

addEventListener('beforeunload', speichere);
addEventListener('beforeunload', zeitSichern);

/* ========================================================================== */
/*                                 Schleife                                   */
/* ========================================================================== */

function aktualisiere(dt){
  bewege(dt);
  bohre(dt);
  pruefeEinsturz(dt);
  basisTick(dt);
  funkenTick(dt);

  if (beben > 0) beben = Math.max(0, beben - dt*22);

  // Zusatzarbeiter liefern ab
  arbeiterUhr += dt;
  if (arbeiterUhr >= 6){
    arbeiterUhr = 0;
    const n = arbeiter() * (1 + stufe());
    if (n > 0){ S.gold += n; S.verdient += n; pruefeSieg(); }
  }

  const tiefe = Math.max(0, Math.round((P.y + P.h - FUSS) * METER));
  if (tiefe > S.tiefstes) S.tiefstes = tiefe;

  // Tiefenmarken: je tiefer, desto weiter die Geschichte
  for (let i = 0; i < FUNK.length; i++){
    if (tiefe < FUNK[i].tiefe || S.funk.includes(i)) continue;
    S.funk.push(i);
    S.gold += FUNK[i].gold; S.verdient += FUNK[i].gold;
    melde(FUNK[i].text + '  +' + FUNK[i].gold + ' Goldstücke', 'gold');
    klang('muenze');
    pruefeSieg();
  }

  // Kamera folgt weich
  const ziel = kameraZiel();
  const f = 1 - Math.pow(0.0015, dt);
  kamera.x += (ziel.x - kamera.x)*f;
  kamera.y += (ziel.y - kamera.y)*f;

  zeitTicken(dt);

  hudUhr += dt;
  if (hudUhr > 0.1){ hudUhr = 0; hud(); }
  speicherUhr += dt;
  if (speicherUhr > 12){ speicherUhr = 0; speichere(); }
}

let letzte = 0;
function schleife(t){
  const dt = Math.min(0.045, letzte ? (t - letzte)/1000 : 0.016);
  letzte = t;
  if (schleier.hidden) aktualisiere(dt);
  zeichne();
  requestAnimationFrame(schleife);
}

/* ========================================================================== */
/*                                  Start                                     */
/* ========================================================================== */

document.getElementById('btnLaden').onclick = zeigeLaden;
document.getElementById('btnBerge').onclick = zeigeBerge;
document.getElementById('btnHilfe').onclick = zeigeHilfe;
document.getElementById('btnTon').onclick = e => {
  S.ton = !S.ton;
  e.currentTarget.textContent = S.ton ? '🔊' : '🔇';
  speichere();
};

passeGroesseAn();
baueAlleKachelbilder();
zeitLaden();

const zuletzt = localStorage.getItem(SPIELER_ZULETZT);
if (zuletzt && spielerListe().includes(zuletzt)){
  spieler = zuletzt;
  SCHLUESSEL = schluesselFuer(zuletzt);
}
const hatteStand = lade();
if (!hatteStand) ladeWelt(0);
document.getElementById('btnTon').textContent = S.ton ? '🔊' : '🔇';
hud();
if (!spieler) zeigeAnmeldung();          // beim ersten Mal nach dem Namen fragen
else if (!hatteStand) zeigeHilfe();

requestAnimationFrame(schleife);

// Fuer die Konsole, falls Levi einmal von vorn anfangen will
window.neuAnfangen = neuAnfangen;

/* Fuer die Eltern, ueber die Entwicklerkonsole. Bewusst nicht im Spiel:
   was Levi sehen kann, kann Levi auch bedienen.
     zeitZuruecksetzen()   heutige Spielzeit wieder auf null
     zeitLimit(30)         Limit auf 30 Minuten je Tag, 0 schaltet es ab
     zeitLimit()           zeigt das geltende Limit                        */
window.zeitZuruecksetzen = function(){
  zeitStand = {tag: heute(), sekunden: 0, gewarnt: 0};
  zeitSichern(); hud(); fensterZu();
  melde('Die Spielzeit für heute ist zurückgesetzt', 'gold');
  return 'Spielzeit zurückgesetzt, ' + limitMinuten() + ' Minuten stehen wieder offen';
};
window.zeitLimit = function(minuten){
  if (minuten === undefined) return limitMinuten() + ' Minuten je Tag';
  const n = Math.max(0, Math.min(600, parseInt(minuten, 10) || 0));
  try { localStorage.setItem(ZEIT, String(n)); } catch(e){}
  zeitStand.gewarnt = 0; hud();
  return n === 0 ? 'Zeitlimit abgeschaltet' : 'Zeitlimit auf ' + n + ' Minuten je Tag';
};
