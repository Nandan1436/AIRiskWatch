// Render a DOT file with Graphviz (WASM) and rasterize the SVG with headless Chrome.
// usage: node render_dot.mjs <in.dot> <out.png> [engine] [scale]
import { readFileSync, writeFileSync } from "node:fs";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import puppeteer from "puppeteer";

const [, , input, output, engine = "neato", scaleArg = "3"] = process.argv;
const graphviz = await Graphviz.load();
const svg = graphviz.layout(readFileSync(input, "utf8"), "svg", engine, { nop: engine === "neato" ? 2 : undefined });
writeFileSync(output.replace(/\.png$/, ".svg"), svg);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600, deviceScaleFactor: Number(scaleArg) });
await page.setContent(`<html><body style="margin:0;background:white">${svg}</body></html>`);
const el = await page.$("svg");
await el.screenshot({ path: output, omitBackground: false });
await browser.close();
console.log("wrote", output);
