declare module "rehype-attr" {
  import type { Plugin } from "unified";
  const rehypeAttr: Plugin<[{ properties?: "attributes" | "data" | "none" }]>;
  export default rehypeAttr;
}
