export function isSharedBoardLink(from: string | string[] | undefined): boolean {
  const value = Array.isArray(from) ? from[0] : from;
  return value === "share";
}
