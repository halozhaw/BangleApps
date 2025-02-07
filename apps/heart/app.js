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
    '< Back': ()=>{load();}
  };
  return E.showMenu(mainMenu);
}


function stop() {
  E.showMenu();
  load();
}


showMainMenu();

// vim: et ts=2 sw=2
