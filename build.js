#!/usr/bin/env node
// Builds the single-file app from src/. Usage: node build.js
const fs=require("fs"),path=require("path");
const S=p=>fs.readFileSync(path.join(__dirname,"src",p),"utf8");
const js=fs.readdirSync(path.join(__dirname,"src","js")).filter(f=>f.endsWith(".js")).sort()
  .map(f=>"/* ==== src/js/"+f+" ==== */\n"+S("js/"+f)).join("\n");
let html=S("template.html").replace("/*__CSS__*/",()=>S("styles.css")).replace("//__JS__",()=>js);
html=html.replace("<!DOCTYPE html>","<!DOCTYPE html>\n<!-- GENERATED FILE — do not edit. Edit src/ and run: node build.js -->");
for(const out of ["index.html","LitNet.html"]) fs.writeFileSync(path.join(__dirname,out),html);
console.log("Built index.html + LitNet.html ("+html.length+" bytes)");
