(() => {
  const THRESH = 1000*1024; // alarm when FREE bytes <= this
  var stat = { date: 0, used: 0, total: 0, free: 0, alarmed: false };

  function getStats() {
  const S = require("Storage");
  const st = S.getStats();

  stat.total   = st.totalBytes|0;   // total storage
  stat.used    = st.fileBytes|0;    // actual live files
  stat.free    = S.getFree()|0;     // == st.freeBytes (contiguous free, matches About)
  stat.date    = Date.now();
}

  function col(p) { // p = used fraction
    return p < 0.5 ? '#0f0' : (p < 0.8 ? '#f80' : '#f00');
  }

 // function maybeAlarm() {
  //  if (stat.free <= THRESH && !stat.alarmed) {
  //    stat.alarmed = true;
      // double buzz
 //     Bangle.buzz(400,0.8);
 //     setTimeout(() => Bangle.buzz(400,0.8), 600);
 //   } else if (stat.free > THRESH + 2048) {
      // simple hysteresis so it doesn't spam-buzz
  //    stat.alarmed = false;
  //  }
  //}
  function maybeAlarm() {
  if (stat.free <= THRESH && (Date.now() - lastBuzz) > COOLDOWN) {
    Bangle.buzz(400, 0.8);
    setTimeout(() => Bangle.buzz(400, 0.8), 600);
    lastBuzz = Date.now();
  }
}

  
  // self-schedule with proper context
  let _timer;
  function tick() {
  getStats();        // refresh numbers first
  maybeAlarm();      // decide whether to buzz
  WIDGETS.devst.draw(); // then redraw (keeps 'this' correct)
  scheduleNext();    // re-arm the timer
}
  function scheduleNext() {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(tick, Bangle.isLocked() ? 60000 : 5000);
  }
  
  function draw() {
    // refresh stats at least once a minute
    if (Date.now() - stat.date > 60000) getStats();

    const x = this.x, y = this.y;
    g.reset();
    //g.clearRect(x, y, x + 21, y + 23);
    g.clearRect(x, y, x + (this.width - 1), y + 23);

    // outline
    //g.drawRect(x + 1, y + 1, x + 20, y + 22);
    g.drawRect(x + 1, y + 1, x + (this.width - 2), y + 22);

    // usage bar (horizontal at bottom)
    const usedFrac = stat.total ? stat.used / stat.total : 0;
    

    //const w = Math.round(usedFrac * 18);
    const w = Math.round(usedFrac * (this.width - 4));
    g.setColor(col(usedFrac));
    g.fillRect(x + 2, y + 12, x + 2 + w, y + 20);

    // label: free kilobytes + "!" when low
    g.setColor(0);
    g.setFont('4x6', 2);
    const freeKB = Math.max(0, stat.free >> 10);
    g.drawString(freeKB, x + 3, y + 5);
    if (stat.free <= THRESH) g.drawString("!", (this.width - 2), y + 5);

      maybeAlarm();
      scheduleNext();
  }

  WIDGETS.devst = {
    area: "tr",
    width: 40,
    draw: draw
  };

  getStats();
  draw();
  scheduleNext();
})();
