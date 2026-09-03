import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

import { WEB_CSS } from "@/styles/webGlobalStyles";

/**
 * Static HTML shell for the web build (expo-router `+html`). Only used
 * when `web.output` is `"static"`; this app renders as a single-page app,
 * so the same rules are also injected at runtime from
 * `styles/webGlobalStyles`. Kept here so the shell is correct if static
 * rendering is ever enabled.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: WEB_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
