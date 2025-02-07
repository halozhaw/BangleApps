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

function onHRM(hrm) {
  hrmToggle = !hrmToggle;
  WIDGETS["heart"].draw();
  
  // Get accelerometer data
  var accel = Bangle.getAccel();  // Get the current accelerometer data
  
  // If the recording file exists, write the heart rate and accelerometer data in binary format
  if (recFile) {
    // Convert values to appropriate binary format
    var timestamp = Math.floor(getTime());  // Timestamp as integer
    var bpm = Math.round(hrm.bpm);
    var confidence = Math.round(hrm.confidence);
    var raw = Math.round(hrm.raw);
    var accelX = Math.round(accel.x * 100);  // Scale accelerometer data
    var accelY = Math.round(accel.y * 100);
    var accelZ = Math.round(accel.z * 100);

    // Create a binary buffer to store data (total of 14 bytes)
    var buffer = new ArrayBuffer(14);
    var view = new DataView(buffer);

    // Write the values to the buffer
    view.setInt32(0, timestamp, true);    // Timestamp (4 bytes)
    view.setInt16(4, bpm, true);          // Heart rate (2 bytes)
    view.setInt8(6, confidence);          // Confidence (1 byte)
    view.setInt16(7, raw, true);          // Raw value (2 bytes)
    view.setInt16(9, accelX, true);       // Accelerometer X (2 bytes)
    view.setInt16(11, accelY, true);      // Accelerometer Y (2 bytes)
    view.setInt16(13, accelZ, true);      // Accelerometer Z (2 bytes)

    // Write the binary data to the file
    recFile.write(new Uint8Array(buffer)); // Write as binary data
  }
}
  // Called by the heart app to reload settings and decide what's
  function reload() {
    settings = require("Storage").readJSON("heart.json",1)||{};
    settings.fileNbr |= 0;
    // Bangle.removeListener('HRM',onHRM);
    Bangle.removeListener('HRM-raw',onHRM);
    if (settings.isRecording) {
      WIDGETS["heart"].width = 24;
      // Bangle.on('HRM',onHRM);
      Bangle.on('HRM-raw',onHRM);
      Bangle.setHRMPower(1,"heart");
      var n = settings.fileNbr.toString(36);
      recFile = require("Storage").open(".heart"+n,"a");
      console.log("Recording to file: " + currentFileName);
    } else {
      WIDGETS["heart"].width = 0;
      Bangle.setHRMPower(0,"heart");
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
