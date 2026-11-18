"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "core.js"), "utf8");
const context = {
  console,
  TextEncoder,
  unescape,
  encodeURIComponent
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "core.js" });
const C = context.HindsightCore;

test("parseTable reads a BOM, CRLF CSV and keeps headers", () => {
  const csv = "\uFEFFTransaction Date,Symbol,Action,Quantity,Price,Commission\r\n" +
    "2024-01-10,AAPL,Buy,100,185.00,9.99\r\n" +
    "2024-02-14,AAPL,Sell,100,182.00,9.99\r\n";
  const table = C.parseTable(csv);
  assert.equal(table.error, undefined);
  assert.equal(table.headers[0], "Transaction Date");
  assert.equal(table.headers.length, 6);
  assert.equal(table.rowCount, 2);
  assert.deepEqual(Array.from(table.rows[0]), ["2024-01-10", "AAPL", "Buy", "100", "185.00", "9.99"]);
});

test("parseTable handles quoted commas, escaped quotes and quoted newlines", () => {
  const csv = "Date,Symbol,Action,Quantity,Price,Note\n" +
    "2024-01-10,AAPL,Buy,1,\"1,234.50\",\"hello, \"\"world\"\"\"\n" +
    "2024-01-11,MSFT,Sell,2,50,\"two\nlines\"\n";
  const table = C.parseTable(csv);
  assert.equal(table.error, undefined);
  assert.equal(table.rowCount, 2);
  assert.equal(table.rows[0][4], "1,234.50");
  assert.equal(table.rows[0][5], 'hello, "world"');
  assert.equal(table.rows[1][5], "two\nlines");
});

test("parseTable detects TSV and semicolon files", () => {
  const tsv = C.parseTable("Date\tSymbol\tAction\tQuantity\tPrice\n2024-01-10\tAAPL\tBuy\t1\t100\n");
  assert.equal(tsv.delimiter, "\t");
  assert.equal(tsv.rows[0].length, 5);

  const semicolon = C.parseTable("Date;Symbol;Action;Quantity;Price\n2024-01-10;AAPL;Buy;1;100\n");
  assert.equal(semicolon.delimiter, ";");
  assert.equal(semicolon.rows[0][1], "AAPL");
});

test("parseTable finds a header below broker preamble lines", () => {
  const csv = "Broker export\nGenerated 2024-06-01\n\nDate,Symbol,Action,Quantity,Price\n2024-01-10,AAPL,Buy,1,100\n";
  const table = C.parseTable(csv);
  assert.equal(table.headerIndex, 2);
  assert.equal(table.headers[0], "Date");
  assert.equal(table.rowCount, 1);
});

test("parseTable rejects more than 20,000 data rows", () => {
  const rows = ["Date,Symbol,Action,Quantity,Price"];
  for (let i = 0; i < C.LIMITS.rows + 1; i++) {
    rows.push("2024-01-10,AAPL,Buy,1,100");
  }
  const table = C.parseTable(rows.join("\n"));
  assert.equal(table.error, "too-many-rows");
  assert.match(table.message, /20,000/);
});

test("validateImportText enforces text size, emptiness and binary content", () => {
  assert.equal(C.validateImportText("").ok, false);
  assert.equal(C.validateImportText("x".repeat(10), C.LIMITS.bytes + 1).code, "too-big");
  assert.equal(C.validateImportText("Date,Symbol\n2024-01-01,AAPL\u0000").code, "binary");
  assert.equal(C.validateImportText("Date,Symbol\n2024-01-01,AAPL").ok, true);
});

test("num parses broker-style numbers", () => {
  assert.equal(C.num("$1,234.56"), 1234.56);
  assert.equal(C.num("(12.34)"), -12.34);
  assert.equal(C.num("12.34-"), -12.34);
  assert.equal(C.num("  $ 95 "), 95);
  assert.ok(Number.isNaN(C.num("not a number")));
});

test("isoDate handles common broker date formats", () => {
  assert.equal(C.isoDate("2024-2-3"), "2024-02-03");
  assert.equal(C.isoDate("2024/02/03"), "2024-02-03");
  assert.equal(C.isoDate("01/10/2024"), "2024-01-10");
  assert.equal(C.isoDate("13/01/2024"), "2024-01-13");
  assert.equal(C.isoDate("05-Jan-2024"), "2024-01-05");
  assert.equal(C.isoDate("Jan 5, 2024"), "2024-01-05");
  assert.equal(C.isoDate("20240203"), "2024-02-03");
  assert.equal(C.isoDate("2024-02-30"), null);
  assert.equal(C.isoDate("not a date"), null);
});

test("addDays and daysBetween cross month and year boundaries", () => {
  assert.equal(C.addDays("2024-02-28", 2), "2024-03-01");
  assert.equal(C.addDays("2024-12-31", 1), "2025-01-01");
  assert.equal(C.daysBetween("2024-01-01", "2024-01-31"), 30);
});

test("mapColumns detects typical headers", () => {
  const mapping = C.mapColumns(["Transaction Date", "Ticker", "Action", "Shares", "Average Price", "Commission"]);
  assert.equal(mapping.date, 0);
  assert.equal(mapping.sym, 1);
  assert.equal(mapping.act, 2);
  assert.equal(mapping.qty, 3);
  assert.equal(mapping.px, 4);
  assert.equal(mapping.fee, 5);
});

test("buildTrades matches sales FIFO and prorates fees", () => {
  const mapping = { date: 0, sym: 1, act: 2, qty: 3, px: 4, fee: 5 };
  const rows = [
    ["2024-01-01", "AAPL", "Buy", "100", "100", "10"],
    ["2024-01-02", "AAPL", "Buy", "50", "120", "5"],
    ["2024-01-10", "AAPL", "Sell", "120", "130", "12"],
    ["2024-01-15", "AAPL", "Sell", "50", "80", "6"],
    ["2024-01-20", "MSFT", "Sell", "1", "10", "1"],
    ["2024-01-21", "AAPL", "Dividend", "1", "1", "0"]
  ];
  const result = C.buildTrades(rows, mapping);
  assert.equal(result.trips.length, 3);
  assert.equal(result.ignored, 1);
  assert.equal(result.unmatched, 2);

  const first = result.trips[0];
  assert.equal(first.tk, "AAPL");
  assert.equal(first.bd, "2024-01-01");
  assert.equal(first.sd, "2024-01-10");
  assert.equal(first.q, 100);
  assert.equal(first.bp, 100);
  assert.equal(first.sp, 130);
  assert.equal(first.fee, 20);
  assert.equal(first.gross, 3000);
  assert.equal(first.net, 2980);
  assert.equal(first.days, 9);
  assert.equal(first.ret, 30);

  const second = result.trips[1];
  assert.equal(second.bd, "2024-01-02");
  assert.equal(second.q, 20);
  assert.equal(second.fee, 4);
  assert.equal(second.net, 196);

  const third = result.trips[2];
  assert.equal(third.bd, "2024-01-02");
  assert.equal(third.sd, "2024-01-15");
  assert.equal(third.q, 30);
  assert.equal(third.fee, 6.6);
  assert.equal(third.gross, -1200);
  assert.equal(third.net, -1206.6);
});

test("buildTrades handles a same-day buy before sell regardless of row order", () => {
  const mapping = { date: 0, sym: 1, act: 2, qty: 3, px: 4, fee: -1 };
  const rows = [
    ["2024-01-10", "AAPL", "Sell", "5", "20", ""],
    ["2024-01-10", "AAPL", "Buy", "5", "10", ""]
  ];
  const result = C.buildTrades(rows, mapping);
  assert.equal(result.trips.length, 1);
  assert.equal(result.trips[0].bd, "2024-01-10");
  assert.equal(result.trips[0].net, 50);
});

test("buildTrades ignores unreadable rows and reports them", () => {
  const mapping = { date: 0, sym: 1, act: 2, qty: 3, px: 4, fee: -1 };
  const rows = [
    ["bad date", "AAPL", "Buy", "1", "100", ""],
    ["2024-01-10", "", "Buy", "1", "100", ""],
    ["2024-01-10", "AAPL", "Buy", "0", "100", ""],
    ["2024-01-10", "AAPL", "Buy", "1", "0", ""],
    ["2024-01-10", "AAPL", "Transfer", "1", "100", ""]
  ];
  const result = C.buildTrades(rows, mapping);
  assert.equal(result.trips.length, 0);
  assert.equal(result.ignored, 5);
});

test("flagRevenge marks purchases within five days of a losing sale", () => {
  const trades = [
    C.makeTrade({ tk: "AAPL", bd: "2024-01-01", bp: 100, sd: "2024-01-10", sp: 90, q: 1, fee: 0 }),
    C.makeTrade({ tk: "MSFT", bd: "2024-01-12", bp: 100, sd: "2024-02-01", sp: 110, q: 1, fee: 0 }),
    C.makeTrade({ tk: "NVDA", bd: "2024-01-20", bp: 100, sd: "2024-02-01", sp: 110, q: 1, fee: 0 })
  ];
  C.flagRevenge(trades);
  assert.equal(trades[1].rev, true);
  assert.equal(trades[2].rev, false);
});

test("parseWeeklySeries sorts dates and drops invalid closes", () => {
  const series = C.parseWeeklySeries({
    "Weekly Time Series": {
      "2024-01-15": { "4. close": "105.5" },
      "2024-01-01": { "4. close": "100.0" },
      "2024-01-08": { "4. close": "bad" }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(series)), [
    { d: "2024-01-01", c: 100 },
    { d: "2024-01-15", c: 105.5 }
  ]);
});

test("priceAt and horizonPrice respect the available range", () => {
  const series = [
    { d: "2024-01-01", c: 100 },
    { d: "2024-01-08", c: 110 },
    { d: "2024-01-15", c: 120 }
  ];
  assert.equal(C.priceAt(series, "2024-01-05"), 100);
  assert.equal(C.priceAt(series, "2024-01-08"), 110);
  assert.equal(C.priceAt(series, "2024-01-22"), 120);
  assert.equal(C.priceAt(series, "2024-02-01"), null);

  const trade = C.makeTrade({ tk: "AAPL", bd: "2024-01-01", bp: 100, sd: "2024-01-08", sp: 110, q: 1, fee: 0 });
  assert.equal(C.horizonPrice(trade, series, 0), 120);
  assert.equal(C.horizonPrice(trade, series, 7), 120);
  assert.equal(C.horizonPrice(trade, series, 90), null);
});

test("enrichTrades computes the four-week run-up, and regretRows uses the horizon", () => {
  const series = [
    { d: "2024-01-01", c: 100 },
    { d: "2024-01-08", c: 105 },
    { d: "2024-01-15", c: 110 },
    { d: "2024-01-29", c: 120 }
  ];
  const trade = C.makeTrade({ tk: "AAPL", bd: "2024-01-29", bp: 120, sd: "2024-02-05", sp: 115, q: 10, fee: 0 });
  C.enrichTrades([trade], { AAPL: series });
  assert.ok(Math.abs(trade.run - 20) < 1e-9);

  const rows = C.regretRows([trade], { AAPL: series }, 0);
  assert.equal(rows[0].l, 120);
  assert.equal(rows[0].c, 50);
});

test("tradesToCsv escapes text and prevents spreadsheet formula injection", () => {
  const trade = C.makeTrade({
    tk: "=SUM(A1)",
    bd: "2024-01-01",
    bp: 10,
    sd: "2024-01-02",
    sp: 12,
    q: 1,
    fee: 1
  });
  const csv = C.tradesToCsv([trade], {}, 0);
  const lines = csv.split("\r\n");
  assert.match(lines[0], /^Symbol,Bought,Sold/);
  assert.ok(lines[1].startsWith("'=SUM(A1),"));
  assert.equal(lines.length, 2);
});
