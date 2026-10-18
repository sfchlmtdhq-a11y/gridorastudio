<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Designs are stored in browser localStorage via src/lib/projects.ts (no backend requested); editor uses fabric v6 loaded via dynamic import to stay SSR-safe.
- No templates anywhere in the app: user requirement for a pure blank-canvas workflow.
- Whole-design adjustments are serialized on the Fabric canvas and applied after compositing; this preserves individual layers and includes the effect in previews and exports.
- Font selection uses the dedicated FontPicker with semantic sample tones; this keeps the picker consistent without changing canvas text colors.

- The assistant validates shared action schemas and mutates the existing Fabric canvas inside one history transaction; no parallel canvas is created.
