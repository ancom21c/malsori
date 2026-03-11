import { describe, expect, it } from "vitest";
import {
  resolveBackendAdminTokenFieldSpec,
  resolveBackendPresetFieldSpecs,
} from "./settingsBackendFormModel";

describe("settingsBackendFormModel", () => {
  it("marks backend admin token as a secret field that avoids password-manager login autofill", () => {
    expect(resolveBackendAdminTokenFieldSpec()).toEqual({
      name: "backend-admin-token",
      autoComplete: "new-password",
      type: "password",
      placeholder: "X-Malsori-Admin-Token",
      helperTextKey: "backendAdminTokenHelperDetailed",
    });
  });

  it("keeps client id reviewable while client secret stays masked", () => {
    const specs = resolveBackendPresetFieldSpecs({
      hasStoredClientId: false,
      hasStoredClientSecret: true,
    });

    expect(specs.clientId).toEqual({
      name: "backend-preset-client-id",
      autoComplete: "off",
      type: "text",
      placeholder: "rtzr-cloud-client-id",
      helperTextKey: "clientIdFieldHelper",
    });
    expect(specs.clientSecret).toEqual({
      name: "backend-preset-client-secret",
      autoComplete: "new-password",
      type: "password",
      placeholder: "rtzr-cloud-client-secret",
      helperTextKey: "clientSecretOverwriteHelper",
    });
  });

  it("uses overwrite helper copy when a stored client id already exists", () => {
    const specs = resolveBackendPresetFieldSpecs({
      hasStoredClientId: true,
      hasStoredClientSecret: false,
    });

    expect(specs.clientId.helperTextKey).toBe("clientIdOverwriteHelper");
    expect(specs.apiBaseUrl.type).toBe("url");
    expect(specs.presetName.autoComplete).toBe("off");
    expect(specs.description.autoComplete).toBe("off");
  });
});
