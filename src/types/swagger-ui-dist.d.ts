declare module "swagger-ui-dist/swagger-ui-bundle" {
  type SwaggerUIBundleConfig = {
    url: string;
    dom_id: string;
    deepLinking?: boolean;
  };

  export default function SwaggerUIBundle(
    config: SwaggerUIBundleConfig,
  ): unknown;
}
