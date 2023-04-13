export function maintainArr(arr, newElem) {
    if (arr.length >= 1800) {
        arr.shift();
    }
    arr.push(newElem);
}






export function trend(lastSecPrices) {
    if (lastSecPrices.length > 10) {
        const avgPrice = lastSecPrices.reduce((total, price) => total + price, 0) / lastSecPrices.length;
        const currentPrice = lastSecPrices[lastSecPrices.length - 1];
        if (currentPrice > avgPrice) {
            return 'up';
        } else if (currentPrice < avgPrice) {
            return 'down';
        } else {
            return 'flat';
        }
    }
    else {
        return 'flat';
    }
}




export function trendV2(arrPrice) {
    if (arrPrice.length > 10) {
      const averagePrice = arrPrice.reduce((total, price) => total + price, 0) / arrPrice.length;
      const currentPrice = arrPrice[arrPrice.length - 1];
      console.log(averagePrice, currentPrice);
      var percentageChange = ((currentPrice - averagePrice) / averagePrice) * 100;
      if (Math.abs(percentageChange) >= 0.25) {
        return { result: true, side: (percentageChange < 0) ? 'short' : 'long' };
      } else {
        return { result: false, side: (percentageChange < 0) ? 'short' : 'long' };
      }
    }
    else {
      return undefined;
    }
  }

