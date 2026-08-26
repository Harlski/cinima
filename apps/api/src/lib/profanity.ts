import { Filter } from "bad-words";

const filter = new Filter();

export function censorProfanity(text: string): string {
  return filter.clean(text);
}
