# Grafikbefund und Bauanleitung

Für die Builder-Session. Selbsttragend: alles Nötige steht hier, die Unterhaltung,
aus der es stammt, wird nicht gebraucht.

Stand: 12.08.2026, Arbeitsstand `68fc84e`.

---

## 1. Worum es geht

Zwei Beanstandungen am Aussehen stehen offen:

**A.** Der Lichtausschnitt soll kleiner sein, innerhalb des Schimmers alles gut
sichtbar, nach aussen schleichend ausblenden statt an einer Kante aufzuhören.

**B.** Erde soll nach Erde aussehen, nicht nach Klötzen. Zu eckig.

**A ist erledigt.** Kern bis 0.38 voll sichtbar, danach vierzehn gerechnete Stufen
mit weicher Kurve, Höchstwert der Verdunkelung 0.90, Anstieg über vierzehn Kacheln
Tiefe. Siehe `zeichneDunkelheit`.

**B ist offen** und ist der Gegenstand dieses Dokuments.

## 2. Grenze

Als Vorbild dienten zwei gekaufte Spiele von XGen Studios, Motherload (2004) und
Super Motherload (2013). Gemessen wurde an einer lokalen Installation.

- **Erlaubt und getan:** messen, zählen, Struktur beschreiben, daraus eigene
  Verfahren ableiten. Zahlen und Aufbau sind Tatsachen über ein System.
- **Nicht erlaubt und nicht getan:** Bilddaten, Paletten oder nachgezeichnete
  Formen in dieses Spiel übernehmen. Levis Mine steht öffentlich auf
  `giansn.github.io`, dort wäre fremde Grafik Verbreitung, nicht Studie.

Alles Folgende sind Messwerte und daraus abgeleitete eigene Verfahren.
**Kein Pixel und keine Zeile fremden Codes gehört in dieses Projekt.**

## 3. Wie gemessen wurde

Nachvollziehbar, falls Zahlen zu prüfen sind.

**Vorbild, Benennung und Masse** aus dem Manifest der entpackten Atlanten:
`/home/g2thek/Desktop/super-motherload-analysis/phyre-pixels/manifest.json`,
Teilgrafiken unter `assets/GL/tiles/tile.ags_subs/`.

**Vorbild, Bildwerte** mit PIL: Deckung aus dem Alphakanal, Helligkeit als
`0.2126 R + 0.7152 G + 0.0722 B`, Streuung als Standardabweichung über die
deckenden Bildpunkte.

**Eigener Stand**: die vorgerechneten Bilder aus dem laufenden Spiel geholt und
mit derselben Rechnung ausgewertet. Rezept in Abschnitt 8.

## 4. Messwerte

### 4.1 Aufbau beim Vorbild

| Grösse | Wert |
|---|---|
| Namensschema | `ID_fFRAME_cCHANNEL[_label].png` |
| Kachel-IDs | 128 |
| Kanäle je ID | 4, lückenlos |
| Bilder je ID | meist 1, selten bis 5 (Abbaustufen) |
| Kachelmass | 659 von 660 exakt 100×100 |
| IDs für `tunnel` | 80 |
| IDs für `top_tunnel` | 13 |
| IDs für `dirt` | 5 |

**`c0`–`c3` sind vier vollwertige Varianten, keine Viertel.** Alle vier gleich
gross, in null von 164 Gruppen als 2×2-Block im Atlas benachbart, stattdessen
untereinander gestapelt. Eine frühere Vermutung, es handle sich um eine Bauweise
aus Vierteln, ist damit widerlegt. Nicht erneut verfolgen.

### 4.2 Bildwerte beim Vorbild

| Kennzahl | `dirt` | `tunnel` | `top_tunnel` |
|---|---:|---:|---:|
| Deckung | 1,000 | 1,000 | 1,000 |
| Deckung am Bildrand | 1,000 | 1,000 | 1,000 |
| Streuung der Randdeckung | 0,000 | 0,000 | 0,000 |
| Anteil teildurchsichtig | 0,000 | 0,000 | 0,000 |
| Helligkeit, Mittel | 56,7 | 34,5 | 53,2 |
| Helligkeit, Streuung | 5,9 | 19,4 | 31,2 |
| oben minus unten | −0,6 | −7,8 | **−60,4** |
| Abstand der vier Varianten | 6,9 | 3,6 | 3,1 |

Helligkeiten und Streuungen in Einheiten von 0 bis 255.

### 4.3 Unser Stand

| Bild | Mass | Deckung | Helligkeit | Streuung |
|---|---|---:|---:|---:|
| `grundBild[ERDE]` | 408×408 | 1,000 | 78,0 | **2,54** |
| `kachelBild[ERDE][0]` | 34×34 | 0,900 | 77,2 | 2,69 |
| `randBild[5]` | 34×34 | **0,155** | 42,0 | **0,00** |

Dazu: 16 Randfälle (`randBild[0..15]`), `VARIANTEN = 8`, `GRUND_KACHELN = 12`.

## 5. Was daraus folgt

**Die Fläche ist nicht das Problem.** Unsere Streuung liegt bei 2,54, beim Vorbild
bei 5,9. Wir sind flacher, nicht unruhiger. Eine frühere Vermutung, die Fläche sei
zu stark texturiert, ist damit ebenfalls widerlegt.

**Das ganze Handwerk sitzt am Rand, und dort haben wir fast nichts.** Unser
Randbild deckt 15,5 Prozent der Kachel und hat null innere Streuung, es ist eine
flache Farbe auf einem schmalen Saum. Beim Vorbild deckt die Randkachel voll, trägt
drei- bis fünfmal so viel Struktur wie die Fläche, und der Übergang von Hohlraum zu
Fels ist als Verlauf über 60 Helligkeitseinheiten **in die Kachel hineingemalt**.
Bei uns ist der Übergang die Zellgrenze selbst.

**Vier Nachbarn reichen nicht.** Wir bilden die Maske aus oben, rechts, unten,
links, das ergibt 16 Fälle. Damit ist eine gerade Wand von einer Aussenecke und
einer Innenecke **nicht unterscheidbar**: alle Kacheln einer senkrechten Höhlenwand
tragen dieselbe Maske und bekommen dasselbe Bild. Deshalb sehen senkrechte Wände
zwangsläufig wie Treppen aus. 80 Rand-IDs beim Vorbild sind nur erklärbar, wenn die
Diagonalen mitzählen. Das ist Autotiling, der veröffentlichte Standardsatz umfasst
47 unterscheidbare Fälle.

**Varianten sind nicht der Hebel.** Beim Vorbild unterscheiden sich die vier
Varianten um 3 bis 7 von 255, also kaum. Sie brechen die exakte Wiederholung, ohne
Flickenteppich zu erzeugen. Wir haben acht, deutlicher verschieden.

## 6. Bauanleitung

In einem Zug, nicht stückweise. Die Schritte hängen zusammen.

### Schritt 1: Maske auf acht Nachbarn

Statt vier Bits nun acht: vier Orthogonale und vier Diagonale. Eine Diagonale zählt
nur, wenn **beide** angrenzenden Orthogonalen fest sind, sonst ist ihr Zustand für
die Form ohne Belang. So schrumpfen 256 rohe Kombinationen auf 47 unterscheidbare.
Die Reduktion einmalig in eine Nachschlagetabelle `randFall[256] → 0..46` legen und
beim Start füllen.

### Schritt 2: `baueRandbild` neu

Ein Bild je Fall, also 47 statt 16, weiterhin einmalig beim Start vorgerechnet.
Je Bild:

- **volle Deckung**, kein Saum
- der Übergang Fels zu Hohlraum als **gemalte Kurve innerhalb der Kachel**, nicht
  an ihrem Rand; leicht unregelmässig über `hash`, damit benachbarte Kacheln
  desselben Falls nicht gleich aussehen
- **Verlauf quer zum Übergang**: auf der Hohlraumseite dunkel, auf der Felsseite
  hell, Spannweite deutlich; das Vorbild erreicht 60 Einheiten
- auf der Oberkante eine dünne helle Linie, sie trägt die Lichtstimmung
  (existiert bereits als Erdkamm, dort übernehmen)

### Schritt 3: Aufräumen

`rundeAussenecken` und die Eckwölbung von der Hohlraumseite in der Zeichenschleife
**entfernen**. Beide waren Pflaster über die fehlenden Diagonalen und werden von
Schritt 1 und 2 abgelöst. Bleiben sie stehen, überlagern sie sich mit dem neuen
Randbild. `hohlraumFarbe` wird weiter gebraucht.

### Schritt 4: Feinabgleich

- Flächenstreuung in `baueGrundbild` von 2,54 auf etwa 6 anheben.
- Variantenabstand in `baueKachelbild` senken, Ziel etwa 4 bis 7 von 255.
- `kachelBild` deckt derzeit nur 0,900. Der Rest der Kachel zeigt die Lage
  darunter, das ist tragbar, aber die Blasenform darf keine erkennbare Kante
  setzen. Prüfen, ob volle Deckung ruhiger wirkt.

### Schritt 5: Abnahme

Erst messen, dann ansehen, dann committen.

| Kriterium | Zielwert |
|---|---|
| `node pruefe.js` | alle Prüfungen ok, derzeit 71 |
| `node --check spiel.js` | fehlerfrei |
| Deckung `randBild[*]` | 1,000 |
| Streuung `randBild[*]` | 15 bis 35 |
| Streuung `grundBild[*]` | 5 bis 8 |
| Zahl der Randbilder | 47 |
| Bild ohne Verdunkelung | keine senkrechte Treppe an Höhlenwänden |
| Bildrate | 60 Bilder je Sekunde bei rund 45×26 sichtbaren Kacheln |

Alles Vorgerechnete gehört in den Start, nicht in die Bildschleife. 47 Bilder zu
34×34 sind rund 217 KB je Gesteinsart, unkritisch.

## 7. Was schon fehlgeschlagen ist

Nicht wiederholen.

**Zweite Untergrundlage mit teilerfremder Periode.** Idee war, das Wiederholungs­-
muster von `GRUND_KACHELN = 12` durch eine gröbere Lage mit Periode 17 zu brechen,
damit sich das Bild erst nach 204 Kacheln wiederholt. Ergebnis: die Erde lag danach
als Gitter brauner Rundquadrate auf grauem Grund, dazu eine harte waagrechte Naht
über das ganze Bild. Deutlich schlechter als vorher, zurückgenommen.

**Viertel-Bauweise.** Aus dem Namensschema geschlossen, durch Messung widerlegt,
siehe 4.1. Nicht erneut verfolgen.

**Fläche entrauschen.** Vermutet, die Fläche sei zu unruhig. Messung sagt das
Gegenteil, siehe 4.3.

## 8. Prüfen und Bilder machen

Chromiums `--screenshot` löst **vor** einem eingefügten Skript aus und liefert
veraltete Zustände. Verlässlich ist, die Leinwand selbst auszulesen:

```bash
D=$HOME/schuss; rm -rf $D; mkdir -p $D
cp /home/g2thek/Desktop/levis-mine/{style.css,spiel.js,index.html} $D/
mv $D/index.html $D/s.html
sed -i 's/style\.css?v=[0-9]*/style.css/; s/spiel\.js?v=[0-9]*/spiel.js/' $D/s.html
cat >> $D/s.html <<'EOF'
<script>
fensterZu();
taste.ab = true; for (let i=0;i<1500;i++) aktualisiere(1/60); taste.ab = false;
zeichneDunkelheit = function(){};        // aus, um die Geometrie zu beurteilen
for (let i=0;i<4;i++) aktualisiere(1/60);
hud(); zeichne();
document.documentElement.innerHTML =
  '<body><pre id=raus>' + leinwand.toDataURL('image/png') + '</pre></body>';
</script>
EOF
cd $D && chromium --headless=new --disable-gpu --no-sandbox --virtual-time-budget=5000 \
  --window-size=1500,860 --dump-dom "file://$D/s.html" 2>/dev/null > $D/s.dom
sed -n 's/.*base64,\([A-Za-z0-9+/=]*\).*/\1/p' $D/s.dom | head -1 | base64 -d > $D/s.png
```

Vorgerechnete Bilder auswerten: im Skript statt der Leinwand
`randBild[5].toDataURL('image/png')` ausgeben und mit PIL Deckung und Streuung
rechnen, Formel in Abschnitt 3.

## 9. Fallstricke im Projekt

- **`[hidden]`** wirkt nur über die Standardregel `[hidden]{display:none}`. Jeder
  eigene ID-Selektor mit `display` schlägt sie. Deshalb steht in `style.css`
  `[hidden]{display:none!important}`. Nicht entfernen, sonst ist der Schleier
  dauerhaft sichtbar und das Fenster erscheint leer.
- **Zwischenspeicher.** GitHub Pages liefert Assets zwischengespeichert aus. Nach
  jeder Änderung die Version in `index.html` erhöhen, `style.css?v=N` und
  `spiel.js?v=N`, sonst kommt die Änderung beim Spieler nicht an.
- **`sed -i` mit Zeilennummern** hat in diesem Projekt schon die falschen Zeilen
  getroffen. Für Codeänderungen mit eindeutigem Textanker arbeiten.
- **Befehlsketten.** `node --check … && …` gefolgt von einer neuen Zeile mit `git
  commit` committet auch bei Fehlschlag. Prüfung und Commit in eine Kette legen.

## 10. Offen, nicht Teil dieses Auftrags

- Waagrechte Naht zwischen zwei Tiefenschichten, `tarnung(y)` wechselt die Art
  über die volle Breite auf einmal. Sollte über eine unregelmässige Grenze laufen.
- Flaches Schwarz im Höhleninneren, ohne Struktur und Tiefe.
- Beim Vorbild gibt es 23 Radarbilder, `radar_{dirt,rock,lava,mineral-0..3,
  treasure,…}`. Ein Radar wäre die Antwort auf den Widerspruch, dass ein kleinerer
  Lichtkegel die Orientierung nimmt.
- Beim Vorbild ist die Basis aus benannten Einzelteilen zusammengesetzt,
  `fuelGauge`, `refineryConveyor`, `repairArm`, `shopBelts`, `shopDoor`. Unser Haus
  ist ein starres Bild.
