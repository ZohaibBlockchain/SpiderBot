import express from "express";
const app = express();
const port = 443;
import {_tradeEngine,IterationTime } from "./trade.js";

process.on('uncaughtException', function (err) {
  console.log(err);
});


process.on('TypeError', function (err) {
  console.log(err);
});

let DisplayCounter = 0;
async function botCore() {
 
  await _tradeEngine();
  setTimeout(botCore, IterationTime*1000);
}

 botCore();



//  if (DisplayCounter > 30) {
//   console.clear();
//   console.log('V1 SYTHE AI Bot +_+ : ');
//   console.log('Current Instruments are:');
//    console.log('SYTHE BOT Health 100 % and total number of trade are: ');
//   DisplayCounter = 0;
// }