import Binance from "node-binance-api";
import dotenv from "dotenv";
import http from 'http';
import { maintainArr, trend } from './functions.js';
dotenv.config();


const binance = new Binance().options({
  APIKEY: process.env.API_KEY,
  APISECRET: process.env.API_SECRET,
});
export const IterationTime = 1;//one second
const desireProfitPercentage = 0.25;
const totalPNL = 0;
let ProfitableTrades = 0;
let lossTrades = 0;

let BTCPrice = [];



async function updatePrice(symbol, price) {
  if (symbol == "BTCUSDT") {
    maintainArr(BTCPrice, parseFloat(price));
  }
  else if (symbol == "ETHUSDT") {
    maintainArr(ETHPrice, parseFloat(price));
  }
  else if (symbol == "LTCUSDT") {
    maintainArr(LTCPrice, parseFloat(price));
  }
}


function getPriceArr(symbol) {
  if (symbol == "BTCUSDT") {
    return BTCPrice
  }
  else if (symbol == "ETHUSDT") {
    return ETHPrice;
  }
  else if (symbol == "LTCUSDT") {
    return LTCPrice;
  }
}

// sample
// {
//   symbol: 'BTCUSDT',
//   positionAmt: 60,
//   leverageAmt: 10,
//   flags: [ 'long', 'long', 'short', 'short', 'long', 'short' ]
// }



// {
//   symbol: 'BTCUSDT',
//   positionAmt: '-0.001',
//   entryPrice: '30289.9',
//   markPrice: '30322.10000000',
//   unRealizedProfit: '-0.03220000',
//   liquidationPrice: '110767.92485060',
//   leverage: '2',
//   maxNotionalValue: '300000000',
//   marginType: 'cross',
//   isolatedMargin: '0.00000000',
//   isAutoAddMargin: 'false',
//   positionSide: 'BOTH',
//   notional: '-30.32210000',
//   isolatedWallet: '0',
//   updateTime: 1681396184840
// }

// { symbol: instruments.symbol, side: side, tradeAmount: Math.abs(instruments.positionAmt), leverage: instruments.leverage, markPrice: instruments.markPrice, price: instruments.entryPrice }

export async function _tradeEngine() {
  getTradeInfo().then(async (value) => {
    const Instrument = JSON.parse(value)[0];
    await getPositionData().then(async (position) => {
      if (position.positions.length > 0)//Trade exits
      {
        let _position = position.positions[0];
        let side = getType(_position.positionAmt);
        let totalFee = getFees({ tradeAmount: _position.positionAmt, price: _position.entryPrice });
        let dp = await checkDesireProfit({ symbol: _position.symbol, side: side, tradeAmount: Math.abs(_position.positionAmt), leverage: _position.leverage, markPrice: _position.markPrice, price: _position.entryPrice }, totalFee)
        console.log('DP: ',dp);
        console.log('DP C: ', dp.profitable);
        if (dp.profitable) {
          console.log('DP C: ', dp.profitable);
          let prvTrade = await settlePreviousTrade({ side: side, tradeAmount: Math.abs(_position.positionAmt), symbol: _position.symbol });
          if (prvTrade["symbol"] == _position.symbol) {//confirmed closed
            return;
          }
        } else {
          console.log('Not profitable ', dp);
          if (dp.profitPercentage <= -1.5) {
            let prvTrade = await settlePreviousTrade({ side: side, tradeAmount: Math.abs(_position.positionAmt), symbol: _position.symbol });
            if (prvTrade["symbol"] == _position.symbol) {//confirmed closed
              return;
            }
          }
        }
      }
      else {//Not exits
        if (openPosition(Instrument.flags[0])) {
          let price = await getInstrumentPrice(Instrument.symbol);
          let positionAmt = Instrument.positionAmt;//Means USD amount
          let leverageAmt = Instrument.leverageAmt;
          let tradeAmt = ((positionAmt * leverageAmt) / price).toFixed(3);
          let _setLeverage = await setLeverage({ symbol: Instrument.symbol, leverage: leverageAmt });
          if (_setLeverage["leverage"] == leverageAmt) {
            let newTrade = await CreateNewTrade({ side: Instrument.flags[0], tradeAmount: tradeAmt, symbol: Instrument.symbol });
            console.log(newTrade);
            if (newTrade["symbol"] == Instrument.symbol) {//successfully created new trade
              console.log('Trade executed')
            } else {
              throw ('unable to place trade');
            }
          } else {
            throw ('unable to set leverage');
          }
        } else {
          console.log('Looking for Trades');
        }
      }
    });
  });
}

















async function getTradeInfo() {
  return new Promise(async (resolve, reject) => {
    const options = {
      hostname: '3.10.246.161',
      port: 80,
      path: '/getsignals',
      method: 'GET'
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.end();
  });
}







async function getInstrumentPrice(symbol) {
  return new Promise(async (resolve, reject) => {
    try {
      let value = await binance.futuresPrices()
      const BTCUSDTValue = value.BTCUSDT;
      resolve(BTCUSDTValue);
    } catch (error) {
      reject(undefined);
    }
  });
}



async function setLeverage(instrument) {
  try {
    return await binance.futuresLeverage(instrument.symbol, instrument.leverage);
  } catch (error) {
    console.log(error);
  }
}


async function settlePreviousTrade(instrument) {
  console.log(instrument,' SPT');
  return new Promise(async (resolve, reject) => {
    if (instrument.side == "long") {
      resolve(
        await binance.futuresMarketSell(instrument.symbol, instrument.tradeAmount)
      );
    } else {
      resolve(
        await binance.futuresMarketBuy(instrument.symbol, instrument.tradeAmount)
      );
    }
  });
}


async function CreateNewTrade(Instrument) {
  return new Promise(async (resolve, reject) => {
    console.log(Instrument);
    if (Instrument.side == "long") {
      resolve(
        await binance.futuresMarketBuy(Instrument.symbol, Instrument.tradeAmount)
      );
    } else if (Instrument.side == "short") {
      resolve(
        await binance.futuresMarketSell(Instrument.symbol, Instrument.tradeAmount)
      );
    }
    else {
      console.log('Unable to detect right weight')
      reject(false);
    }
  });
}



function getFees(instrument) {
  console.log(instrument);
  const tradeAmount = Math.abs(instrument.tradeAmount); // Example trade amount in BTC
  const takerFeeRate = 0.0004; // Taker fee 
  const usdtRate = instrument.price; // Example BTC/USDT exchange rate
  let fee = tradeAmount * takerFeeRate;
  const feeInBaseCurrency = fee * usdtRate; // Convert the fee amount to USDT
  return (feeInBaseCurrency * 2);
}



async function checkDesireProfit(instrument, fee) {

  console.log('CP: ',instrument);
  let getCurrentPrice = instrument.markPrice;
  let orignalAmount = (getCurrentPrice * instrument.tradeAmount) / instrument.leverage;
  if (instrument.side == 'long' && instrument.price > 0) {
    let pnl = (((getCurrentPrice - instrument.price) * instrument.tradeAmount) - fee);
    let profitPercentage = (pnl / orignalAmount) * 100;
    if (pnl > 0) {
      if (profitPercentage >= desireProfitPercentage) {

        let direction = trend(getPriceArr(instrument.symbol).splice(-15));
        if (instrument.side == 'short') {
          if (direction == 'long') {
            return { profitable: true, profitPercentage: profitPercentage, pnl: pnl }
          } else {
            return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
          }
        }
        else if (instrument.side == 'long') {

          if (direction == 'long') {
            return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
          } else {
            return { profitable: true, profitPercentage: profitPercentage, pnl: pnl }
          }
        }
        else {
          return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
        }

      } else {
        return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
      }
    } else {
      return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
    }

  } else if (instrument.side == 'short' && instrument.price > 0) {

    let pnl = ((instrument.price - getCurrentPrice) * instrument.tradeAmount - fee);
    let profitPercentage = (pnl / orignalAmount) * 100;
    if (pnl > 0) {

      if (profitPercentage >= desireProfitPercentage) {
        return { profitable: true, profitPercentage: profitPercentage, pnl: pnl }
      } else {
        return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
      }
    } else {
      return { profitable: false, profitPercentage: profitPercentage, pnl: pnl }
    }
  }
  else {

  }
}



function blackFlag(side, flagSide) {
  if (side != flagSide) {
    return true;
  } else {
    return false;
  }
}









async function getPositionData() {
  let position_data = await binance.futuresPositionRisk(), markets = Object.keys(position_data);
  let Positions = [];
  let counter = 0;
  position_data.forEach(element => {
    if (element.positionAmt != 0) {
      Positions.push(element);
      counter++;
    }
  });
  return { positions: Positions, counter: counter };
}



function getType(value) {
  if (value < 0) {
    return "short";
  } else {
    return "long";
  }
}


function getSellFlag(flags) {
  console.log(flags);
  if (flags[0] == flags[1] && flags[0] == flags[4]) {
    return flags[0];
  }
  else {
    return undefined;
  }
}





async function openPosition(flag) {
  const signalOne = flag;
  let signalTwo = trend(BTCPrice.slice(-15));
  if (signalOne == signalTwo) {
    return true;
  } else {
    return false;
  }
}

