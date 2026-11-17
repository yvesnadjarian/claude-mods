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

## Notes

- Melhorar Prompt calls the Sonnet model once per analysis, billed to your own Claude account. It sends only the prompt text, not your conversation or files.
