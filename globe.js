/* ===========================================================================
   Page-wide animated background: a rotating wireframe globe with major cities
   linked by glowing great-circle arcs and travelling light pulses.
   Tuned for the light/warm theme. Pure vanilla canvas — no dependencies.
   =========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bg-globe");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W, H, DPR, cx, cy, R;
  var TILT = -0.42;
  var cosT = Math.cos(TILT), sinT = Math.sin(TILT);

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W * 0.5;
    cy = H * 0.5;
    R = Math.min(W, H) * 0.42;
  }
  window.addEventListener("resize", resize);
  resize();

  // --- cities (lat, lon in degrees) --------------------------------------
  var cityData = [
    [40.7, -74.0],   // 0  New York
    [51.5, -0.1],    // 1  London
    [48.9, 2.3],     // 2  Paris
    [55.8, 37.6],    // 3  Moscow
    [25.2, 55.3],    // 4  Dubai
    [35.7, 139.7],   // 5  Tokyo
    [1.35, 103.8],   // 6  Singapore
    [-33.9, 151.2],  // 7  Sydney
    [-23.5, -46.6],  // 8  Sao Paulo
    [34.0, -118.2],  // 9  Los Angeles
    [30.0, 31.2],    // 10 Cairo
    [19.0, 72.8],    // 11 Mumbai
    [39.9, 116.4],   // 12 Beijing
    [-26.2, 28.0],   // 13 Johannesburg
    [43.2, 76.9],    // 14 Almaty
    [51.1, 71.4]     // 15 Astana
  ];

  var edges = [
    [0, 1], [1, 2], [2, 3], [3, 14], [14, 15], [14, 11], [14, 4],
    [4, 11], [11, 6], [6, 5], [5, 12], [12, 15], [4, 10], [10, 1],
    [10, 13], [13, 8], [8, 0], [0, 9], [9, 5], [6, 7], [7, 5],
    [1, 15], [2, 10]
  ];

  function toVec(lat, lon) {
    var a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return {
      x: Math.cos(a) * Math.sin(b),
      y: Math.sin(a),
      z: Math.cos(a) * Math.cos(b)
    };
  }
  var cities = cityData.map(function (c) { return toVec(c[0], c[1]); });

  function project(v, cosR, sinR) {
    var x = v.x * cosR + v.z * sinR;
    var z = -v.x * sinR + v.z * cosR;
    var y = v.y;
    var z2 = y * sinT + z * cosT;
    var y2 = y * cosT - z * sinT;
    return { sx: cx + x * R, sy: cy - y2 * R, z: z2 };
  }

  function slerp(a, b, t) {
    var dot = a.x * b.x + a.y * b.y + a.z * b.z;
    dot = Math.max(-1, Math.min(1, dot));
    var om = Math.acos(dot);
    if (om < 1e-4) return a;
    var so = Math.sin(om);
    var s1 = Math.sin((1 - t) * om) / so;
    var s2 = Math.sin(t * om) / so;
    return { x: a.x * s1 + b.x * s2, y: a.y * s1 + b.y * s2, z: a.z * s1 + b.z * s2 };
  }

  var ARC_STEPS = 46;
  var arcs = edges.map(function (e) {
    var A = cities[e[0]], B = cities[e[1]];
    var pts = [];
    for (var i = 0; i <= ARC_STEPS; i++) {
      var t = i / ARC_STEPS;
      var v = slerp(A, B, t);
      var lift = 1 + 0.16 * Math.sin(Math.PI * t);
      pts.push({ x: v.x * lift, y: v.y * lift, z: v.z * lift });
    }
    return { pts: pts, phase: Math.random() };
  });

  function drawGridLine(points, cosR, sinR) {
    ctx.beginPath();
    var drawing = false;
    for (var i = 0; i < points.length; i++) {
      var p = project(points[i], cosR, sinR);
      if (p.z > 0) {
        if (!drawing) { ctx.moveTo(p.sx, p.sy); drawing = true; }
        else ctx.lineTo(p.sx, p.sy);
      } else {
        drawing = false;
      }
    }
    ctx.stroke();
  }

  function drawGrid(cosR, sinR) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(26,23,20,0.10)";
    var lat, lon, pts;
    for (lat = -60; lat <= 60; lat += 30) {
      pts = [];
      for (lon = 0; lon <= 360; lon += 6) pts.push(toVec(lat, lon));
      drawGridLine(pts, cosR, sinR);
    }
    for (lon = 0; lon < 180; lon += 30) {
      pts = [];
      for (lat = -90; lat <= 90; lat += 6) pts.push(toVec(lat, lon));
      drawGridLine(pts, cosR, sinR);
    }
  }

  function drawArc(arc, cosR, sinR, time) {
    var pts = arc.pts, screen = [];
    for (var i = 0; i < pts.length; i++) screen.push(project(pts[i], cosR, sinR));

    ctx.save();
    ctx.shadowColor = "rgba(255,93,59,0.55)";
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "rgba(255,93,59,0.55)";
    ctx.beginPath();
    var drawing = false;
    for (i = 0; i < screen.length; i++) {
      var p = screen[i];
      if (p.z > -0.02) {
        if (!drawing) { ctx.moveTo(p.sx, p.sy); drawing = true; }
        else ctx.lineTo(p.sx, p.sy);
      } else {
        drawing = false;
      }
    }
    ctx.stroke();
    ctx.restore();

    var tp = (time * 0.16 + arc.phase) % 1;
    var idx = Math.round(tp * ARC_STEPS);
    var pp = screen[idx];
    if (pp && pp.z > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(108,76,255,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(108,76,255,0.95)";
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCities(cosR, sinR) {
    for (var i = 0; i < cities.length; i++) {
      var p = project(cities[i], cosR, sinR);
      if (p.z <= 0) continue;
      ctx.fillStyle = "rgba(26,23,20,0.7)";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw(rot, time) {
    var cosR = Math.cos(rot), sinR = Math.sin(rot);
    ctx.clearRect(0, 0, W, H);

    // subtle sphere shading so the globe reads on the light background
    var body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    body.addColorStop(0, "rgba(108,76,255,0.05)");
    body.addColorStop(0.7, "rgba(26,23,20,0.035)");
    body.addColorStop(1, "rgba(26,23,20,0.07)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    drawGrid(cosR, sinR);
    for (var i = 0; i < arcs.length; i++) drawArc(arcs[i], cosR, sinR, time);
    drawCities(cosR, sinR);
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    draw(0.6, 0);
    return;
  }

  var rot = 0.6, last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    rot += dt * 0.11;
    draw(rot, now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
