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
- To load a mod in every new Code-tab session, add its folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`, with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`. Separate several folders with `;`.
- The setting is read at session start, so test in a **new** session.
