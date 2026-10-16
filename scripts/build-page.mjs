// Builds public/index.html from src/board.html (the same file as the Claude artifact preview),
// switching it to live mode: reads /api/sales, starts empty, hides the setup buttons unless the URL ends in #setup.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("src/board.html", "utf8");
const split = src.indexOf('<canvas id="sky"');
if (split < 0) throw new Error("Could not find the board body in src/board.html");
let head = src.slice(0, split), body = src.slice(split);

body = body.replace('feedUrl: "",', 'feedUrl: "/api/sales",');
if (!body.includes('feedUrl: "/api/sales"')) throw new Error("feedUrl marker not found");
// start with no example sales in live mode
body = body.replace(/let sales = \[[\s\S]*?\n\];/, "let sales = [];");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;
mkdirSync("public", { recursive: true });
writeFileSync("public/index.html", page);
console.log("Built public/index.html (" + page.length + " bytes)");
