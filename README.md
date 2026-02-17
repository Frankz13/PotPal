# PotPal

App mobile/web basata su Expo Router.

## Requisiti

- Node.js **20.x** (consigliato LTS)
- npm **10+**
- Expo CLI (usata tramite `npx`, non serve install globale)

> Per Android/iOS reale servono anche gli strumenti di sviluppo della piattaforma (Android Studio / Xcode), ma per sviluppo locale base basta Expo Go o web.

## Avvio da zero

1. Installa le dipendenze:

```bash
npm ci
```

2. Avvia il progetto:

```bash
npm run start
```

## Script utili

- Avvio dev server Expo:

```bash
npm run start
```

- Avvio su Android:

```bash
npm run android
```

- Avvio su iOS:

```bash
npm run ios
```

- Avvio su Web:

```bash
npm run web
```

- Lint:

```bash
npm run lint
```

- Format (autofix ESLint):

```bash
npm run format
```

- Build/export web:

```bash
npm run build
```

## Struttura cartelle

```text
.
├── app/                # Route Expo Router (screen/layout)
├── assets/             # Immagini e risorse statiche
├── components/         # Componenti UI riutilizzabili
├── constants/          # Costanti condivise (es. temi)
├── hooks/              # Hook custom React
├── scripts/            # Script di utilità progetto
├── app.json            # Configurazione Expo
├── eslint.config.js    # Configurazione ESLint
├── package.json        # Dipendenze e script npm
└── tsconfig.json       # Configurazione TypeScript
```

## MVP flow

1. Home mostra la lista delle Unit salvate in locale.
2. Tocca **Add Unit** e crea una unit con `name`, `location` e `notes` opzionali.
3. Apri una Unit per vedere dettaglio e galleria foto.
4. In dettaglio usa **Scatta foto** o **Da libreria** per aggiungere immagini persistenti.
5. Chiudi e riapri l'app: Unit e foto restano disponibili perché salvate in JSON locale.

### Come provarlo

- Avvia l'app con `npm run start`.
- Crea una unit.
- Aggiungi 2 foto dalla camera o dalla libreria.
- Chiudi completamente l'app e riaprila.
- Verifica che unit e foto siano ancora presenti.
