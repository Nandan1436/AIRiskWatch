import { Bot, CircleHelp, Crosshair, FlaskConical, Rocket, Shuffle, User, type LucideIcon } from "lucide-react";
import type { CausalDimension } from "../../constants/mitTaxonomy";

const ICONS: Record<string, LucideIcon> = {
  "entity:human": User,
  "entity:ai": Bot,
  "intent:intentional": Crosshair,
  "intent:unintentional": Shuffle,
  "timing:pre-deployment": FlaskConical,
  "timing:post-deployment": Rocket,
};

/** Icon for a causal category; "Other" categories share a question mark. */
export function causalIcon(dimension: CausalDimension, slug: string): LucideIcon {
  return ICONS[`${dimension}:${slug}`] ?? CircleHelp;
}
