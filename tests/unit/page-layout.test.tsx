import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageLayout } from "@/components/page-layout";

describe("PageLayout", () => {
  it("renders breadcrumbs, header and content", () => {
    const html = renderToStaticMarkup(
      <PageLayout
        breadcrumbs={<nav aria-label="Breadcrumb">crumbs</nav>}
        title="Settings"
        description="Manage your account"
      >
        <div>content</div>
      </PageLayout>,
    );

    expect(html).toContain("crumbs");
    expect(html).toContain("Settings");
    expect(html).toContain("Manage your account");
    expect(html).toContain("content");
  });
});
