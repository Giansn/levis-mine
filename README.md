# Levis Mine

Ein 2D-Bergbauspiel in der Seitenansicht, nach dem Vorbild von Motherload.
Levi gräbt sich in einen Berg, dessen Haus am Bergfuss steht. Läuft ohne
Installation und ohne Server: `index.html` doppelklicken.

Im Netz: <https://giansn.github.io/levis-mine/>

## Spielen

```bash
xdg-open /home/g2thek/Desktop/levis-mine/index.html
```

Der Spielstand liegt im Browser (`localStorage`). Von vorn anfangen geht in der
Entwicklerkonsole mit `neuAnfangen()`.

## Vor dem Spiel

Beim Laden kommt eine Maske mit einem Passwort. Eingebaut ist **`Bergmine Höfen`**,
Gross- und Kleinschreibung und zusätzliche Leerzeichen spielen keine Rolle.

Das ist ein Vorhang, kein Schloss: die Seite samt Prüfung wird geladen, bevor
irgendetwas geprüft wird. Sie hält jemanden auf, der einfach spielen will, und
niemanden sonst. Ein eigenes Wort setzt man in der Konsole:

```js
spielPasswort('eigenes wort')   // ersetzt das eingebaute
spielPasswort('')               // zurück zum eingebauten
spielPasswort()                 // sagt, was gilt
```

## Spielzeit begrenzen

Zwanzig Minuten je **Gerät**, über alle Spielernamen hinweg. Die Zeit läuft nur
während des Spielens, bei offenem Fenster steht sie still. Die Kopfleiste zeigt
die Restzeit, bei fünf Minuten und bei einer Minute kommt eine Warnung, danach
ist Schluss und der Stand ist gesichert.

Die Uhr läuft **nicht** mit dem Datum ab. Ein Tageswechsel würde sie von selbst
freigeben, und die Systemuhr vorzustellen ist kein Kunststück. Frei gibt sie
allein `zeitZuruecksetzen()`.

Ist die Zeit um, steht im Sperrfenster ein Passwortfeld. Es gilt **dasselbe
Wort wie beim Vorhang**, damit lässt sich die Zeit direkt am Gerät freigeben,
ohne Konsole und ohne Netz.

> Das setzt voraus, dass ein Erwachsener das Passwort eingibt. Lernt das Kind
> es mit, gibt es sich damit auch die Zeit frei. Dann bekommt die Zeitsperre
> in der Konsole ein eigenes Wort:
>
> ```js
> zeitPasswort('elternwort')   // nur für die Zeitsperre
> zeitPasswort('')             // zurück zum Vorhangwort
> zeitPasswort()               // sagt, was gilt
> ```

Weiteres wird über die Entwicklerkonsole gesteuert, `F12` und dann Konsole:

```js
zeitZuruecksetzen()   // heutige Spielzeit auf null, es geht sofort weiter
zeitLimit(30)         // Limit auf 30 Minuten je Tag
zeitLimit(0)          // Limit abschalten
zeitLimit()           // zeigt das geltende Limit
```

## Karte zurücksetzen

Würfelt den Berg neu aus, ohne den Fortschritt anzutasten. Gold, Werkzeuge,
Ausrüstung, Arbeiter und die geöffneten Berge bleiben; weg sind der gegrabene
Stollen, gesetzte Balken und Schienen, das gesetzte Portal und das, was Levi
schon gesehen hat.

Im Spiel steht das unter `Esc` als **Karte zurücksetzen**, mit einer Rückfrage
davor. In der Konsole geht dasselbe, und dort auch für alle Berge auf einmal:

```js
karteZuruecksetzen()       // den Berg, auf dem Levi gerade steht
karteZuruecksetzen(true)   // alle Berge auf einmal
```

Das hält ein Kind auf, das einfach weiterspielen will. Wer die Konsole selbst
öffnet oder den Browserspeicher löscht, kommt daran vorbei. Ohne Server lässt
sich das nicht ändern.

## Steuerung

| Taste | Wirkung |
|---|---|
| ◀ ▶ bzw. A D | laufen, seitlich bohren |
| ▼ | nach unten bohren |
| ▲ | springen, klettern, nach oben bohren, im Fahrzeug Schub |
| ▲ + ◀ ▶ | schräg nach oben bohren, gräbt eine Treppe |
| Leertaste | Stützbalken setzen |
| R | Schiene legen |
| F | Dynamit zünden |
| L | Seilwinde, zieht dich zur Basis |
| N | Nebenbasis ablegen, tankt dich unten auf |
| T | Portal setzen, an der Basis dorthin reisen |
| E | Minenwagen heimschicken |
| V | ins Bohrfahrzeug steigen |
| K M H | Laden, Berge, Hilfe |

## Levis Zettel

Fünf Punkte, handschriftlich eingereicht, alle umgesetzt:

| | Wunsch | Umsetzung |
|---|---|---|
| 1 | Arbeiter kaufen, die für mich arbeiten | Im Laden anstellbar. Erster 100 Goldstücke, jeder weitere ×1,8 |
| 2 | Mehr Seilwinden je Kauf, und zwar 5 | Seilwinde ×5 für 22 Goldstücke |
| 3 | Dynamit gleich 5 Stangen je Kauf | Dynamit ×5 für 34 Goldstücke |
| 4 | Tank vom Bohrfahrzeug soll 5 Minuten halten | Tank von 100 auf **900**. Gemessen 298 s bei drei Vierteln Bohren |
| 5 | Kleine Basen mit 4 Ersatztanks zum Kaufen und Legen | Nebenbasis für 70 Goldstücke, mit `N` ablegen, tankt unter 60 % voll |

Zu Punkt 4: der Verbrauch wurde gemessen statt geschätzt. Reines Bohren kostet
0,71 Einheiten je Sekunde, reiner Schub 7,50, ein realistisches Muster aus drei
Vierteln Bohren 2,99. Daraus folgen 898 für fünf Minuten, aufgerundet 900.
Volltanken an der Basis bleibt bei drei Sekunden, unabhängig von der Tankgrösse.

## Berge

Alle vier Berge stehen offen, Hinfahren über `M` kostet nichts. Jeder ist
härter und reicher als der vorige: Grünhügel, Kupferkamm, Silbergrat,
Goldspitze. Der **erste Besuch** eines Bergs bringt einen Zusatzarbeiter — nicht
das Freischalten, sonst sässen von Anfang an drei Arbeiter da, bevor etwas
getan wurde. Im Bergfenster steht bei jedem, ob er schon besucht ist.

Bestehende Spielstände werden beim Laden nachgezogen: alle Berge kommen dazu,
und wer früher Berge freigekauft hat, gilt dort als gewesen und behält seine
Arbeiter.

## Zonen

Die 600 Meter zerfallen in fünf benannte Abschnitte. Der Name steht in der
Kopfleiste neben der Tiefe, die Gesteinsfarbe wechselt mit, und beim ersten
Eintritt meldet sich jeder einmal.

| Zone | Tiefe | Gestein |
|---|---|---|
| Wurzelgrund | 0–80 m | weiche Erde, viel Eisenerz |
| Kupferband | 80–200 m | rostiges Gestein, Kupferadern |
| Graue Tiefe | 200–340 m | kalter Stein, erste Bronze |
| Silberkluft | 340–480 m | Hartstein, Silber, Gastaschen |
| Goldkern | 480–600 m | Granit, Gold, Fundstücke |

Die Grenze zwischen zwei Zonen wandert je Spalte um bis zu drei Kacheln, damit
die Schichten ineinander fransen statt am Lineal zu enden.

## Was drinsteckt

Levis Vorgaben: Basis als Haus mit dem Goldlager, Erz, Gold, Silber, Bronze und
Kupfer als Materialien, Schaufel, Pickel, Hammer, Meissel und Nagel als
Verbrauchswerkzeuge, Dynamit für den einmaligen Gebrauch, Stützbalken gegen den
Einsturz, Minenwagen und Schienen zu je 50 Goldstücken, Bohrfahrzeug für 100 ab
200 verdienten Goldstücken, vier Berge mit je einem Zusatzarbeiter, ein
Goldstück zu CHF 25.

Aus Motherload übernommen sind drei Entwurfsentscheide, nicht Code:

1. Der Wert der Erze steigt steiler als ihr Gewicht, dadurch wird der Frachtraum
   mit der Tiefe wertvoller und der Aufstieg zum Abliefern lohnt sich.
2. Gastaschen tragen die Maske des umgebenden Gesteins und sind vor dem Anbohren
   nicht zu erkennen, ihr Schaden wächst mit der Tiefe.
3. Die Tiefe weitet die Spannweite der Erzauslosung nach oben, ohne billiges Erz
   je auszuschliessen.

Dazu Tiefenmarken bei 100, 250, 400 und 580 Metern, die Nachricht und Belohnung
geben, und einzelne Fundstücke ganz unten.

## Wieder nach oben

Vier Wege, damit niemand unten feststeckt: die Kachel über dem Kopf
wegbrechen, mit `▲` und einer Seitentaste zusammen die Kachel schräg darüber
wegnehmen und auf die stehengebliebene Stufe springen, an gesetzten
Stützbalken oder Schienen klettern, oder die Seilwinde mit `L`, die samt
Ladung zur Basis zieht.

Wie weit Levi im Berg sieht, hängt an der Lampe. Vier Stufen, von der
Helmlampe mit 5,0 Kacheln bis zum Scheinwerfer mit 13,8 Kacheln, kaufbar im
Laden.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der Oberfläche |
| `style.css` | Gestaltung |
| `spiel.js` | Weltgenerierung, Physik, Bohren, Einsturz, Laden, Zeichnen |
| `pruefe.js` | Rauchtest, siehe unten |

## Test

`pruefe.js` lädt `spiel.js` in Node mit gestubbtem DOM und Canvas und prüft
Weltgenerierung, Erzverteilung nach Tiefe, Graben, Erzaufnahme, Gastaschen,
Frachtgewicht, Stützweite der Balken, Gleisanschluss, Preise im Laden,
Bergwechsel sowie Speichern und Laden.

```bash
node /home/g2thek/Desktop/levis-mine/pruefe.js
```

## Spielzeit aus der Ferne freigeben

Die verbrauchte Spielzeit steht im localStorage von Levis Gerät und läuft nicht
mit dem Datum ab — ein neuer Tag fängt also nicht von selbst bei null an. Frei
gibt sie entweder die Konsole auf dem Gerät selbst, oder die Datei
[`freigabe.json`](freigabe.json) neben `index.html`:

```json
{ "marke": 1, "limit": 20 }
```

Das Spiel holt diese Datei beim Start und danach alle 45 Sekunden. Steht dort
eine **höhere Marke** als die zuletzt gesehene, ist das die Freigabe: die
Spielzeit geht auf null, die neue Marke wird gemerkt, und ein stehendes
Sperrfenster schliesst sich von selbst. Dieselbe Marke wirkt nur einmal.

**So gibst du vom Handy frei:** auf github.com die Datei `freigabe.json` öffnen,
auf den Stift tippen, `marke` um eins erhöhen, auf Commit tippen. Nach ein bis
zwei Minuten hat GitHub Pages die neue Datei, dann dauert es noch bis zu 45
Sekunden bis zur nächsten Abfrage.

`limit` ist die Zahl der Minuten je Freigabe und wird bei jeder Abfrage
übernommen. **`"limit": 0` sperrt sofort** — auch das wirkt aus der Ferne, ohne
dass die Marke sich ändern muss.

Ohne Netz greift nichts davon; dann läuft die Uhr einfach weiter. Das ist der
gewollte Rückfall.
