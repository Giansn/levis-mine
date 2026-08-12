# Levis Mine

Ein 2D-Bergbauspiel in der Seitenansicht, nach dem Vorbild von Motherload.
Läuft ohne Installation und ohne Server: `index.html` doppelklicken.

## Spielen

```bash
xdg-open /home/g2thek/Desktop/levis-mine/index.html
```

Der Spielstand liegt im Browser (`localStorage`). Von vorn anfangen geht in der
Entwicklerkonsole mit `neuAnfangen()`.

## Steuerung

| Taste | Wirkung |
|---|---|
| ◀ ▶ bzw. A D | laufen, seitlich bohren |
| ▼ | nach unten bohren |
| ▲ | springen, klettern, nach oben bohren, im Fahrzeug Schub |
| Leertaste | Stützbalken setzen |
| R | Schiene legen |
| F | Dynamit zünden |
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
