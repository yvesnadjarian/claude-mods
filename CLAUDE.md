# Claude desktop mods

Each folder here is one mod (a Claude Code plugin with a hooks module) for the Claude desktop app's Code tab.

## A mod is not done until the engine validates it

TypeScript passing is not enough: the engine runs extra checks, and when it refuses a module the desktop app shows **no error**. The mod just silently does nothing.

Before saying a mod is done, after every change:

1. Find the Claude Code binary bundled with the desktop app (there is no `claude` on PATH). Its version folder changes when the app updates, so look it up:
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Claude-Data\*\claude-code\*\*\claude.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
   ```
2. Run `<that claude.exe> plugin validate <mod folder>`.
3. The "Validating hooks" section must show no errors. Warnings about README, LICENSE or icon only matter when publishing to the plugin directory.
4. Also type-check the module (`tsc` with the tsconfig from the engine's types header).

## Engine rules that TypeScript doesn't catch

- Any function that takes `$` must be declared at the **top level** of the file (a `function`, or a `const` bound to one). Never define it inside `register`.
- `atom()` references must use **literal strings**: `atom({ plugin: 'my-mod', key: 'run' } as const, ...)`, not a constant like `plugin: PLUGIN`.

## Installing for the desktop app

- Mods written to `~/.claude/dev-mods/<session>/` load only in that one session.
- This folder is a plugin marketplace (`.claude-plugin/marketplace.json`, name `yves-mods`). Every mod must be listed there.
- Install each mod at **user scope** from this local folder, with the bundled `claude.exe`:
  `<claude.exe> plugin install <mod> --marketplace C:\Users\Yves\Documents\claude_projects\mods --scope user`
  The installed plugin is read straight from this folder, so later edits apply to new sessions without reinstalling.
- Do **not** use `CLAUDE_CODE_PLUGIN_DIRS` for the desktop app: it loads the code, but the button and slash command never show up.
- Plugins load at session start, so test in a **new** Code-tab session.

## Desktop app limits to design around

- A brand-new Code-tab session starts its engine only when the first message is sent. Until then no mod can draw anything (no band, no pane). Give mods a trigger that works from the first message, e.g. a `prompt.submit` hook that reacts to a keyword.
- The desktop's `/` autocomplete doesn't list commands a mod registers with `$.command.register`. They still run when typed at the **start** of a message.
- To test a mod without the UI, run the engine headless: `<claude.exe> -p "<prompt>" --debug-file <log>`, then read the log for `hooks module <mod> loaded`, `refused` or `skipped`. Model calls fail there (no desktop login); that's expected.
