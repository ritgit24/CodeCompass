import {
  GitPullRequest,
  Map as MapIcon,
  MessageSquareCode,
  Target,
  Network,
  ListChecks,
  ShieldCheck,
  FileDiff,
  Terminal,
} from "lucide-react";

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const STEPS = [
  {
    icon: MapIcon,
    title: "Map",
    body: "We clone and parse the repo, then draw a module graph so you can see how the pieces fit together.",
  },
  {
    icon: MessageSquareCode,
    title: "Ask",
    body: "Chat with the codebase. Every answer cites the exact files and lines it used as sources.",
  },
  {
    icon: Target,
    title: "Match",
    body: "Open issues are ranked by difficulty and estimated time, then matched to your skill level.",
  },
  {
    icon: GitPullRequest,
    title: "Ship",
    body: "An agent plans the fix, you review the diff and run tests — then export a ready draft PR.",
  },
];

export const FEATURES = [
  {
    icon: Network,
    title: "Architecture map",
    body: "Interactive module graph with import edges, colour-coded by language and layer.",
  },
  {
    icon: MessageSquareCode,
    title: "Ask the Repo",
    body: "Streaming answers with source chips that jump straight to the relevant code.",
  },
  {
    icon: ListChecks,
    title: "Issue matcher",
    body: "Heuristic + LLM difficulty scoring, so beginners start where they'll succeed.",
  },
  {
    icon: FileDiff,
    title: "Reviewable diffs",
    body: "Per-file side-by-side diffs. Accept or reject each change before anything is kept.",
  },
  {
    icon: Terminal,
    title: "Tests in a sandbox",
    body: "Changes run in a throwaway clone on a scratch branch. Nothing touches your repo.",
  },
  {
    icon: ShieldCheck,
    title: "Human in control",
    body: "Plan first, diff second, apply last. No automatic pushes, ever.",
  },
];

export const PREVIEW_NODES = ["web", "api", "db", "agent", "shared"];
export const PREVIEW_TABS = ["Overview", "Map", "Ask", "Issues"];
