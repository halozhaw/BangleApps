Bangle.loadWidgets();
Bangle.drawWidgets();

var settings;

function loadSettings() {
  settings = require("Storage").readJSON("halo.json",1)||{};
  var changed = false;
  if (!settings.file) {
    changed = true;
    settings.file = "halo.log0.csv";
  }
  if (!Array.isArray(settings.record)) {
    settings.record = ["hr"];
    changed = true;
  }
  if (changed)
    require("Storage").writeJSON("halo.json", settings);
}
loadSettings();

function updateSettings() {
  require("Storage").writeJSON("halo.json", settings);
  if (WIDGETS["halo"])
    WIDGETS["halo"].reload();
}

function getTrackNumber(filename) {
  var matches = filename.match(/^halo\.log(.*)\.csv$/);
  if (matches) return matches[1];
  return 0;
}

function showMainMenu() {
  function menuRecord(id) {
    return {
      value: settings.record.includes(id),
      onchange: v => {
        settings.recording = false; // stop recording if we change anything
        settings.record = settings.record.filter(r=>r!=id);
        if (v) settings.record.push(id);
        updateSettings();
      }
    };
  }
  const mainmenu = {
    '': { 'title': /*LANG*/'
' },
    '< Back': ()=>{load();},
    /*LANG*/'RECORD': {
      value: !!settings.recording,
      onchange: v => {
        setTimeout(function() {
          E.showMenu();
          WIDGETS["halo"].setRecording(v).then(function() {
            //print("Record start Complete");
            loadSettings();
            //print("Recording: "+settings.recording);
            showMainMenu();
          });
        }, 1);
      }
    },
    /*LANG*/'File' : {value:getTrackNumber(settings.file)},
    /*LANG*/'View Tracks': ()=>{viewTracks();},
    /*LANG*/'Time Period': {
      value: settings.period||10,
      min: 1,
      max: 120,
      step: 1,
      format: v=>v+"s",
      onchange: v => {
        settings.recording = false; // stop recording if we change anything
        settings.period = v;
        updateSettings();
      }
    }
  };
  var recorders = WIDGETS["halo"].getRecorders();
  Object.keys(recorders).forEach(id=>{
    mainmenu[/*LANG*/"Log "+recorders[id]().name] = menuRecord(id);
  });
  delete recorders;
  return E.showMenu(mainmenu);
}



function viewTracks() {
  const menu = {
    '': { 'title': /*LANG*/'Tracks' }
  };
  var found = false;
  require("Storage").list(/^halo\.log.*\.csv$/,{sf:true}).reverse().forEach(filename=>{
    found = true;
    menu[/*LANG*/getTrackNumber(filename)] = ()=>viewTrack(filename,false);
  });
  if (!found)
    menu[/*LANG*/"No Tracks found"] = function(){};
  menu['< Back'] = () => { showMainMenu(); };
  return E.showMenu(menu);
}

function getTrackInfo(filename) {
  "ram"
  var minLat = 90;
  var maxLat = -90;
  var minLong = 180;
  var maxLong = -180;
  var starttime, duration=0;
  var f = require("Storage").open(filename,"r");
  if (f===undefined) return;
  var l = f.readLine(f);
  var fields, timeIdx, latIdx, lonIdx;
  var nl = 0, c, n;
  if (l!==undefined) {
    fields = l.trim().split(",");
    timeIdx = fields.indexOf("Time");
    latIdx = fields.indexOf("Latitude");
    lonIdx = fields.indexOf("Longitude");
    l = f.readLine(f);
  }
  if (l!==undefined) {
    c = l.split(",");
    starttime = parseInt(c[timeIdx]);
  }
  // pushed this loop together to try and bump loading speed a little
  while(l!==undefined) {
    ++nl;c=l.split(",");l = f.readLine(f);
    if (c[latIdx]=="")continue;
    n = +c[latIdx];if(n>maxLat)maxLat=n;if(n<minLat)minLat=n;
    n = +c[lonIdx];if(n>maxLong)maxLong=n;if(n<minLong)minLong=n;
  }
  if (c) duration = parseInt(c[timeIdx]) - starttime;
  var lfactor = Math.cos(minLat*Math.PI/180);
  var ylen = (maxLat-minLat);
  var xlen = (maxLong-minLong)* lfactor;
  var screenSize = g.getHeight()-48; // 24 for widgets, plus a border
  var scale = xlen>ylen ? screenSize/xlen : screenSize/ylen;
  return {
    fn : getTrackNumber(filename),
    fields : fields,
    filename : filename,
    time : new Date(starttime*1000),
    records : nl,
    minLat : minLat, maxLat : maxLat,
    minLong : minLong, maxLong : maxLong,
    lat : (minLat+maxLat)/2, lon : (minLong+maxLong)/2,
    lfactor : lfactor,
    scale : scale,
    duration : Math.round(duration)
  };
}

function asTime(v){
  var mins = Math.floor(v/60);
  var secs = v-mins*60;
  return ""+mins.toString()+"m "+secs.toString()+"s";
}

function viewTrack(filename, info) {
  if (!info) {
    E.showMessage(/*LANG*/"Loading...",/*LANG*/"Track "+getTrackNumber(filename));
    info = getTrackInfo(filename);
  }
  //console.log(info);
  const menu = {
    '': { 'title': /*LANG*/'Track '+info.fn }
  };
  if (info.time)
    menu[info.time.toISOString().substr(0,16).replace("T"," ")] = {};
  menu["Duration"] = { value : asTime(info.duration)};
  menu["Records"] = { value : ""+info.records };
  // TODO: steps, heart rate?
  menu[/*LANG*/'Erase'] = function() {
    E.showPrompt(/*LANG*/"Delete Track?").then(function(v) {
      if (v) {
        settings.recording = false;
        updateSettings();
        var f = require("Storage").open(filename,"r");
        f.erase();
        viewTracks();
      } else
        viewTrack(filename, info);
    });
  };
  menu['< Back'] = () => { viewTracks(); };
  return E.showMenu(menu);
}



showMainMenu();
