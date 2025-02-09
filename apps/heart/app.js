E.setFlags({pretokenise:1});

function log(msg) {
  console.log("heart: " + msg + "; mem used: " + process.memory().usage / process.memory().blocksize);
  return;
}

log("start");

Bangle.loadWidgets();
Bangle.drawWidgets();

var settings = require("Storage").readJSON("heart.json",1)||{};

function getFileNbr(n) {
  return ".heart"+n.toString(36);
}

function updateSettings() {
  require("Storage").write("heart.json", settings);
  if (WIDGETS["heart"])
    WIDGETS["heart"].reload();
  return;
}

function showMainMenu() {
  const mainMenu = {
    '': { 'title': 'Heart Recorder' },
    'RECORD': {
      value: !!settings.isRecording,
      onchange: v => {
        settings.isRecording = v;
        updateSettings();
      }
    },
    'File Number': {
      value: settings.fileNbr|0,
      min: 0,
      max: 35,
      step: 1,
      onchange: v => {
        settings.isRecording = false;
        settings.fileNbr = v;
        updateSettings();
      }
    },
    'View Records': ()=>{createRecordMenu(viewRecord.bind());},
    '< Back': ()=>{load();}
  };
  return E.showMenu(mainMenu);
}
// Date().as().str cannot be used as it always returns UTC time
function getDateString(timestamp) {
  var date = new Date(timestamp);
  var day = date.getDate() < 10 ? "0" + date.getDate().toString() : date.getDate().toString();
  var month = date.getMonth() < 10 ? "0" + date.getMonth().toString() : date.getMonth().toString();
  return day + "." + month + "." + date.getFullYear();
}

// Date().as().str cannot be used as it always returns UTC time
function getTimeString(timestamp) {
  var date = new Date(timestamp);
  var hour = date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours().toString();
  var minute = date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes().toString();
  return hour + ':' + minute;
}

function createRecordMenu(func) {
  const menu = {
    '': { 'title': 'Heart Records' }
  };
  var found = false;
  for (var n=0;n<36;n++) {
    var line = require("Storage").open(getFileNbr(n),"r").readLine();
    if (line!==undefined) {
      menu["#" + n + " " + getDateString(line.split(",")[0]*1000) + " " + getTimeString(line.split(",")[0]*1000)] = func.bind(null, n);
      found = true;
    }
  }
  if (!found)
    menu["No Records Found"] = function(){};
  menu['< Back'] = ()=>{showMainMenu();};
  return E.showMenu(menu);
}

function viewRecord(n) {
  E.showMenu({'': 'Heart Record '+n});
  E.showMessage(
    "Loading Data ...\n\nMay take a while,\nwill vibrate\nwhen done.",
    'Heart Record '+n
  );
  const menu = {
    '': { 'title': 'Heart Record '+n }
  };
  var heartTime;
  var f = require("Storage").open(getFileNbr(n),"r");
  var l = f.readLine();
  // using arrays for memory optimization
  var limits = Uint8Array(2);
  // using arrays for memory optimization
  var avg = Uint32Array(2);
  // minimum
  limits[0] = 2000;
  // maximum
  limits[1] = 0;
  // count
  avg[0] = 0;
  // average sum
  avg[1] = 0;
  var count = 0;
  var value = 0;
  if (l!==undefined)
    heartTime = new Date(l.split(",")[0]*1000);
  log("parsing records");
  while (l!==undefined) {
    count++;
    if (parseInt(l.split(',')[2]) >= 70) {
      avg[0]++;
      value = parseInt(l.split(',')[1]);
      if (value < limits[0]) {
        limits[0] = value;
      } else if (value > limits[1]) {
        limits[1] = value;
      }
      avg[1] += value;
    }
    l = f.readLine();
  }
  l = undefined;
  value = undefined;
  log("finished parsing");
  if (heartTime)
    menu[" "+heartTime.toString().substr(4,17)] = function(){};
  menu[count + " records"] = function(){};
  menu["Min: " + limits[0]] = function(){};
  menu["Max: " + limits[1]] = function(){};
  menu["Avg: " + Math.round(avg[1] / avg[0])] = function(){};
  menu["Erase"] = function() {
    E.showPrompt("Delete Record?").then(function(v) {
      if (v) {
        if (n == settings.fileNbr) {
          settings.isRecording = false;
          updateSettings();
        }
        require("Storage").open(getFileNbr(n),"r").erase();
        E.showMenu();
        createRecordMenu(viewRecord.bind());
      } else
        return viewRecord(n);
    });
  };
  menu['< Back'] = ()=>{createRecordMenu(viewRecord.bind());};
  Bangle.buzz(200, 0.3);
  return E.showMenu(menu);
}

function stop() {
  E.showMenu();
  load();
}


showMainMenu();

// vim: et ts=2 sw=2
