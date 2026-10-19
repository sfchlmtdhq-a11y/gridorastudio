# Gridora Studio — Active Work

## Unified color picker
- [x] Make every editor color tab use the same picker layout shown in the supplied screenshot: current-color swatch, editable HEX/RGB value row, eyedropper and edit controls, a circular hue/saturation wheel, color/lightness/opacity sliders, and Cancel/OK actions.
- [x] Keep the picker usable on mobile, tablet and desktop; keep the selected color preview visible and preserve live canvas preview, cancel/revert and apply behavior.
- [x] Route every color field (text, shapes/fill, stroke, shadow, drawing, background/gradient, eraser and new-design background) through the shared picker without removing color palette or eyedropper functionality.

## Responsive panel and overlay overflow
- [x] Make all tool panels fit the available screen height, with vertical scrolling for panels that have many options; keep the first and last options accessible.
- [x] Fix clipped text, elements, buttons, settings, dropdowns and popups at phone, tablet and desktop sizes by correcting shared layout/CSS constraints rather than adding temporary per-screen workarounds.
- [x] Preserve Gridora's existing design, tools, canvas and functionality; inspect affected panels and run the production build.

## Mobile Save to gallery
- [x] Share the exported PNG through the native file-sharing sheet when supported, preserving the user gesture; fall back to downloading the PNG on browsers without file sharing.
