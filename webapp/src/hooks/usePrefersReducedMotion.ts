import useMediaQuery from "@mui/material/useMediaQuery";

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", { noSsr: true });
}

export default usePrefersReducedMotion;
