import { WorldError } from "./errors.js";

export interface Avatar {
  id: string;
  name: string;
  color: string;
}

export const AVATARS: readonly [Avatar, ...Avatar[]] = [
  { id: "coral", name: "Coral", color: "#e07856" },
  { id: "mint", name: "Mint", color: "#7fc8a9" },
  { id: "sky", name: "Sky", color: "#6aa9e0" },
  { id: "butter", name: "Butter", color: "#e8c76a" },
  { id: "lilac", name: "Lilac", color: "#b48ee0" },
  { id: "rose", name: "Rose", color: "#e07fa3" },
  { id: "slate", name: "Slate", color: "#8a97a8" },
  { id: "moss", name: "Moss", color: "#9ab86a" },
];

export function getAvatar(avatarId: string): Avatar {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  if (!avatar) {
    throw new WorldError("avatar/unknown", `unknown avatar: ${avatarId}`);
  }
  return avatar;
}
