# orderflow-engine-page

[Español](README.es.md)

The delivery portal of Orderflow Engine: a static site for GitHub Pages that shows the evaluator, challenge by challenge, what the assignment asked, how it was solved and the evidence that proves it, and links every document and repository. It opens in Spanish, and a toggle switches it to English.

## What it is

One page with a fixed table of contents on the left. Choosing an entry shows only that section, from its top, with links to the previous and next sections at its foot; each section has its own address (`#a1`, `#documents`…), so the browser's back button and shared links work. The sections, in order:

| Section | Content |
|---------|---------|
| Summary | What the system is, four key figures (challenges solved, automated tests, acceptance criteria, countries) and a table with every challenge, its status and its main evidence |
| Evaluate in 10 minutes | Five steps: the README, the ADR, the single test command, starting the full stack, and the documents |
| A1, A2, A3, Deliverables, Web client, Countries and languages | One section per challenge, each with the same three parts: what was asked (the assignment's words), how it was solved, and an evidence table where every row is an acceptance criterion of SPEC §14 with the tests that verify it, linked to their code on GitHub |
| Documents | The manuals, the architecture report, the walkthrough, the presentation and ADR-0001, in Spanish and English |
| Repositories | The six repositories and what each one holds |

Every link opens in a floating window over the page, so the reader never leaves it: PDFs show inside it, screenshots enlarged, source files and tests from GitHub as numbered code, READMEs and the ADR rendered and opened at the linked heading; a deck, a folder or a list of pull requests shows a card with a button to open it. Ctrl, Cmd or the middle button still open a link in a new tab.

Two pieces of evidence are real recorded answers from the API: in A1, a quote panel where the visitor changes the quantities and reads the engine's breakdown for that cart; in A2, the same confirmation sent twice with one idempotency key, with the byte-identical replay.

## How to view it locally

From this folder:

```bash
python -m http.server 8090
```

Then open `http://localhost:8090`. Add `?lang=en` to open it in English. Opening `index.html` straight from disk shows an empty page, because the texts and the data are loaded with `fetch`, which browsers block on `file://` pages.

## How it is built

| File | Role |
|------|------|
| `index.html` | Structure only. Every element that shows text names its key with `data-i18n`, every list with `data-i18n-list`, and every translated attribute with `data-i18n-attr` |
| `i18n/es.json`, `i18n/en.json` | Every text of the page, with the same keys in both files. Spanish is the default. Texts may use `code` and **bold** marks |
| `data/evidence.json` | The evidence rows of each challenge: the acceptance criteria, the tests that verify them and their paths in each repository |
| `data/quotes-co-alpha.json` | 120 quotes recorded from `POST /api/v1/quotes` on 2026-10-17 (Tienda Norte, `co-alpha`, cash): cola from 1 to 60 units, with and without 10 chips. The page never calls an API |
| `app.js` | Loads the dictionary and the data, applies texts, renders the evidence tables, drives the quote panel, shows the section chosen in the table of contents with its previous and next links, and builds the phone menu |
| `viewer.js` | The floating window: it intercepts the links that leave the page and shows each one by type; files from GitHub are read from `raw.githubusercontent.com`, and if one cannot be loaded the window offers to open the link on GitHub |
| `style.css` | Layout with a fixed table of contents, tables that become labelled cards on phones, focus styles, and a short fade between sections with a reduced-motion fallback |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

Rules the page keeps:

- No text is written in the HTML or in the JavaScript, except one `<noscript>` line. A new text is a new key in both dictionaries. Product names come from the recorded data, in the tenant's language, as in the web client.
- The language choice is kept in the browser's `localStorage`. Every access is wrapped, so a browser that blocks storage still shows the page, in Spanish.
- No external resources: system fonts, no CDN, no analytics, no cookies.
- Without script, every section shows one after the other. Hover effects apply only to devices with a fine pointer, and with reduced motion the change of section has no movement.

## What is in it and what is not

In this folder: the page, its two dictionaries, its data, its styles and script, this README in English and Spanish, and the license.

Copied into this folder when the delivery is assembled, and not written by hand:

| Folder | Files | Source |
|--------|-------|--------|
| `screenshots/es/`, `screenshots/en/` | The nine screenshots of the web client; the page shows `02`, `04`, `05`, `06`, `07` and `09` | `orderflow-engine-docs/delivery/screenshots/` |
| `documents/` | `user-manual`, `technical-manual`, `architecture-report`, `solution-walkthrough` and `0001-order-pricing-and-confirmation` as `.pdf` and `.es.pdf`; `presentation.pptx` and `presentation.es.pptx` | `orderflow-engine-docs/deliverables/` |

The links to tests, READMEs and the ADR point at the `main` branch of each repository on GitHub.

Not in it: a running API (the quote panel and the confirmation replay show recorded answers; the system itself runs with Docker, see Evaluate in 10 minutes), a build step or package manager, and any tracking.

## Publishing on GitHub Pages

In the repository settings, under Pages, choose to deploy from a branch: `main`, folder `/ (root)`. The site is served from the repository root, as it is in this folder.

## License

MIT. See [LICENSE](LICENSE).
