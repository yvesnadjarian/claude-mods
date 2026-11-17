# Claude mods

Mods for the Claude desktop app (Code tab) and Claude Code. Each folder is one mod; install only the ones you want.

| Mod | What it does |
| --- | --- |
| [melhorar-prompt](melhorar-prompt/) | Adds a **✨ Melhorar Prompt** button above the prompt box and a `/melhorar` command. It rewrites your prompt and lists clarifying questions, blind spots and feature ideas (in Portuguese), with buttons to use the improved prompt or answer the questions. |

## Install

**Claude desktop app:** click **+** next to the prompt box, then **Plugins → Add marketplace** and enter `yvesnadjarian/claude-mods`. Then **Add plugin** and pick the mods you want.

**Claude Code in a terminal**, at the prompt:

```
/plugin install melhorar-prompt --marketplace yvesnadjarian/claude-mods
```

From a shell:

```bash
claude plugin install melhorar-prompt --marketplace yvesnadjarian/claude-mods
```

Answer `y` to add the marketplace, then pick the user scope. Mods load in every new session after that.

## Using Melhorar Prompt

- Type your prompt and click **✨ Melhorar Prompt** above the prompt box, or
- end your prompt with `/melhorar` and press Enter, e.g. `crie um app de tarefas /melhorar`. The prompt is **not** sent to Claude: the analysis opens and your text goes back in the box.

In the desktop app, a brand-new session doesn't start its engine until the first message, so the button only appears after that. Ending your first prompt with `/melhorar` works from the start. The desktop app doesn't list mod commands in its `/` autocomplete; type the command anyway.

## Notes

- Melhorar Prompt calls the Sonnet model once per analysis, billed to your own Claude account. It sends only the prompt text, not your conversation or files.
