/** Public front-door routes: Landing UI, no wallet boot until Enter. */
export function isLandingFrontDoor(route: {
  name?: string | symbol | null | undefined;
  path?: string;
}): boolean {
  if (route.name === "landing" || route.name === "gate") return true;
  const path = route.path ?? "";
  return path === "/" || path === "/gate";
}
