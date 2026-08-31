#!/usr/bin/env node
//
// Vérificateur de syntaxe hors-ligne pour JSX / TSX / JS / TS.
//
// Pourquoi : `npm run build` exige le réseau. Ce script s'appuie sur le
// parseur de TypeScript, déjà installé globalement, et ne télécharge rien.
// Il comprend réellement le JSX — contrairement à un simple comptage
// d'accolades, il ne se trompe pas sur les apostrophes du texte français
// (« Valider l'inventaire ») ni sur les littéraux de gabarit.
//
// Usage :
//   node tools/check-syntax.mjs                  # vérifie src/ par défaut
//   node tools/check-syntax.mjs src/App.jsx      # fichiers précis
//   node tools/check-syntax.mjs supabase/        # ou un dossier
//
// Code de sortie : 0 si tout est bon, 1 si au moins une erreur.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

/* ---------- Localisation de TypeScript ---------- */

const require = createRequire(import.meta.url);

function loadTypeScript() {
  const candidates = [];
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (globalRoot) candidates.push(join(globalRoot, "typescript"));
  } catch { /* npm indisponible : on tentera les autres chemins */ }
  candidates.push("typescript");

  for (const c of candidates) {
    try { return require(c); } catch { /* suivant */ }
  }
  console.error(
    "TypeScript est introuvable.\n" +
    "Installe-le une fois pour toutes : npm install -g typescript\n" +
    "(ou en local : npm install --save-dev typescript)",
  );
  process.exit(2);
}

const ts = loadTypeScript();

/* ---------- Sélection des fichiers ---------- */

const EXTS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);

function collect(target, out = []) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const entry of readdirSync(target)) {
      if (IGNORED_DIRS.has(entry)) continue;
      collect(join(target, entry), out);
    }
  } else if (EXTS.has(extname(target))) {
    out.push(target);
  }
  return out;
}

function scriptKindFor(file) {
  switch (extname(file)) {
    case ".jsx": return ts.ScriptKind.JSX;
    case ".tsx": return ts.ScriptKind.TSX;
    case ".ts": return ts.ScriptKind.TS;
    default: return ts.ScriptKind.JSX; // .js peut contenir du JSX dans un projet React
  }
}

/* ---------- Vérification ---------- */

function checkFile(file) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    scriptKindFor(file),
  );

  // parseDiagnostics n'est pas dans l'API publique mais reste le moyen le plus
  // direct d'obtenir les erreurs purement syntaxiques, sans résolution de types
  // ni accès au disque pour les imports.
  const diags = sf.parseDiagnostics ?? [];

  return diags.map((d) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    return {
      line: line + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
      sourceLine: source.split("\n")[line] ?? "",
    };
  });
}

/* ---------- Exécution ---------- */

const args = process.argv.slice(2);
const targets = args.length ? args : ["src"];

let files = [];
for (const t of targets) {
  const abs = resolve(t);
  try {
    files = files.concat(collect(abs));
  } catch {
    console.error(`Chemin introuvable : ${t}`);
    process.exit(2);
  }
}

if (files.length === 0) {
  console.error("Aucun fichier à vérifier.");
  process.exit(2);
}

let totalErrors = 0;
const cwd = process.cwd();

for (const file of files.sort()) {
  const errors = checkFile(file);
  const shown = relative(cwd, file) || file;

  if (errors.length === 0) {
    console.log(`  OK    ${shown}`);
    continue;
  }

  totalErrors += errors.length;
  console.log(`  ERR   ${shown}  (${errors.length})`);
  for (const e of errors) {
    console.log(`        ligne ${e.line}, colonne ${e.column} : ${e.message}`);
    const trimmed = e.sourceLine.trim();
    if (trimmed) {
      console.log(`        > ${trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed}`);
    }
  }
}

console.log("");
if (totalErrors === 0) {
  console.log(`Syntaxe valide — ${files.length} fichier(s) vérifié(s).`);
  process.exit(0);
}
console.log(`${totalErrors} erreur(s) de syntaxe sur ${files.length} fichier(s).`);
process.exit(1);
