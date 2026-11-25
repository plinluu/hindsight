// Adapted from Hindsight. Copyright (c) 2026 plinluu. All rights reserved.
import * as C from './calculations'
function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemo() {
  var specs = [
    ["AURX", 50, 0.008, 4, 12, 100],
    ["BLMR", 120, -0.004, 8, 16, 40],
    ["CYNO", 33, 0.006, 14, 20, 200],
    ["DRVN", 80, 0.010, 10, 18, 50],
    ["EVRT", 15, -0.010, 6, 60, 300],
    ["FLUX", 200, 0.012, 20, 27, 15],
    ["GRNT", 44, -0.003, 24, 50, 150],
    ["HLIO", 60, 0.009, 30, 36, 80]
  ];

  var series = {};
  var trades = [];

  specs.forEach(function (spec, index) {
    var random = rng(index * 97 + 13);
    var points = [];
    var phase = index * 1.7;
    for (var i = 0; i < 90; i++) {
      points.push({
        d: C.addDays("2025-01-06", i * 7),
        c: +(spec[1] * Math.exp(spec[2] * i + 0.09 * Math.sin(i / 5 + phase) + (random() - 0.5) * 0.03)).toFixed(2)
      });
    }
    series[spec[0]] = points;
    var buy = points[spec[3]];
    var sell = points[spec[4]];
    trades.push(C.makeTrade({
      tk: spec[0],
      bd: buy.d,
      bp: buy.c,
      sd: sell.d,
      sp: sell.c,
      q: spec[5],
      fee: 19.98,
      fx: (index % 2 ? 24 : 0) + 11
    }));
  });

  return {series,trades};
}
