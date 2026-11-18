/*
 * Hindsight core: import parsing and trade matching.
 *
 * This file is deliberately dependency-free and DOM-free so it can run in the
 * browser and in Node's built-in test runner. It exposes window.HindsightCore.
 */
(function (root) {
  "use strict";

  var LIMITS = Object.freeze({
    bytes: 2 * 1024 * 1024,
    rows: 20000
  });

  var COLUMN_DEFS = Object.freeze([
    {
      key: "date",
      label: "Date",
      patterns: [/trade date|transaction date|settlement date|^date$/i, /date/i]
    },
    {
      key: "sym",
      label: "Symbol",
      patterns: [/^symbol$|^ticker$|^security$|^instrument$/i, /symbol|ticker|security|instrument/i]
    },
    {
      key: "act",
      label: "Buy or sell",
      patterns: [/^action$|^side$|^type$/i, /action|side|type|activity/i]
    },
    {
      key: "qty",
      label: "Quantity",
      patterns: [/quantity|qty|shares|units/i]
    },
    {
      key: "px",
      label: "Price",
      patterns: [/^price$|gross price|avg.*price|average.*price|unit price|trade price/i, /price/i]
    },
    {
      key: "fee",
      label: "Fees (optional)",
      patterns: [/commission|fee/i, /^fees?$|fee/i]
    }
  ]);

  var EXAMPLE = [
    "Transaction Date,Symbol,Action,Quantity,Price,Commission",
    "2024-01-10,AAPL,Buy,100,185.00,9.99",
    "2024-02-14,AAPL,Sell,100,182.00,9.99",
    "2024-03-01,MSFT,Buy,40,410.00,9.99",
    "2024-06-20,MSFT,Sell,40,445.00,9.99",
    "2024-03-22,NVDA,Buy,20,900.00,9.99",
    "2024-04-05,NVDA,Sell,20,880.00,9.99"
  ].join("\n");

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

  function utf8Length(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }
    return unescape(encodeURIComponent(text)).length;
  }

  /* ---------- import validation ---------- */

  function validateImportText(text, byteSize) {
    text = text == null ? "" : String(text);
    var bytes = typeof byteSize === "number" && isFinite(byteSize) ? byteSize : utf8Length(text);

    if (bytes > LIMITS.bytes) {
      return {
        ok: false,
        code: "too-big",
        message: "That is over the 2 MB limit. Export a smaller date range and try again."
      };
    }
    if (!text.trim()) {
      return {
        ok: false,
        code: "empty",
        message: "That looks empty. Paste your activity table including its header row, or choose a CSV file."
      };
    }

    var controls = text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
    var replacementChars = text.match(/\uFFFD/g);
    if ((controls && controls.length > 0) || (replacementChars && replacementChars.length > 5)) {
      return {
        ok: false,
        code: "binary",
        message: "That file looks like a binary file, not text. Export it as CSV, TSV, or TXT and try again."
      };
    }

    return { ok: true, bytes: bytes };
  }

  /* ---------- delimited text ---------- */

  function splitLine(line, delimiter) {
    var cells = [];
    var cell = "";
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === delimiter && !quoted) {
        cells.push(cell);
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    return cells.map(function (value) { return value.trim(); });
  }

  function countOutsideQuotes(line, needle) {
    var count = 0;
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && ch === needle) {
        count++;
      }
    }
    return count;
  }

  function detectDelimiter(text) {
    var lines = String(text).replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
    var first = "";
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        first = lines[i];
        break;
      }
    }
    var candidates = [",", "\t", ";", "|"];
    var best = ",";
    var bestCount = 0;
    candidates.forEach(function (candidate) {
      var count = countOutsideQuotes(first, candidate);
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    });
    return best;
  }

  function parseDelimited(text, delimiter) {
    var rows = [];
    var row = [];
    var cell = "";
    var quoted = false;
    var source = String(text).replace(/^\uFEFF/, "");

    for (var i = 0; i < source.length; i++) {
      var ch = source[i];

      if (quoted) {
        if (ch === '"') {
          if (source[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        quoted = true;
      } else if (ch === delimiter) {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[i + 1] === "\n") {
          i++;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }

    if (cell !== "" || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows.map(function (values) {
      return values.map(function (value) { return value.trim(); });
    });
  }

  function rowHasHeaderShape(row) {
    var hasDate = row.some(function (cell) { return /date/i.test(cell); });
    if (!hasDate) {
      return false;
    }
    return row.some(function (cell) {
      return /symbol|ticker|security|instrument/i.test(cell);
    });
  }

  function parseTable(text) {
    text = text == null ? "" : String(text).replace(/^\uFEFF/, "");
    if (!text.trim()) {
      return {
        error: "empty",
        message: "That looks empty. Paste your activity table including its header row, or choose a CSV file."
      };
    }

    var delimiter = detectDelimiter(text);
    var allRows = parseDelimited(text, delimiter).filter(function (row) {
      return row.some(function (cell) { return cell !== ""; });
    });
    if (!allRows.length) {
      return {
        error: "empty",
        message: "That looks empty. Paste your activity table including its header row, or choose a CSV file."
      };
    }

    var headerIndex = -1;
    for (var i = 0; i < allRows.length; i++) {
      if (rowHasHeaderShape(allRows[i])) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex < 0) {
      headerIndex = 0;
    }

    var headers = allRows[headerIndex].map(function (value) {
      return value.replace(/^\uFEFF/, "").trim();
    });
    var rows = allRows.slice(headerIndex + 1).filter(function (row) {
      return row.some(function (cell) { return cell !== ""; });
    });

    if (rows.length > LIMITS.rows) {
      return {
        error: "too-many-rows",
        message: "That table has more than 20,000 data rows. Split it into smaller date ranges and try again.",
        rowCount: rows.length
      };
    }
    if (rows.length === 0) {
      return {
        error: "no-rows",
        message: "I found a header row but no data rows underneath it. Paste the whole activity table, including the rows."
      };
    }

    return {
      headers: headers,
      rows: rows,
      delimiter: delimiter,
      headerIndex: headerIndex,
      rowCount: rows.length
    };
  }

  /* ---------- values ---------- */

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

  function detectColumn(headers, definition) {
    for (var p = 0; p < definition.patterns.length; p++) {
      for (var i = 0; i < headers.length; i++) {
        if (definition.patterns[p].test(headers[i])) {
          return i;
        }
      }
    }
    return -1;
  }

  function mapColumns(headers) {
    var mapping = {};
    COLUMN_DEFS.forEach(function (definition) {
      mapping[definition.key] = detectColumn(headers, definition);
    });
    return mapping;
  }

  /* ---------- trade matching ---------- */

  function normalizeSymbol(value) {
    return String(value == null ? "" : value).trim().toUpperCase().replace(/\s+/g, " ");
  }

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

  function buildTrades(rows, mapping) {
    var events = [];
    var ignored = 0;
    var rowsSeen = 0;

    rows.forEach(function (row) {
      rowsSeen++;
      var actionText = String(row[mapping.act] == null ? "" : row[mapping.act]);
      var action = /buy|bought|purchase|reinvest/i.test(actionText) ? "buy" :
        /sell|sold|dispose|redemption/i.test(actionText) ? "sell" : null;
      var date = isoDate(row[mapping.date]);
      var quantity = Math.abs(num(row[mapping.qty]));
      var price = Math.abs(num(row[mapping.px]));
      var fee = mapping.fee != null && mapping.fee >= 0 ? Math.abs(num(row[mapping.fee])) || 0 : 0;
      var ticker = normalizeSymbol(row[mapping.sym]);

      if (!action || !date || !(quantity > 0) || !(price > 0) || !ticker) {
        ignored++;
        return;
      }
      events.push({ d: date, tk: ticker, a: action, q: quantity, p: price, f: fee });
    });

    events.sort(function (left, right) {
      if (left.d < right.d) return -1;
      if (left.d > right.d) return 1;
      if (left.a === right.a) return 0;
      return left.a === "buy" ? -1 : 1;
    });

    var lots = Object.create(null);
    var trips = [];
    var unmatched = 0;

    events.forEach(function (event) {
      if (event.a === "buy") {
        if (!lots[event.tk]) {
          lots[event.tk] = [];
        }
        lots[event.tk].push({ d: event.d, p: event.p, q: event.q, q0: event.q, f: event.f });
        return;
      }

      var remaining = event.q;
      var queue = lots[event.tk] || [];
      while (remaining > 1e-9 && queue.length) {
        var lot = queue[0];
        var take = Math.min(remaining, lot.q);
        trips.push(makeTrade({
          tk: event.tk,
          bd: lot.d,
          bp: lot.p,
          sd: event.d,
          sp: event.p,
          q: take,
          fee: (lot.f * take) / lot.q0 + (event.f * take) / event.q,
          fx: 0,
          run: null
        }));
        lot.q -= take;
        remaining -= take;
        if (lot.q <= 1e-9) {
          queue.shift();
        }
      }
      if (remaining > 1e-9) {
        unmatched++;
      }
    });

    return { trips: trips, ignored: ignored, unmatched: unmatched, rowsSeen: rowsSeen };
  }

  function flagRevenge(trades) {
    trades.forEach(function (trade) {
      trade.rev = trades.some(function (other) {
        if (other === trade || !(other.gross < 0)) {
          return false;
        }
        var gap = daysBetween(other.sd, trade.bd);
        return gap >= 0 && gap <= 5;
      });
    });
    return trades;
  }

  /* ---------- prices ---------- */

  function parseWeeklySeries(json) {
    var weekly = json && json["Weekly Time Series"];
    if (!weekly || typeof weekly !== "object") {
      return [];
    }
    return Object.keys(weekly)
      .filter(function (date) { return /^\d{4}-\d{2}-\d{2}$/.test(date); })
      .sort()
      .map(function (date) {
        return { d: date, c: parseFloat(weekly[date] && weekly[date]["4. close"]) };
      })
      .filter(function (point) { return isFinite(point.c) && point.c > 0; });
  }

  function priceAt(series, date) {
    if (!Array.isArray(series) || !series.length) {
      return null;
    }
    var last = series[series.length - 1];
    if (date > addDays(last.d, 7)) {
      return null;
    }
    var value = null;
    for (var i = 0; i < series.length; i++) {
      if (series[i].d <= date) {
        value = series[i].c;
      } else {
        break;
      }
    }
    return value;
  }

  function horizonPrice(trade, series, horizon) {
    if (!Array.isArray(series) || !series.length) {
      return null;
    }
    if (!horizon) {
      return series[series.length - 1].c;
    }
    return priceAt(series, addDays(trade.sd, horizon));
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

  root.HindsightCore = {
    LIMITS: LIMITS,
    COLUMN_DEFS: COLUMN_DEFS,
    EXAMPLE: EXAMPLE,
    validateImportText: validateImportText,
    splitLine: splitLine,
    detectDelimiter: detectDelimiter,
    parseDelimited: parseDelimited,
    parseTable: parseTable,
    num: num,
    isoDate: isoDate,
    addDays: addDays,
    daysBetween: daysBetween,
    detectColumn: detectColumn,
    mapColumns: mapColumns,
    normalizeSymbol: normalizeSymbol,
    makeTrade: makeTrade,
    buildTrades: buildTrades,
    flagRevenge: flagRevenge,
    parseWeeklySeries: parseWeeklySeries,
    priceAt: priceAt,
    horizonPrice: horizonPrice,
    regretRows: regretRows,
    enrichTrades: enrichTrades,
    csvCell: csvCell,
    csvText: csvText,
    tradesToCsv: tradesToCsv,
    round2: round2
  };
})(typeof window !== "undefined" ? window : globalThis);
