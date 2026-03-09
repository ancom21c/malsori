import { useMemo } from "react";

export function useAppPortalContainer() {
  return useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }
    return document.getElementById("root");
  }, []);
}

export default useAppPortalContainer;
