// Adapted from Hindsight. Copyright (c) 2026 plinluu. All rights reserved.
import * as C from './calculations'

export function renderReport(root, state, select) {
  const $ = selector => root.querySelector(selector)
  function chartEmpty(selector, message) {
    const host = $(selector)
    host.replaceChildren(el('p','chart-empty',message))
  }
  var FONT = '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';
  var MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  var moneyFormat = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
  var dateFormat = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text != null) {
      node.textContent = text;
    }
    return node;
  }

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (name) {
        if (attrs[name] != null) {
          node.setAttribute(name, String(attrs[name]));
        }
      });
    }
    if (text != null) {
      node.textContent = text;
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function setMsg(node, text, kind) {
    if (!node) {
      return;
    }
    node.textContent = text || "";
    node.classList.remove("bad", "good");
    if (kind) {
      node.classList.add(kind);
    }
  }

  function money(value) {
    if (value == null || !isFinite(value)) {
      return "–";
    }
    return (value < 0 ? "−" : "") + "$" + moneyFormat.format(Math.abs(Math.round(value)));
  }

  function money2(value) {
    if (value == null || !isFinite(value)) {
      return "–";
    }
    return (value < 0 ? "−" : "") + "$" + Math.abs(value).toFixed(2);
  }

  function pct(value) {
    if (value == null || !isFinite(value)) {
      return "–";
    }
    return (value >= 0 ? "+" : "−") + Math.abs(value).toFixed(1) + "%";
  }

  function humanDate(value) {
    var parts = String(value).split("-").map(Number);
    return dateFormat.format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  }

  function avg(values) {
    return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 0;
  }

  function sum(list, key) {
    return list.reduce(function (total, item) { return total + item[key]; }, 0);
  }

  function scrollToElement(selector) {
    var node = $(selector);
    if (!node) {
      return;
    }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function laterFor(trade) {
    return C.horizonPrice(trade, state.series[trade.tk], state.horizon);
  }

  function getRegretRows() {
    return C.regretRows(state.trades, state.series, state.horizon);
  }

  function bestIndex() {
    if (!state.trades.length) {
      return -1;
    }
    var rows = getRegretRows();
    if (!rows.length) {
      return 0;
    }
    var best = rows[0];
    rows.forEach(function (row) {
      if (row.c > best.c) {
        best = row;
      }
    });
    return state.trades.indexOf(best.t);
  }

  function currentTrade() {
    if (!state.trades.length) {
      return null;
    }
    if (state.selected < 0 || state.selected >= state.trades.length) {
      state.selected = bestIndex();
    }
    return state.trades[state.selected];
  }

  function renderChart(trade, selector, clipPrefix) {
    var host = $(selector || "#chart");
    if (!host) {
      return;
    }
    var prefix = clipPrefix || "chart";
    clear(host);
    if (!trade) {
      chartEmpty(selector, "Import a broker export to see a price chart for each completed trade. The demo above shows what that looks like.");
      return;
    }

    var series = state.series[trade.tk];
    if (!series || !series.length) {
      chartEmpty(selector, "Add TradingView closes to see the price path around this sale.");
      return;
    }

    var points = series.filter(function (point) {
      return point.d >= C.addDays(trade.bd, -56);
    });
    if (state.mode === 'mine') {
      const observations = new Map(points.map(p => [p.d,p.c]));
      if (!observations.has(trade.bd)) observations.set(trade.bd, trade.bp);
      if (!observations.has(trade.sd)) observations.set(trade.sd, trade.sp);
      points = Array.from(observations, ([d,c])=>({d,c})).sort((a,b)=>a.d.localeCompare(b.d));
    }
    var width = Math.max(280, Math.round(host.clientWidth || 900));
    var height = width < 520 ? 210 : width < 760 ? 240 : 260;
    var left = width < 480 ? 40 : 56;
    var right = width < 480 ? 12 : 24;
    var top = 26;
    var bottom = 34;
    var last = points[points.length - 1];
    var endDate = state.horizon ? C.addDays(trade.sd, state.horizon) : last.d;

    var values = points.map(function (point) { return point.c; }).concat([trade.bp, trade.sp]);
    var low = values.reduce((a,b)=>Math.min(a,b), Infinity) * 0.96;
    var high = values.reduce((a,b)=>Math.max(a,b), -Infinity) * 1.04;
    if (!(high > low)) {
      high = low + 1;
      low -= 1;
    }

    var firstTime = Date.parse(points[0].d + "T00:00:00Z");
    var lastTime = Date.parse(last.d + "T00:00:00Z");
    var span = lastTime - firstTime || 1;

    function xFor(date) {
      return left + ((Date.parse(date + "T00:00:00Z") - firstTime) / span) * (width - left - right);
    }

    function yFor(value) {
      return top + (1 - (value - low) / (high - low)) * (height - top - bottom);
    }

    function pointPath(point) {
      return xFor(point.d).toFixed(1) + " " + yFor(point.c).toFixed(1);
    }

    var ariaLabel = "Price of " + trade.tk + " from " + points[0].d + " to " + last.d +
      ". Bought at $" + trade.bp.toFixed(2) + ", sold at $" + trade.sp.toFixed(2) + ".";
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": ariaLabel
    });

    var defs = svgEl("defs");
    var clipUpId = prefix + "-clip-up";
    var clipDownId = prefix + "-clip-down";
    var clipUp = svgEl("clipPath", { id: clipUpId });
    clipUp.appendChild(svgEl("rect", { x: 0, y: 0, width: width, height: yFor(trade.sp).toFixed(1) }));
    defs.appendChild(clipUp);
    var clipDown = svgEl("clipPath", { id: clipDownId });
    clipDown.appendChild(svgEl("rect", {
      x: 0,
      y: yFor(trade.sp).toFixed(1),
      width: width,
      height: Math.max(0, height - yFor(trade.sp))
    }));
    defs.appendChild(clipDown);
    svg.appendChild(defs);

    var gridCount = width < 480 ? 3 : 4;
    for (var i = 0; i < gridCount; i++) {
      var value = low + ((high - low) * i) / (gridCount - 1);
      var y = yFor(value).toFixed(1);
      svg.appendChild(svgEl("line", {
        x1: left,
        x2: width - right,
        y1: y,
        y2: y,
        class: "gl"
      }));
      svg.appendChild(svgEl("text", {
        x: left - 8,
        y: (yFor(value) + 4).toFixed(1),
        class: "ax",
        "text-anchor": "end"
      }, "$" + value.toFixed(value < 20 ? 2 : 0)));
    }

    for (var j = 0; j < gridCount; j++) {
      var point = points[Math.round((points.length - 1) * j / (gridCount - 1))];
      svg.appendChild(svgEl("text", {
        x: xFor(point.d).toFixed(1),
        y: height - 10,
        class: "ax",
        "text-anchor": j === 0 ? "start" : j === gridCount - 1 ? "end" : "middle"
      }, point.d.slice(0, 7)));
    }

    var after = points.filter(function (point) {
      return point.d >= trade.sd && point.d <= endDate;
    });
    var saleY = yFor(trade.sp).toFixed(1);
    if (after.length) {
      var area = "M" + xFor(trade.sd).toFixed(1) + " " + saleY +
        "L" + after.map(pointPath).join("L") +
        "L" + xFor(after[after.length - 1].d).toFixed(1) + " " + saleY + "Z";
      svg.appendChild(svgEl("path", { d: area, class: "miss", "clip-path": "url(#" + clipUpId + ")" }));
      svg.appendChild(svgEl("path", { d: area, class: "save", "clip-path": "url(#" + clipDownId + ")" }));
    }

    svg.appendChild(svgEl("line", {
      x1: xFor(trade.sd).toFixed(1),
      x2: width - right,
      y1: saleY,
      y2: saleY,
      class: "sl"
    }));

    var path = "M" + points.map(pointPath).join("L");
    svg.appendChild(svgEl("path", {
      d: path,
      class: "ln",
      pathLength: "1"
    }));

    var buyX = xFor(trade.bd);
    var sellX = xFor(trade.sd);
    svg.appendChild(svgEl("circle", {
      cx: buyX.toFixed(1),
      cy: yFor(trade.bp).toFixed(1),
      r: 6,
      class: "bm"
    }));
    svg.appendChild(svgEl("circle", {
      cx: sellX.toFixed(1),
      cy: saleY,
      r: 6,
      class: "sm"
    }));

    var buyAnchor = buyX < left + 52 ? "start" : "middle";
    var buyLabelX = buyX < left + 52 ? buyX + 8 : buyX;
    svg.appendChild(svgEl("text", {
      x: buyLabelX.toFixed(1),
      y: (yFor(trade.bp) + 24).toFixed(1),
      class: "lb",
      "text-anchor": buyAnchor
    }, "Bought $" + trade.bp.toFixed(2)));

    var sellAnchor = sellX > width - right - 60 ? "end" : "middle";
    var sellLabelX = sellX > width - right - 60 ? sellX - 8 : sellX;
    svg.appendChild(svgEl("text", {
      x: sellLabelX.toFixed(1),
      y: (yFor(trade.sp) - 14).toFixed(1),
      class: "lb",
      "text-anchor": sellAnchor
    }, "Sold $" + trade.sp.toFixed(2)));

    host.appendChild(svg);
  }

  function renderSentence(trade, selector) {
    var node = $(selector || "#sent");
    if (!node) {
      return;
    }
    clear(node);
    if (!trade) {
      node.textContent = "No trades to review yet.";
      return;
    }

    var later = laterFor(trade);
    var sentence = document.createDocumentFragment();
    sentence.appendChild(document.createTextNode("You sold "));
    sentence.appendChild(el("span", "tk", trade.tk));
    sentence.appendChild(document.createTextNode(" at " + money2(trade.sp) + ". "));

    if (later == null) {
      sentence.appendChild(document.createTextNode("Connect price history to see what happened next."));
      node.appendChild(sentence);
      return;
    }

    var delta = (later - trade.sp) * trade.q;
    var horizonText = state.horizon === 0 ? "Today it’s " : state.horizon + " days later it was ";
    sentence.appendChild(document.createTextNode(horizonText + money2(later) + ". "));

    if (delta > 0.005) {
      sentence.appendChild(document.createTextNode("That sale left "));
      sentence.appendChild(el("em", null, money(delta)));
      sentence.appendChild(document.createTextNode(" behind."));
    } else if (delta < -0.005) {
      sentence.appendChild(document.createTextNode("Good exit. It saved you "));
      sentence.appendChild(el("i", null, money(-delta)));
      sentence.appendChild(document.createTextNode("."));
    } else {
      sentence.appendChild(document.createTextNode("It finished roughly flat."));
    }

    node.appendChild(sentence);
  }

  function renderKpi() {
    var host = $("#kpi");
    clear(host);
    if (!state.trades.length) {
      var empty = el("div");
      empty.appendChild(el("b", null, "–"));
      empty.appendChild(el("span", null, "No trades loaded"));
      host.appendChild(empty);
      return;
    }

    var rows = getRegretRows();
    var left = sum(rows.filter(function (row) { return row.c > 0; }), "c");
    var net = sum(state.trades, "net");
    var wins = state.trades.filter(function (trade) { return trade.net > 0; }).length;
    var values = [
      [money(net), "result after fees", net >= 0 ? "good" : "bad"],
      [rows.length ? money(left) : "–", "left on the table", "bad"],
      [money(sum(state.trades, "fee") + sum(state.trades, "fx")), "paid in fees", ""],
      [Math.round((wins / state.trades.length) * 100) + "%", "trades profitable", ""],
      [Math.round(avg(state.trades.map(function (trade) { return trade.days; }))) + " days", "average hold", ""]
    ];

    values.forEach(function (entry) {
      var box = el("div");
      box.appendChild(el("b", entry[2] || null, entry[0]));
      box.appendChild(el("span", null, entry[1]));
      host.appendChild(box);
    });
  }

  function renderBoard() {
    var host = $("#lb");
    clear(host);
    var rows = getRegretRows();
    var positive = rows.filter(function (row) { return row.c > 0; }).sort(function (a, b) { return b.c - a.c; }).slice(0, 6);

    if (!state.trades.length) {
      host.appendChild(el("p", "empty-note", "No trades loaded yet. Import a file to get started."));
      return;
    }
    if (!positive.length) {
      host.appendChild(el("p", "empty-note", rows.length ?
        "No sale left money behind in this view." :
        "Connect price history to see what you left behind."));
      return;
    }

    var max = positive[0].c;
    positive.forEach(function (row) {
      var trade = row.t;
      var index = state.trades.indexOf(trade);
      var button = el("button", "rg");
      button.type = "button";
      button.dataset.i = String(index);
      button.setAttribute("aria-pressed", String(index === state.selected));

      var label = el("span");
      label.appendChild(el("b", null, trade.tk));
      label.appendChild(el("small", null, money2(trade.sp) + " → " + money2(row.l)));

      var progress = el("progress", "track");
      progress.max = 100;
      progress.value = Math.max(0, Math.round((row.c / max) * 100));
      progress.setAttribute("aria-label", trade.tk + " missed upside");

      var amount = el("span", "n", money(row.c));

      button.appendChild(label);
      button.appendChild(progress);
      button.appendChild(amount);
      button.addEventListener("click", function () {
        select(index);
        scrollToElement("#review-chart");
      });
      host.appendChild(button);
    });
  }

  function renderCumulative() {
    var host = $("#cum");
    clear(host);
    if (!state.trades.length) {
      host.appendChild(el("p", "empty-note", "No trades loaded yet."));
      return;
    }

    var ordered = state.trades.slice().sort(function (left, right) {
      if (left.sd < right.sd) return -1;
      if (left.sd > right.sd) return 1;
      return 0;
    });
    var running = 0;
    var values = ordered.map(function (trade) {
      running += trade.net;
      return running;
    });

    var width = 460;
    var height = 200;
    var low = Math.min(0, values.reduce((a,b)=>Math.min(a,b), Infinity));
    var high = Math.max(0, values.reduce((a,b)=>Math.max(a,b), -Infinity));
    var range = (high - low) || 1;

    function xFor(index) {
      return 14 + (index / Math.max(values.length - 1, 1)) * (width - 28);
    }

    function yFor(value) {
      return 14 + (1 - (value - low) / range) * (height - 28);
    }

    var path = values.map(function (value, index) {
      return (index ? "L" : "M") + xFor(index).toFixed(1) + " " + yFor(value).toFixed(1);
    }).join("");

    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": "Cumulative profit after fees: " + money(running)
    });
    var defs = svgEl("defs");
    svg.appendChild(defs);
    svg.appendChild(svgEl("line", {
      x1: 14,
      x2: width - 14,
      y1: yFor(0).toFixed(1),
      y2: yFor(0).toFixed(1),
      class: "sl"
    }));
    svg.appendChild(svgEl("path", {
      d: path,
      class: "ln " + (running >= 0 ? "good" : "bad"),
      pathLength: "1"
    }));
    svg.appendChild(svgEl("circle", {
      cx: xFor(values.length - 1).toFixed(1),
      cy: yFor(running).toFixed(1),
      r: 4,
      class: "cum-dot " + (running >= 0 ? "good" : "bad")
    }));
    svg.appendChild(svgEl("text", {
      x: 14,
      y: height - 2,
      class: "ax",
      "text-anchor": "start"
    }, ordered[0].sd.slice(0, 7)));
    svg.appendChild(svgEl("text", {
      x: width - 14,
      y: height - 2,
      class: "ax",
      "text-anchor": "end"
    }, ordered[ordered.length - 1].sd.slice(0, 7)));
    host.appendChild(svg);

    var caption = el("p", "cap");
    caption.appendChild(document.createTextNode("Running total after fees: "));
    caption.appendChild(el("b", null, money(running)));
    host.appendChild(caption);
  }

  function renderFees() {
    var host = $("#fees-body");
    clear(host);
    if (!state.trades.length) {
      host.appendChild(el("p", "empty-note", "No fees to report yet."));
      return;
    }

    var commissions = sum(state.trades, "fee");
    var conversion = sum(state.trades, "fx");
    var gross = sum(state.trades, "gross");
    var net = gross - commissions - conversion;
    var total = commissions + conversion;

    var totals = el("div", "totals");
    [
      [money(total), "total fees"],
      [money(total / state.trades.length), "average fees per round trip"],
      [money(net), "your profit after fees"]
    ].forEach(function (entry) {
      var card = el("div", "card");
      card.appendChild(el("b", null, entry[0]));
      card.appendChild(el("span", null, entry[1]));
      totals.appendChild(card);
    });
    host.appendChild(totals);

    if (total === 0) {
      var none = el("div", "card");
      none.appendChild(el("p", "empty-note", "No commissions or fees were found in this file. If your broker lists fees in a separate column, choose it in the column check."));
      host.appendChild(none);
      return;
    }

    var card = el("div", "card");
    var bar = svgEl("svg", {
      class: "fees-bar",
      viewBox: "0 0 100 10",
      preserveAspectRatio: "none",
      role: "img",
      "aria-label": "Fees split: commissions " + money(commissions) + ", currency conversion " + money(conversion)
    });
    var commissionWidth = (commissions / total) * 100;
    bar.appendChild(svgEl("rect", { x: 0, y: 0, width: commissionWidth, height: 10, class: "fee-comm" }));
    if (conversion > 0) {
      bar.appendChild(svgEl("rect", {
        x: commissionWidth,
        y: 0,
        width: 100 - commissionWidth,
        height: 10,
        class: "fee-fx"
      }));
    }
    card.appendChild(bar);

    var legend = el("div", "leg");
    var commissionItem = el("span");
    commissionItem.appendChild(el("span", "dot dot-comm"));
    commissionItem.appendChild(document.createTextNode("Commissions "));
    commissionItem.appendChild(el("b", null, money(commissions)));
    legend.appendChild(commissionItem);

    if (conversion > 0) {
      var conversionItem = el("span");
      conversionItem.appendChild(el("span", "dot dot-fx"));
      conversionItem.appendChild(document.createTextNode("Currency conversion "));
      conversionItem.appendChild(el("b", null, money(conversion)));
      legend.appendChild(conversionItem);
    }
    card.appendChild(legend);
    host.appendChild(card);
  }

  function habitCard(name, text, on, notEnough) {
    var card = el("div", "card");
    card.appendChild(el("h3", null, name));
    card.appendChild(el("p", null, text));
    var tag = el("span", "tag" + (on ? "" : " ok"), notEnough ? "Not enough data" : on ? "Pattern found" : "No clear pattern");
    card.appendChild(tag);
    return card;
  }

  function renderHabits() {
    var host = $("#fp");
    clear(host);
    if (!state.trades.length) {
      host.appendChild(el("p", "empty-note", "No habits to report yet."));
      return;
    }

    var returns = function (trade) { return trade.ret; };
    var averageReturn = function (list) { return avg(list.map(returns)); };

    var momentum = state.trades.filter(function (trade) { return trade.run != null; });
    if (!momentum.length) {
      host.appendChild(habitCard(
        "Chasing momentum",
        "This needs each stock’s price in the weeks before you bought it. Import closing prices from TradingView covering the four weeks before buying to check this pattern.",
        false,
        true
      ));
    } else {
      var chased = state.trades.filter(function (trade) { return trade.run >= 5; });
      var rest = momentum.filter(function (trade) { return trade.run < 5; });
      var chasing = rest.length > 0 && chased.length / state.trades.length >= 0.3 && averageReturn(chased) < averageReturn(rest);
      var chaseText = chased.length + " of " + state.trades.length + " purchases came after the stock had already risen 5% or more in the previous 4 weeks. Those trades returned " +
        pct(averageReturn(chased)) + " on average";
      chaseText += rest.length ? ", against " + pct(averageReturn(rest)) + " for the rest." : ". There was no comparison group in this file.";
      host.appendChild(habitCard("Chasing momentum", chaseText, chasing, false));
    }

    var winners = state.trades.filter(function (trade) { return trade.ret > 0; });
    var losers = state.trades.filter(function (trade) { return trade.ret <= 0; });
    if (winners.length && losers.length) {
      var winnerDays = avg(winners.map(function (trade) { return trade.days; }));
      var loserDays = avg(losers.map(function (trade) { return trade.days; }));
      var holding = loserDays > winnerDays * 1.5;
      host.appendChild(habitCard(
        "Cutting winners, keeping losers",
        "You held winners for " + Math.round(winnerDays) + " days on average but losers for " + Math.round(loserDays) + ". Your average win was " +
          pct(averageReturn(winners)) + " and your average loss " + pct(averageReturn(losers)) + ".",
        holding,
        false
      ));
    } else {
      host.appendChild(habitCard(
        "Cutting winners, keeping losers",
        "You need at least one winning and one losing trade to compare.",
        false,
        true
      ));
    }

    var revenge = state.trades.filter(function (trade) { return trade.rev; });
    var other = state.trades.filter(function (trade) { return !trade.rev; });
    if (revenge.length && other.length) {
      var size = avg(revenge.map(function (trade) { return trade.cost; })) / avg(other.map(function (trade) { return trade.cost; }));
      var revengePattern = revenge.length >= 2 && averageReturn(revenge) < averageReturn(other);
      host.appendChild(habitCard(
        "Trading after a loss",
        revenge.length + (revenge.length === 1 ? " trade was" : " trades were") + " opened within 5 days of a losing sale. They were " +
          size.toFixed(1) + "× your usual size and returned " + pct(averageReturn(revenge)) + ", against " +
          pct(averageReturn(other)) + " for your other trades.",
        revengePattern,
        false
      ));
    } else if (revenge.length) {
      host.appendChild(habitCard(
        "Trading after a loss",
        revenge.length + (revenge.length === 1 ? " trade was" : " trades were") + " opened within 5 days of a losing sale. There were no other trades to compare against, so this stays a question.",
        false,
        true
      ));
    } else {
      host.appendChild(habitCard(
        "Trading after a loss",
        "No trades were opened within 5 days of a losing sale.",
        false,
        false
      ));
    }

    if (state.trades.length < 8) {
      host.appendChild(el("p", "habit-note", "With fewer than 8 trades, treat patterns as hints, not proof."));
    }
  }

  /* ---------- share card ---------- */

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    var cut = String(text);
    while (cut.length > 1 && ctx.measureText(cut + "…").width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return cut + "…";
  }

  function signedPct(value) {
    if (value == null || !isFinite(value)) {
      return "–";
    }
    var rounded = Math.abs(value) < 0.05 ? 0 : value;
    return (rounded > 0 ? "+" : rounded < 0 ? "−" : "") + Math.abs(rounded).toFixed(1) + "%";
  }

  function shareEntries() {
    var rows = state.trades.map(function (trade, index) {
      var later = laterFor(trade);
      var delta = later == null ? null : (later - trade.sp) * trade.q;
      return { t: trade, d: delta, i: index };
    });
    return rows.sort(function (a, b) {
      if (a.d == null && b.d == null) {
        return a.t.sd < b.t.sd ? -1 : 1;
      }
      if (a.d == null) {
        return 1;
      }
      if (b.d == null) {
        return -1;
      }
      if (b.d !== a.d) {
        return b.d - a.d;
      }
      return a.t.sd < b.t.sd ? -1 : 1;
    });
  }

  function drawShareCard() {
    var canvas = $("#share-canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    var width = 1200;
    var margin = 64;
    var entries = shareEntries();
    var shown = entries.slice(0, 30);
    var extra = entries.length - shown.length;
    var headerH = 240;
    var extraH = extra > 0 ? 34 : 0;
    var footerH = 76;
    var spare = 630 - headerH - footerH;
    var rowH = shown.length <= 12
      ? Math.max(30, Math.min(46, Math.floor(spare / Math.max(shown.length, 1))))
      : 27;
    var tableH = Math.max(shown.length, 1) * rowH;
    var height = Math.max(630, headerH + tableH + extraH + footerH);
    var tableTop = headerH;
    var spareAfter = height - headerH - footerH - 30;
    if (extraH === 0 && tableH + 24 < spareAfter) {
      tableTop = headerH + Math.floor((spareAfter - tableH) / 2);
    }

    canvas.width = width;
    canvas.height = height;
    canvas.dataset.rows = String(shown.length);
    canvas.dataset.total = String(entries.length);
    canvas.dataset.hiddenRows = String(extra);

    var bg = ctx.createLinearGradient(0, 0, width * 0.5, height);
    bg.addColorStop(0, "#423546");
    bg.addColorStop(1, "#191c2a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(width - 80, 20, 20, width - 80, 20, 640);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.07)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Wordmark
    roundedRect(ctx, margin, 44, 34, 34, 8);
    ctx.fillStyle = "#f7eada";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#191c2a";
    ctx.font = "700 17px " + MONO;
    ctx.fillText("H", margin + 11, 67);
    ctx.fillStyle = "#f7eada";
    ctx.font = "700 16px " + FONT;
    ctx.fillText("HINDSIGHT", margin + 46, 58);
    ctx.fillStyle = "#d2bbc9";
    ctx.font = "500 12px " + FONT;
    ctx.fillText("PRIVATE TRADE REVIEW", margin + 46, 74);

    ctx.textAlign = "right";
    ctx.fillStyle = "#d2bbc9";
    ctx.font = "500 13px " + MONO;
    ctx.fillText("Market journal", width - margin, 66);

    // Totals band
    var totalNet = sum(state.trades, "net");
    var totalCost = sum(state.trades, "cost") || 1;
    var soldValue = state.trades.reduce(function (total, trade) {
      return total + trade.sp * trade.q;
    }, 0) || 1;
    var leftBehind = entries.reduce(function (total, entry) {
      return entry.d != null && entry.d > 0 ? total + entry.d : total;
    }, 0);
    var fees = sum(state.trades, "fee") + sum(state.trades, "fx");

    var stats = [
      {
        label: state.hideAmounts ? "RESULT, IN PERCENT" : "RESULT AFTER FEES",
        value: state.hideAmounts ? signedPct((totalNet / totalCost) * 100) : money(totalNet),
        color: totalNet > 0.5 ? "#ffffff" : totalNet < -0.5 ? "#bdbdbd" : "#a8a8a8"
      },
      {
        label: state.hideAmounts ? "LEFT BEHIND, IN PERCENT" : "LEFT ON THE TABLE",
        value: state.hideAmounts ? signedPct((leftBehind / soldValue) * 100) : money(leftBehind),
        color: "#d9d9d9"
      },
      {
        label: state.hideAmounts ? "FEES, IN PERCENT" : "PAID IN FEES",
        value: state.hideAmounts ? signedPct((fees / totalCost) * 100) : money(fees),
        color: "#a8a8a8"
      }
    ];

    stats.forEach(function (stat, index) {
      var x = margin + index * 360;
      ctx.textAlign = "left";
      ctx.fillStyle = "#d2bbc9";
      ctx.font = "600 11px " + MONO;
      ctx.fillText(stat.label, x, 126);
      ctx.fillStyle = stat.color;
      ctx.font = "600 42px " + MONO;
      ctx.fillText(fitText(ctx, stat.value, 320), x, 176);
    });

    ctx.textAlign = "right";
    ctx.fillStyle = "#b3b3b3";
    ctx.font = "500 14px " + FONT;
    ctx.fillText(entries.length + (entries.length === 1 ? " trade" : " trades") + " · " +
      (state.horizon === 0 ? "prices today" : state.horizon + " days after each sale"), width - margin, 168);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, 200);
    ctx.lineTo(width - margin, 200);
    ctx.stroke();

    // Table header
    ctx.fillStyle = "#d2bbc9";
    ctx.font = "600 11px " + MONO;
    ctx.textAlign = "left";
    ctx.fillText("TRADE", margin, tableTop - 14);
    ctx.fillText("SOLD", margin + 220, tableTop - 14);
    ctx.textAlign = "right";
    ctx.fillText("RESULT", 780, tableTop - 14);
    if (!state.hideAmounts) {
      ctx.fillText("PERCENT", 910, tableTop - 14);
    }
    ctx.fillText("AFTER THE SALE", width - margin, tableTop - 14);

    if (!shown.length) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#f7eada";
      ctx.font = "600 30px " + FONT;
      ctx.fillText("No trades to review yet.", margin, tableTop + 60);
      ctx.fillStyle = "#d2bbc9";
      ctx.font = "500 18px " + FONT;
      ctx.fillText("Import a broker export to build this card.", margin, tableTop + 94);
    }

    // Rows
    shown.forEach(function (entry, index) {
      var top = tableTop + index * rowH;
      var baseline = top + rowH / 2 + 5;
      var trade = entry.t;

      if (index % 2 === 1) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(0, top, width, rowH);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#f7eada";
      ctx.font = "600 15px " + MONO;
      var name = state.hideTicker ? "Trade " + (index + 1) : trade.tk;
      ctx.fillText(fitText(ctx, name, 190), margin, baseline);

      ctx.fillStyle = "#d2bbc9";
      ctx.font = "500 12px " + MONO;
      ctx.fillText(humanDate(trade.sd), margin + 220, baseline);

      var pctOfSale = entry.d == null ? null : (entry.d / (trade.sp * trade.q)) * 100;

      ctx.textAlign = "right";
      ctx.fillStyle = trade.net >= 0 ? "#f7eada" : "#bdbdbd";
      ctx.font = "600 15px " + MONO;
      if (state.hideAmounts) {
        ctx.fillText(signedPct(trade.ret), 780, baseline);
      } else {
        ctx.fillText(money(trade.net), 780, baseline);
        ctx.fillStyle = "#b3b3b3";
        ctx.font = "500 14px " + MONO;
        ctx.fillText(signedPct(trade.ret), 910, baseline);
      }

      if (entry.d == null) {
        ctx.fillStyle = "#d2bbc9";
        ctx.fillText("no price data", width - margin, baseline);
      } else {
        ctx.fillStyle = entry.d > 0 ? "#f7eada" : "#b3b3b3";
        var label = entry.d > 0 ? "Left " : "Saved ";
        var amount = state.hideAmounts ? Math.abs(pctOfSale).toFixed(1) + "%" : money(Math.abs(entry.d));
        if (Math.abs(entry.d) < 0.5) {
          ctx.fillStyle = "#d2bbc9";
          label = "Flat ";
        }
        ctx.fillText(label + amount, width - margin, baseline);
      }
    });

    var noteY = tableTop + tableH + 26;
    if (extra === 0 && noteY < height - footerH + 6) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#c1adb9";
      ctx.font = "500 12px " + FONT;
      ctx.fillText("Sorted by what each sale left behind. Comparison uses the selected time window.", margin, noteY);
    }

    // Overflow line
    if (extra > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#d2bbc9";
      ctx.font = "500 14px " + FONT;
      ctx.fillText("and " + extra + " more " + (extra === 1 ? "trade" : "trades") + " not shown", margin, tableTop + tableH + 22);
    }

    // Footer
    var footerY = height - 40;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.moveTo(margin, footerY - 24);
    ctx.lineTo(width - margin, footerY - 24);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#d2bbc9";
    ctx.font = "500 13px " + MONO;
    ctx.fillText("hindsight", margin, footerY);
    ctx.fillStyle = "#c1adb9";
    ctx.fillText("· " + (state.mode === "demo" ? "demo data, simulated prices" : "made privately in your browser"), margin + 84, footerY);

    ctx.textAlign = "right";
    ctx.fillText("Educational tool. Not financial advice.", width - margin, footerY);
  }

  function renderShare() {
    var download = $("#share-download");
    var exportButton = $("#export");
    download.disabled = !state.trades.length;
    exportButton.disabled = !state.trades.length;
    $("#share-canvas").setAttribute(
      "aria-label",
      "Preview of a card listing " + state.trades.length + " trades and what each sale left behind"
    );
    drawShareCard();
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function downloadShare() {
    if (!state.trades.length) {
      setMsg($("#share-msg"), "Import some trades first, then the card can be built.", "bad");
      return;
    }
    var canvas = $("#share-canvas");
    canvas.toBlob(function (blob) {
      if (!blob) {
        setMsg($("#share-msg"), "This browser could not build the image. Try another one.", "bad");
        return;
      }
      downloadBlob(blob, "hindsight-trades-" + new Date().toISOString().slice(0, 10) + ".png");
      setMsg($("#share-msg"), "Card downloaded. It lists " + Math.min(state.trades.length, 30) + " trades.", "good");
    }, "image/png");
  }

  function exportCsv() {
    if (!state.trades.length) {
      setMsg($("#share-msg"), "There are no analyzed trades to export yet.", "bad");
      return;
    }
    var csv = C.tradesToCsv(state.trades, state.series, state.horizon);
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "hindsight-trades-" + new Date().toISOString().slice(0, 10) + ".csv");
    setMsg($("#share-msg"), "Analyzed trades downloaded as a CSV.", "good");
  }


  const trade=currentTrade()
  renderSentence(trade,'#review-sent')
  renderChart(trade,'#results-chart','review-trade')
  renderKpi()
  renderBoard()
  renderCumulative()
  renderFees()
  renderHabits()
  renderShare()
  $('#share-download').onclick=downloadShare
  $('#export').onclick=exportCsv
  return () => { $('#share-download').onclick=null; $('#export').onclick=null }
}
