# HireWave v0.6 Card fix

Your error: `Property 'id' does not exist on type ... Card` from `apps/web/src/pages/Plugins.tsx`.

**Root cause:** The reusable Card component only declared `children` and `className`, while the extractor passed an `id` attribute. The fix lets Card accept standard HTML `<div>` props, preserving both the `id` and the v0.6 neon styling.

### Automatic Windows fix

1. Extract the ZIP to any folder, for example `D:\HireWave_v2\CardFix`.
2. Stop the HireWave server (Ctrl+C).
3. Open PowerShell and run:

```powershell
cd "D:\HireWave_v2\CardFix"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALL_CARD_FIX.ps1" -ProjectPath "D:\HireWave_v2"
cd "D:\HireWave_v2"
npm.cmd run build
npm.cmd run dev
```

The installer makes a dated backup of the existing `apps/web/src/components/ui.tsx` and stops safely if that file differs from the expected version.

### Manual alternative

Copy `ui.tsx` from this ZIP to `D:\HireWave_v2\apps\web\src\components\ui.tsx`, backing up the original first. Prefer the installer if you have customized the file.

**Validation:** Targeted source diff and archive integrity checked. The full build needs to run locally because this environment does not contain all project dependencies.
