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

Beim Laden kommt eine Maske mit einem Wort. Eingebaut ist **`bergmine höfen`**,
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

Bewusst gibt es dafür **keinen Bereich im Spiel**: was das Kind sehen kann,
kann es auch bedienen. Gesteuert wird über die Entwicklerkonsole, `F12` und
dann Konsole:

```js
zeitZuruecksetzen()   // heutige Spielzeit auf null, es geht sofort weiter
zeitLimit(30)         // Limit auf 30 Minuten je Tag
zeitLimit(0)          // Limit abschalten
zeitLimit()           // zeigt das geltende Limit
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
| E | Minenwagen heimschicken |
| V | ins Bohrfahrzeug steigen |
| K M H | Laden, Berge, Hilfe |

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
