(() => {
  var settings = {};
  var hrmToggle = true; // toggles once for each reading
  var recFile; // file for heart rate recording

  // draw your widget
  function draw() {
    if (!settings.isRecording) return;
    g.reset();
    g.setFontAlign(0,0);
    g.clearRect(this.x,this.y,this.x+23,this.y+23);
    g.setColor(hrmToggle?"#ff0000":"#ff8000");
    g.fillCircle(this.x+6,this.y+6,4); // draw heart left circle
    g.fillCircle(this.x+16,this.y+6,4); // draw heart right circle
    g.fillPoly([this.x+2,this.y+8,this.x+20,this.y+8,this.x+11,this.y+18]); // draw heart bottom triangle
    g.setColor(-1); // change color back to be nice to other apps
  }

var lastHRMTime = 0;
var sampleInterval = 800; // Set the sampling interval in milliseconds (e.g., 500ms = 2Hz)

function onHRM(hrm) {
  var currentTime = getTime();

  // Only process if the interval has passed
  if (currentTime - lastHRMTime >= sampleInterval / 1000) {
    hrmToggle = !hrmToggle;
    // Get accelerometer data
    var accel = Bangle.getAccel();  // Get the current accelerometer data
    // Draw the heart widget
    WIDGETS["heart"].draw();
    // Write to the file
    if (recFile) {
      recFile.write([getTime().toFixed(0), hrm.bpm, hrm.confidence, hrm.raw,
                     accel.x.toFixed(4), accel.y.toFixed(4), accel.z.toFixed(4)].join(",") + "\n");
    }
    
    // Update the last HRM time to the current time
    lastHRMTime = currentTime;
  }
}

// Called by the heart app to reload settings and decide what's
function reload() {
  settings = require("Storage").readJSON("heart.json", 1) || {};
  settings.fileNbr |= 0;
  
  // Remove the previous listener
  Bangle.removeListener('HRM-raw', onHRM);

  // Check if recording is enabled
  if (settings.isRecording) {
    WIDGETS["heart"].width = 24;
    // Reattach the HRM listener with the new throttle mechanism
    Bangle.on('HRM-raw', onHRM);
    Bangle.setHRMPower(1, "heart");
    
    // Open the recording file
    var n = settings.fileNbr.toString(36);
    recFile = require("Storage").open(".heart" + n, "a");
  } else {
    WIDGETS["heart"].width = 0;
    Bangle.setHRMPower(0, "heart");
    recFile = undefined;
  }
}
  // add the widget
  WIDGETS["heart"]={area:"tl",width:24,draw:draw,reload:function() {
    reload();
    Bangle.drawWidgets(); // relayout all widgets
  }};
  // load settings, set correct widget width
  reload();
})()
