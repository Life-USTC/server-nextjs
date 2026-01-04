import { parse } from "node-html-parser";

export interface CASResponse {
  success: boolean;
  user?: string;
  attributes?: { [key: string]: string };
}

export function parseCASResponse(xmlText: string): CASResponse {
  try {
    // Parse the XML response
    const root = parse(xmlText);

    // Find authenticationSuccess element by searching all elements
    let authSuccess = null;
    const allElements = root.querySelectorAll("*");

    for (const element of allElements) {
      const tagName = element.tagName.toLowerCase();
      if (
        tagName.includes("authenticationsuccess") ||
        tagName === "authenticationsuccess"
      ) {
        authSuccess = element;
        break;
      }
    }

    if (!authSuccess) {
      return { success: false };
    }

    // Extract user ID by searching for user element within authSuccess
    let userElement = null;
    const authChildren = authSuccess.querySelectorAll("*");

    for (const element of authChildren) {
      const tagName = element.tagName.toLowerCase();
      if (tagName.includes("user") && tagName !== "authenticationsuccess") {
        userElement = element;
        break;
      }
    }

    const user = userElement?.textContent?.trim() || "";

    // Extract attributes
    const attributes: { [key: string]: string } = {};
    let attributesElement = null;

    for (const element of authChildren) {
      const tagName = element.tagName.toLowerCase();
      if (tagName === "attributes") {
        attributesElement = element;
        break;
      }
    }

    if (attributesElement) {
      // Parse all attribute elements within the attributes container
      const attributeElements = attributesElement.querySelectorAll("*");

      attributeElements.forEach((element) => {
        let key = element.tagName.toLowerCase();
        // Remove namespace prefix (e.g., "cas:gid" -> "gid")
        if (key.includes(":")) {
          key = key.split(":")[1];
        }
        const value = element.textContent?.trim() || "";
        if (key && value) {
          attributes[key] = value;
        }
      });
    }

    return {
      success: true,
      user,
      attributes,
    };
  } catch (error) {
    console.error("❌ Error parsing CAS response:", error);
    return { success: false };
  }
}
