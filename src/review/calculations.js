// Adapted from Hindsight. Copyright (c) 2026 plinluu. All rights reserved.
var MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function num(value) {
  if (typeof value === "number") {
    return isFinite(value) ? value : NaN;
  }
  if (value == null) {
    return NaN;
  }
  var text = String(value).trim();
  if (!text) {
    return NaN;
  }

  var negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/-\s*$/.test(text)) {
    negative = !negative;
    text = text.replace(/-\s*$/, "");
  }

  text = text.replace(/[^0-9.+\-]/g, "");
  if (text.indexOf("-") > 0) {
    text = text.replace(/-/g, "");
  }
  if (negative) {
    text = "-" + text.replace(/^-/, "");
  }

  var parsed = parseFloat(text);
  return isFinite(parsed) ? parsed : NaN;
}

function validYmd(year, month, day) {
  if (!(year >= 1900 && year <= 2200) || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  var check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
}

function isoDate(value) {
  var text = String(value == null ? "" : value).trim();
  var match;

  if ((match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) {
    var y1 = +match[1], m1 = +match[2], d1 = +match[3];
    return validYmd(y1, m1, d1) ? y1 + "-" + pad2(m1) + "-" + pad2(d1) : null;
  }

  if ((match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) {
    var y2 = +match[1], m2 = +match[2], d2 = +match[3];
    return validYmd(y2, m2, d2) ? y2 + "-" + pad2(m2) + "-" + pad2(d2) : null;
  }

  if ((match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    var a = +match[1], b = +match[2], year = +match[3];
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    var month = a > 12 ? b : a;
    var day = a > 12 ? a : b;
    return validYmd(year, month, day) ? year + "-" + pad2(month) + "-" + pad2(day) : null;
  }

  if ((match = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s,]+(\d{2,4})$/))) {
    var day3 = +match[1];
    var month3 = MONTHS[match[2].toLowerCase()];
    var year3 = +match[3];
    if (year3 < 100) {
      year3 += year3 >= 70 ? 1900 : 2000;
    }
    return month3 && validYmd(year3, month3, day3) ? year3 + "-" + pad2(month3) + "-" + pad2(day3) : null;
  }

  if ((match = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/))) {
    var month4 = MONTHS[match[1].toLowerCase()];
    var day4 = +match[2];
    var year4 = +match[3];
    return month4 && validYmd(year4, month4, day4) ? year4 + "-" + pad2(month4) + "-" + pad2(day4) : null;
  }

  if ((match = text.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    var y5 = +match[1], m5 = +match[2], d5 = +match[3];
    return validYmd(y5, m5, d5) ? y5 + "-" + pad2(m5) + "-" + pad2(d5) : null;
  }

  var parsed = new Date(text);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getFullYear() + "-" + pad2(parsed.getMonth() + 1) + "-" + pad2(parsed.getDate());
}

function addDays(date, days) {
  var parts = String(date).split("-").map(Number);
  var value = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  var a = String(from).split("-").map(Number);
  var b = String(to).split("-").map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
}

/* ---------- column mapping ---------- */

function makeTrade(input) {
  var days = daysBetween(input.bd, input.sd);
  var ret = input.bp ? ((input.sp - input.bp) / input.bp) * 100 : 0;
  var gross = (input.sp - input.bp) * input.q;
  var fee = input.fee || 0;
  var fx = input.fx || 0;
  return {
    tk: input.tk,
    bd: input.bd,
    bp: input.bp,
    sd: input.sd,
    sp: input.sp,
    q: input.q,
    fee: fee,
    fx: fx,
    days: days,
    ret: ret,
    gross: gross,
    net: gross - fee - fx,
    cost: input.bp * input.q,
    run: input.run == null ? null : input.run,
    rev: false,
    idx: input.idx == null ? null : input.idx
  };
}

function flagRevenge(trades) {
  const losses = new Map();
  for (const t of trades) if (t.gross < 0) losses.set(t.sd, (losses.get(t.sd) || 0) + 1);
  for (const t of trades) {
    t.rev = false;
    for (let gap = 0; gap <= 5; gap++) {
      const date = addDays(t.bd, -gap);
      const self = t.sd === date && t.gross < 0 ? 1 : 0;
      if ((losses.get(date) || 0) > self) { t.rev = true; break; }
    }
  }
  return trades;
}

function priceAt(series, date) {
  if (!Array.isArray(series) || !series.length) {
    return null;
  }
  let left = 0, right = series.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (series[middle].d <= date) left = middle + 1;
    else right = middle;
  }
  const point = series[left - 1];
  return point && date <= addDays(point.d, 7) ? point.c : null;
}

function horizonPrice(trade, series, horizon) {
  if (!Array.isArray(series) || !series.length || series[series.length-1].d < trade.sd) {
    return null;
  }
  if (!horizon) {
    return series[series.length - 1].c;
  }
  const target = addDays(trade.sd, horizon);
  return target > new Date().toISOString().slice(0,10) ? null : priceAt(series, target);
}

function regretRows(trades, seriesByTicker, horizon) {
  var rows = [];
  trades.forEach(function (trade) {
    var later = horizonPrice(trade, seriesByTicker[trade.tk], horizon);
    if (later == null) {
      return;
    }
    rows.push({ t: trade, l: later, c: (later - trade.sp) * trade.q });
  });
  return rows;
}

function enrichTrades(trades, seriesByTicker) {
  trades.forEach(function (trade) {
    var series = seriesByTicker[trade.tk];
    if (!Array.isArray(series) || !series.length) {
      trade.run = null;
      return;
    }
    var current = priceAt(series, trade.bd);
    var before = priceAt(series, addDays(trade.bd, -28));
    trade.run = current != null && before != null && before !== 0 ? ((current / before) - 1) * 100 : null;
  });
  return trades;
}

/* ---------- CSV export ---------- */

function csvCell(value) {
  if (value == null) {
    return "";
  }
  var text = String(value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function csvText(value) {
  var text = String(value == null ? "" : value);
  // Prevent spreadsheet formula injection for text cells.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }
  return csvCell(text);
}

function moneyCell(value) {
  return value == null || !isFinite(value) ? "" : round2(value).toFixed(2);
}

function tradesToCsv(trades, seriesByTicker, horizon) {
  var header = [
    "Symbol", "Bought", "Sold", "Quantity", "Buy price", "Sell price",
    "Fees", "Currency conversion", "Gross profit/loss", "Net profit/loss",
    "Hold days", "Price at horizon", "Missed upside (+) / saved (-)"
  ].map(csvCell).join(",");

  var lines = trades.slice().sort(function (left, right) {
    if (left.sd < right.sd) return -1;
    if (left.sd > right.sd) return 1;
    return 0;
  }).map(function (trade) {
    var later = horizonPrice(trade, seriesByTicker[trade.tk], horizon);
    var delta = later == null ? null : (later - trade.sp) * trade.q;
    return [
      csvText(trade.tk),
      csvCell(trade.bd),
      csvCell(trade.sd),
      moneyCell(trade.q),
      moneyCell(trade.bp),
      moneyCell(trade.sp),
      moneyCell(trade.fee),
      moneyCell(trade.fx),
      moneyCell(trade.gross),
      moneyCell(trade.net),
      csvCell(trade.days),
      moneyCell(later),
      moneyCell(delta)
    ].join(",");
  });

  return [header].concat(lines).join("\r\n");
}


export {num, isoDate, addDays, makeTrade, flagRevenge, horizonPrice, regretRows, enrichTrades, tradesToCsv};
