"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: ((config: Record<string, unknown>) => void) & {
      presets?: {
        apis: unknown;
      };
    };
  }
}

const SWAGGER_SCRIPT_ID = "swagger-ui-bundle-script";
const SWAGGER_STYLE_ID = "swagger-ui-style";

export function SwaggerViewer() {
  useEffect(() => {
    const container = document.getElementById("swagger-ui");
    if (!container) return;

    const init = () => {
      if (!window.SwaggerUIBundle) return;

      container.innerHTML = "";
      window.SwaggerUIBundle({
        url: "/openapi.generated.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
      });
    };

    if (!document.getElementById(SWAGGER_STYLE_ID)) {
      const link = document.createElement("link");
      link.id = SWAGGER_STYLE_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css";
      document.head.appendChild(link);
    }

    if (window.SwaggerUIBundle) {
      init();
      return;
    }

    const existing = document.getElementById(
      SWAGGER_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", init, { once: true });
      return () => existing.removeEventListener("load", init);
    }

    const script = document.createElement("script");
    script.id = SWAGGER_SCRIPT_ID;
    script.src =
      "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js";
    script.async = true;
    script.addEventListener("load", init, { once: true });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", init);
    };
  }, []);

  return <div id="swagger-ui" className="min-h-screen" />;
}
