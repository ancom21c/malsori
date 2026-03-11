export interface BackendTextFieldSpec {
  name: string;
  autoComplete: string;
  type: "text" | "url" | "password";
  placeholder?: string;
  helperTextKey?: string;
}

export interface BackendCredentialFieldSpec extends BackendTextFieldSpec {
  helperTextKey: string;
}

export function resolveBackendAdminTokenFieldSpec(): BackendCredentialFieldSpec {
  return {
    name: "backend-admin-token",
    autoComplete: "new-password",
    type: "password",
    placeholder: "X-Malsori-Admin-Token",
    helperTextKey: "backendAdminTokenHelperDetailed",
  };
}

export function resolveBackendPresetFieldSpecs(input: {
  hasStoredClientId: boolean;
  hasStoredClientSecret: boolean;
}) {
  return {
    presetName: {
      name: "backend-preset-name",
      autoComplete: "off",
      type: "text",
    } satisfies BackendTextFieldSpec,
    description: {
      name: "backend-preset-description",
      autoComplete: "off",
      type: "text",
    } satisfies BackendTextFieldSpec,
    apiBaseUrl: {
      name: "backend-preset-api-base-url",
      autoComplete: "off",
      type: "url",
      placeholder: "https://openapi.vito.ai",
      helperTextKey: "backendPresetApiBaseUrlHelper",
    } satisfies BackendCredentialFieldSpec,
    clientId: {
      name: "backend-preset-client-id",
      autoComplete: "off",
      type: "text",
      placeholder: "rtzr-cloud-client-id",
      helperTextKey: input.hasStoredClientId
        ? "clientIdOverwriteHelper"
        : "clientIdFieldHelper",
    } satisfies BackendCredentialFieldSpec,
    clientSecret: {
      name: "backend-preset-client-secret",
      autoComplete: "new-password",
      type: "password",
      placeholder: "rtzr-cloud-client-secret",
      helperTextKey: input.hasStoredClientSecret
        ? "clientSecretOverwriteHelper"
        : "clientSecretFieldHelper",
    } satisfies BackendCredentialFieldSpec,
  };
}
