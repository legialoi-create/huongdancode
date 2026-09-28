/**
 * Utility functions for analyzing and checking candidate C++ source code.
 */

export function isRealCandidateCode(code: string | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim();
  if (trimmed.length < 15) return false;

  const stripped = trimmed
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "");

  if (
    stripped === "#include<iostream>usingnamespacestd;intmain(){intn;if(cin>>n){}return0;}" ||
    stripped === "#include<iostream>usingnamespacestd;intmain(){return0;}" ||
    stripped === "#include<bits/stdc++.h>usingnamespacestd;intmain(){return0;}" ||
    stripped === "intmain(){return0;}"
  ) {
    return false;
  }
  return true;
}
