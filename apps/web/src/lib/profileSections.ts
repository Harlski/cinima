/** Profile panes under the Handle card. Order is the slider order. */
export const PROFILE_SECTIONS = [
  { id: "likes", label: "Likes" },
  { id: "posts", label: "Posts" },
  { id: "thanks", label: "Thanks" },
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = "likes";
