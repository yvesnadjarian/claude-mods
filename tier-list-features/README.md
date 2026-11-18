# New Features Tier List

Adds a `/tiers` command and the New Features Tier List pane. The **New Features Tier List** button sits beside **✨ Melhorar Prompt** above the prompt box; it is drawn by the `melhorar-prompt` mod (in its row, so both buttons share one line) and runs `/tiers`. Install both mods for the button to appear.

Clicking it scans the project and produces a prioritized list of **Feature** and **Fix** items, grouped into tiers **S > A > B > C > D**. Each item has a short stable ID (`S1`, `A3`, `C2`…) you can type in your next message, e.g. *"implement S1, A2, B4"*.

## Options: how many items

Both are optional, and go after `/tiers` (in a prompt's last line, or as the command's arguments):

- `min=N`: fewer items than this is treated as an error, and the model is asked again once. Default 8.
- `max=N`: the list is never longer than this. Default 40.

Values are whole numbers from 1 to 60. `min` can't be greater than `max`. Invalid values are reported back and no scan starts.

Examples: `/tiers min=5 max=20` · `crie um app /tiers max=12` · `/tiers min=30`

"Escanear de novo" reuses the last limits.

## What it scans

- **The session's project** (the folder the Code tab is working in).
- **The sibling mods** in the same marketplace folder (e.g. `melhorar-prompt`).

Skipped: `node_modules`, `dist`, `build`, `out`, `coverage`, `target`, `vendor`, virtualenvs, dot-folders (except `.github` and `.claude-plugin`), lockfiles, minified files, source maps, `.d.ts` files, `.claude-plugin/types`, and anything named like secrets or keys (`.env*`, `*.pem`, `*.key`, `*credential*`, `*secret*`).

Limits: up to 150 files, 60 KB per file, about 160 KB of text in total. Docs and config are read first, then source, then tests. Every `TODO`, `FIXME`, `HACK` and `XXX` line found is passed to the model as a separate list.

## Tiers and criteria

| Tier | Meaning |
| --- | --- |
| **S** | high impact on the user **and** high risk if not done |
| **A** | high impact with medium risk, or medium impact with high risk |
| **B** | medium impact and medium risk |
| **C** | low impact, or medium impact with low risk |
| **D** | cosmetic or non-urgent ideas |

*Impact* is the benefit to the user. *Risk* is what happens if the item is ignored: bugs, security issues, data loss, or debt that blocks changes. Inside a tier, items are ordered by a 1–10 value score, highest first.

## Using the list

- **Copiar ID**: copies one ID.
- **☐ Selecionar**: select items. **Copiar selecionados** copies a reference list such as `S1 — Title` per line, ready to paste into your next prompt. **Limpar seleção** clears it.
- **Perguntar**: opens a question box under the item. The answer uses the item, the code it refers to (the files it names, or the scanned files that best match its wording), and the last questions asked about that item. Answers appear inline and the history is kept for that item.
- **Escanear de novo**: runs a fresh scan. The list, IDs, selection and answers are replaced.

## Notes

- Nothing is saved between sessions. The list lives in the mod's state for the current session only.
- Each scan calls the Sonnet model once (retried once if the JSON is malformed). Each question is one more call. Billed to your own Claude account.
- Files read during a scan are sent to the model. Ignored folders and secret-looking files are not.
- In the desktop app, a brand-new session starts its engine only when the first message is sent, so the button appears after that. Ending your first prompt with `/tiers` works from the start. The prompt is not sent to Claude; any text before `/tiers` is put back in the box.
- Desktop autocomplete does not list mod commands; type `/tiers` anyway.

## Tests

Pure logic (ignore rules, file ranking, JSON validation, ID assignment) is covered by:

```
node --experimental-strip-types --test tests/tier-list-features/logic.test.ts
```

Run from the `mods` folder (Node 22.6 or newer). The UI and model calls are checked by hand; see the checklist below.

### Manual checklist

1. Install (see the root README) and start a **new** Code-tab session.
2. Send a first message ending in `/tiers`. The prompt is not sent, the pane opens and the scan starts.
3. The button **New Features Tier List** appears to the right of **✨ Melhorar Prompt**.
4. The pane shows the summary line, the criteria line and the tiers S–D, in order.
5. Each item shows its ID, `[Feature]` or `[Fix]`, impact, risk, a description and the three buttons.
6. **Copiar ID** puts the ID on the clipboard (paste to confirm).
7. Tick two items, then **Copiar selecionados (2)** and paste: two lines of `ID — title`.
8. **Perguntar** on an item: type a question, press Enter. A *respondendo…* line appears, then the answer under the item. Ask a second question and confirm both stay visible.
9. **Escanear de novo** replaces the list and clears answers and selection.
10. In an empty folder, the pane says there is nothing readable to analyze.
11. With the network off or the model failing, the pane shows a red error and **Tentar de novo**.
12. `/tiers min=5 max=10` gives between 5 and 10 items. `/tiers min=50 max=10` shows the error and starts no scan.
13. Melhorar Prompt still works: its button, `/melhorar` and its pane are unchanged.
