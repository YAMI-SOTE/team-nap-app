import { Platform } from "react-native";

/**
 * Global CSS for the web build. `+html.tsx` only takes effect when
 * `web.output` is `"static"`; this project renders as a single-page app,
 * so we inject the same rules at runtime instead. No-op on native.
 *
 * Import once, for its side effect, from the root layout.
 */
export const WEB_CSS = `
html, body, #root { height: 100%; }
body { margin: 0; overscroll-behavior-y: none; }
#root { display: flex; }

/* No focus ring / inset shadow / native chrome around text inputs — the
   fields already have their own designed border. */
input, textarea, select, [contenteditable="true"] {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
  background-clip: padding-box;
}
input:focus, input:focus-visible,
textarea:focus, textarea:focus-visible { outline: none !important; }

/* No blue flash when tapping on mobile browsers. */
* { -webkit-tap-highlight-color: transparent; }
`;

if (Platform.OS === "web" && typeof document !== "undefined") {
  const id = "team-nap-web-globals";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = WEB_CSS;
    document.head.appendChild(style);
  }
}
