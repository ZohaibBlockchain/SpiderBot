import express from "express";
const app = express();
const port = 443;
import { _tradeEngine, IterationTime } from "./trade.js";

process.on('uncaughtException', function (err) {
  console.log(err);
});


process.on('TypeError', function (err) {
  console.log(err);
});

let delay = 0;
async function botCore() {

  if (delay > 50) {
    await _tradeEngine();
  }
  else {
    console.log('Init...')
  }
  setTimeout(botCore, IterationTime * 400);
  delay++;

}

botCore();


