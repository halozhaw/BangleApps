{
  let activeRecorders = [];
  let writeSetup; // the interval for writing, or 'true' if using GPS
  let writeSubSecs; // true if we should write .1s for time, otherwise round to nearest second

  let loadSettings = function() {
    var settings = require("Storage").readJSON("halo.json",1)||{};
    settings.period = settings.period||10;
    if (!settings.file || !settings.file.startsWith("halo.log"))
      settings.recording = false;
    if (!settings.record)
      settings.record = ["hr"];
    return settings;
  }

  let updateSettings = function(settings) {
    require("Storage").writeJSON("halo.json", settings);
    if (WIDGETS["halo"]) WIDGETS["halo"].reload();
  }

  let getRecorders = function() {
    var recorders = {
      hrm:function() {
        var raw = "";
        function onHRM(h) {
          raw = h.raw;
        }
        return {
          name : "hr",
          fields : ["Heartrate-raw"],
          getValues : () => {
            var r = [raw];
            raw = "";
            return r;
          },
          start : () => {
            Bangle.on('HRM-raw', onHRM);
            Bangle.setHRMPower(1,"halo");
          },
          stop : () => {
            Bangle.removeListener('HRM-raw', onHRM);
            Bangle.setHRMPower(0,"halo");
          },
        };
      },
      accel:function() {
        return {
          name : "Accel",
          fields : ["x", "y", "z", "mag"],
          getValues : () => {
            const accel = Bangle.getAccel();
            if (accel) {
              return [accel.x, accel.y, accel.z, accel.mag];
          }
            return [0, 0, 0, 0];
          },
          start : () => {
            Bangle.setAccelPower(1, 'halo');
          },
          stop : () => {
            Bangle.setAccelPower(0, 'halo');
          },
        };
      },
    };
    if (Bangle.getPressure){
      recorders['baro'] = function() {
        var temp="";
        function onPress(c) {
            temp=c.temperature;
        }
        return {
          name : "Baro",
          fields : ["Barometer Temperature"],
          getValues : () => {
              var r = [temp];
              temp="";
              return r;
          },
          start : () => {
            Bangle.setBarometerPower(1,"halo");
            Bangle.on('pressure', onPress);
          },
          stop : () => {
            Bangle.setBarometerPower(0,"halo");
            Bangle.removeListener('pressure', onPress);
          },
      }
    }

    require("Storage").list(/^.*\.halo\.js$/).forEach(fn=>eval(require("Storage").read(fn))(recorders));
    return recorders;
  }

  let getActiveRecorders = function(settings) {
    let activeRecorders = [];
    let recorders = getRecorders();
    settings.record.forEach(r => {
      var recorder = recorders[r];
      if (!recorder) {
        console.log(/*LANG*/"Recorder for "+E.toJS(r)+/*LANG*/"+not found");
        return;
      }
      activeRecorders.push(recorder());
    });
    return activeRecorders;
  };
  let getCSVHeaders = activeRecorders => ["Time"].concat(activeRecorders.map(r=>r.fields));

  let writeLog = function() {
    WIDGETS["halo"].draw();
    try {
      var fields = [writeSubSecs?getTime().toFixed(1):Math.round(getTime())];
      activeRecorders.forEach(recorder => fields.push.apply(fields,recorder.getValues()));
      if (storageFile) storageFile.write(fields.join(",")+"\n");
    } catch(e) {
      // If storage.write caused an error, disable
      // GPS recording so we don't keep getting errors!
      console.log("recorder: error", e);
      var settings = loadSettings();
      settings.recording = false;
      require("Storage").write("halo.json", settings);
      reload();
    }
  }

  // Called by the GPS app to reload settings and decide what to do
  let reload = function() {
    var settings = loadSettings();
    if (typeof writeSetup === "number") clearInterval(writeSetup);
    writeSetup = undefined;
    Bangle.removeListener('GPS', writeLog);

    activeRecorders.forEach(rec => rec.stop());
    activeRecorders = [];

    if (settings.recording) {
      // set up recorders
      activeRecorders = getActiveRecorders(settings);
      activeRecorders.forEach(activeRecorder => {
        activeRecorder.start();
      });
      WIDGETS["halo"].width = 15 + ((activeRecorders.length+1)>>1)*12; // 12px per recorder
      // open/create file
      if (require("Storage").list(settings.file).length) { // Append
        storageFile = require("Storage").open(settings.file,"a");
        // TODO: what if loaded modules are different??
      } else {
        storageFile = require("Storage").open(settings.file,"w");
        // New file - write headers
        storageFile.write(getCSVHeaders(activeRecorders).join(",")+"\n");
      }
      // start recording...
      WIDGETS["halo"].draw();
      writeSubSecs = settings.period===1;
      if (settings.period===1 && settings.record.includes("gps")) {
        Bangle.on('GPS', writeLog);
        writeSetup = true;
      } else {
        writeSetup = setInterval(writeLog, settings.period*1000, settings.period);
      }
    } else {
      WIDGETS["halo"].width = 0;
      storageFile = undefined;
    }
  }
  // add the widget
  WIDGETS["halo"]={area:"tl",width:0,draw:function() {
    if (!writeSetup) return;
    g.reset().drawImage(atob("DRSBAAGAHgDwAwAAA8B/D/hvx38zzh4w8A+AbgMwGYDMDGBjAA=="),this.x+1,this.y+2);
    activeRecorders.forEach((recorder,i)=>{
      recorder.draw(this.x+15+(i>>1)*12, this.y+(i&1)*12);
    });
  },getRecorders:getRecorders,reload:function() {
    reload();
    Bangle.drawWidgets(); // relayout all widgets
  },isRecording:function() {
    return !!writeSetup;
  },setRecording:function(isOn, options) {
    /* options = {
      force : [optional] "append"/"new"/"overwrite" - don't ask, just do what's requested
    } */
    var settings = loadSettings();
    options = options||{};
    if (isOn && !settings.recording) {
      var date=(new Date()).toISOString().substr(0,10).replace(/-/g,""), trackNo=10;
      function getTrackFilename() { return "halo.log" + date + trackNo.toString(36) + ".csv"; }
      if (!settings.file || !settings.file.startsWith("halo.log" + date)) {
        // if no filename set or date different, set up a new filename
        settings.file = getTrackFilename();
      }
      var headers = require("Storage").open(settings.file,"r").readLine();
      if (headers){ // if file exists
        if(headers.trim()!==getCSVHeaders(getActiveRecorders(settings)).join(",")){
          // headers don't match, reset (#3081)
          options.force = "new";
        }
        if (!options.force) { // if not forced, ask the question
          g.reset(); // work around bug in 2v17 and earlier where bg color wasn't reset
          return E.showPrompt(
                    /*LANG*/"Overwrite\nLog " + settings.file.match(/^halo\.log(.*)\.csv$/)[1] + "?",
                    { title:/*LANG*/"Halo Logger",
                      buttons:{/*LANG*/"Yes":"overwrite",/*LANG*/"No":"cancel",/*LANG*/"New":"new",/*LANG*/"Append":"append"}
                    }).then(selection=>{
            if (selection==="cancel") return false; // just cancel
            if (selection==="overwrite") return WIDGETS["halo"].setRecording(1,{force:"overwrite"});
            if (selection==="new") return WIDGETS["halo"].setRecording(1,{force:"new"});
            if (selection==="append") return WIDGETS["halo"].setRecording(1,{force:"append"});
            throw new Error("Unknown response!");
          });
        } else if (options.force=="append") {
          // do nothing, filename is the same - we are good
        } else if (options.force=="overwrite") {
          // wipe the file
          require("Storage").open(settings.file,"r").erase();
        } else if (options.force=="new") {
          // new file - use the current date
          var newFileName;
          do { // while a file exists, add one to the letter after the date
            newFileName = getTrackFilename();
            trackNo++;
          } while (require("Storage").list(newFileName).length);
          settings.file = newFileName;
        } else throw new Error("Unknown options.force, "+options.force);
      }
    }
    settings.recording = isOn;
    updateSettings(settings);
    WIDGETS["halo"].reload();
    return Promise.resolve(settings.recording);
  },
  }};
  // load settings, set correct widget width
  reload();
}
