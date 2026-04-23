"use client";

import { useEffect } from "react";
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle";
import "swagger-ui-dist/swagger-ui.css";

const FALLBACK_PATHS = [
  "/api/sections",
  "/api/courses",
  "/api/teachers",
  "/api/semesters/current",
] as const;

export function SwaggerViewer() {
  useEffect(() => {
    const container = document.getElementById("swagger-ui");
    if (!container) return;

    container.replaceChildren();
    SwaggerUIBundle({
      url: "/openapi.generated.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
    });
  }, []);

  return (
    <div id="swagger-ui" className="min-h-screen">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-muted-foreground text-sm">Loading OpenAPI docs...</p>
        <ul className="mt-4 grid gap-2 font-mono text-sm">
          {FALLBACK_PATHS.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
