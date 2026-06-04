import "fake-indexeddb/auto";

const NativeRequest = globalThis.Request;

function normalizeRequestSignal(init?: RequestInit): RequestInit | undefined {
  if (!init?.signal) {
    return init;
  }
  const nextInit: RequestInit = { ...init };
  delete (nextInit as RequestInit & { signal?: AbortSignal }).signal;
  return nextInit;
}

if (NativeRequest) {
  class VitestCompatibleRequest extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, normalizeRequestSignal(init));
    }
  }

  globalThis.Request = VitestCompatibleRequest as typeof Request;
}
