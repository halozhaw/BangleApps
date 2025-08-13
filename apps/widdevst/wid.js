(() => {
  const THRESH = 1000; // alarm when FREE bytes <= this
  var stat = { date: 0, used: 0, total: 0, free: 0, alarmed: false };

  function getStats() {
    const s = require("Storage").getStats();
    stat.used  = s.fileBytes|0;
    stat.total = s.totalBytes|0;
    stat.free  = stat.total - stat.used;
    stat.date  = Date.now();
  }

  function col(p) { // p = used fraction
    return p < 0.5 ? '#0f0' : (p < 0.8 ? '#f80' : '#f00');
  }

  function maybeAlarm() {
    if (stat.free <= THRESH && !stat.alarmed) {
      stat.alarmed = true;
      // double buzz
      Bangle.buzz(400,0.4);
      setTimeout(() => Bangle.buzz(400,0.4), 600);
    } else if (stat.free > THRESH + 2048) {
      // simple hysteresis so it doesn't spam-buzz
      stat.alarmed = false;
    }
  }

  function draw() {
    // refresh stats at least once a minute
    if (Date.now() - stat.date > 60000) getStats();

    const x = this.x, y = this.y;
    g.reset();
    g.clearRect(x, y, x + 21, y + 23);

    // outline
    g.drawRect(x + 1, y + 1, x + 20, y + 21);

    // usage bar (horizontal at bottom)
    const usedFrac = stat.total ? stat.used / stat.total : 0;
    

    const w = Math.round(usedFrac * 18);
    g.setColor(col(usedFrac));
    g.fillRect(x + 2, y + 12, x + 2 + w, y + 20);

    // label: free kilobytes + "!" when low
    g.setColor(-1);
    g.setFont('4x6', 1);
    const freeKB = Math.max(0, stat.free >> 10);
    g.drawString(freeKB + "k", x + 3, y + 3);
    if (stat.free <= THRESH) g.drawString("!", x + 15, y + 3);

    maybeAlarm();
    setTimeout(draw, Bangle.isLocked() ? 60000 : 5000);
    
      // DEBUG LOG
    console.log(
      "[devst] used=", stat.used,
      " total=", stat.total,
      " free=", stat.free,
      " frac=", usedFrac.toFixed(4),
      " w=", w, "(raw=", w.toFixed(2), ")",
      " rect=(", (x+2), ",", (y+12), ")..(", (x+2+w), ",", (y+20), ")"
    );
  }

  WIDGETS.devst = {
    area: "tr",
    width: 22,
    draw: draw
  };

  getStats();
  draw();
})();
