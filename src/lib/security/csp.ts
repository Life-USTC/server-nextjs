const ANALYTICS_SCRIPT_SOURCES = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
];

const SWAGGER_UI_SOURCES = ["https://unpkg.com"];

const ANALYTICS_CONNECT_SOURCES = [
  "https://www.google-analytics.com",
  "https://www.googletagmanager.com",
  "https://analytics.google.com",
];

function toOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

function getStorageConnectSources() {
  return Array.from(
    new Set(
      [
        toOrigin(process.env.S3_ENDPOINT),
        toOrigin(process.env.R2_ACCESS_URL),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

const EXTERNAL_IMAGE_SOURCES = [
  "https://www.google-analytics.com",
  "https://www.googletagmanager.com",
  "https://avatars.githubusercontent.com",
  "https://*.googleusercontent.com",
  "https://api.dicebear.com",
];

export function createScriptNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const value = String.fromCharCode(...bytes);
  return btoa(value);
}

export function buildContentSecurityPolicy(
  nonce: string,
  options: { isDevelopment?: boolean } = {},
) {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...ANALYTICS_SCRIPT_SOURCES,
    ...SWAGGER_UI_SOURCES,
  ];

  if (options.isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${SWAGGER_UI_SOURCES.join(" ")}`,
    `img-src 'self' data: blob: ${[...EXTERNAL_IMAGE_SOURCES, ...SWAGGER_UI_SOURCES].join(" ")}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${[...ANALYTICS_CONNECT_SOURCES, ...getStorageConnectSources()].join(" ")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ];

  return directives.join("; ");
}
