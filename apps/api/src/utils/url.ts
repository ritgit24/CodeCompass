export interface ParsedRepo {
  owner: string;
  name: string;
  url: string;
}

/** Accepts full GitHub URLs, ssh remotes, or "owner/name" shorthand. */
export function parseRepoUrl(input: string): ParsedRepo | null {
  const cleaned = input
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  if (!cleaned) return null;

  let owner: string | undefined;
  let name: string | undefined;

  const ssh = cleaned.match(/git@github\.com:([\w.-]+)\/([\w.-]+)/i);
  const https = cleaned.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i);
  const short = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);

  if (ssh) [, owner, name] = ssh;
  else if (https) [, owner, name] = https;
  else if (short) [, owner, name] = short;

  if (!owner || !name) return null;
  return { owner, name, url: `https://github.com/${owner}/${name}` };
}
