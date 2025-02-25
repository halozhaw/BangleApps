(() => {
var settings = {};
var hrmToggle = true;
var recFile;
var lastHRMTime = 0;
var sampleInterval = 40; // 25Hz (40ms interval)
var lastHRM = null;

// Huffman Encoding Tables
// Optimized for HR range 50-180 with 60-100 as lowest size
var huffmanHRTable = {
  60: "1000", 61: "1001", 62: "1010", 63: "1011", 64: "1100",
  65: "1101", 66: "1110", 67: "11110", 68: "11111", 69: "101000",
  70: "101001", 71: "101010", 72: "101011", 73: "101100", 74: "101101",
  75: "101110", 76: "101111", 77: "110000", 78: "110001", 79: "110010",
  80: "110011", 81: "110100", 82: "110101", 83: "110110", 84: "110111",
  85: "1110000", 86: "1110001", 87: "1110010", 88: "1110011", 89: "1110100",
  90: "1110101", 91: "1110110", 92: "1110111", 93: "1111000", 94: "1111001",
  95: "1111010", 96: "1111011", 97: "1111100", 98: "1111101", 99: "1111110",
  100: "1111111", 50: "10100000", 51: "10100001", 52: "10100010", 53: "10100011",
  54: "10100100", 55: "10100101", 56: "10100110", 57: "10100111", 58: "10101000",
  59: "10101001", 101: "10101010", 102: "10101011", 103: "10101100", 104: "10101101",
  105: "10101110", 106: "10101111", 107: "10110000", 108: "10110001", 109: "10110010",
  110: "10110011", 111: "10110100", 112: "10110101", 113: "10110110", 114: "10110111",
  115: "10111000", 116: "10111001", 117: "10111010", 118: "10111011", 119: "10111100",
  120: "10111101", 121: "10111110", 122: "10111111", 123: "11000000", 124: "11000001",
  125: "11000010", 126: "11000011", 127: "11000100", 128: "11000101", 129: "11000110",
  130: "11000111", 131: "11001000", 132: "11001001", 133: "11001010", 134: "11001011",
  135: "11001100", 136: "11001101", 137: "11001110", 138: "11001111", 139: "11010000",
  140: "11010001", 141: "11010010", 142: "11010011", 143: "11010100", 144: "11010101",
  145: "11010110", 146: "11010111", 147: "11011000", 148: "11011001", 149: "11011010",
  150: "11011011", 151: "11011100", 152: "11011101", 153: "11011110", 154: "11011111",
  155: "11100000", 156: "11100001", 157: "11100010", 158: "11100011", 159: "11100100",
  160: "11100101", 161: "11100110", 162: "11100111", 163: "11101000", 164: "11101001",
  165: "11101010", 166: "11101011", 167: "11101100", 168: "11101101", 169: "11101110",
  170: "11101111", 171: "11110000", 172: "11110001", 173: "11110010", 174: "11110011",
  175: "11110100", 176: "11110101", 177: "11110110", 178: "11110111", 179: "11111000",
  180: "11111001"
};

function encodeHuffman(value, table) {
  return table[value] || "1111111"; // Fallback encoding for out-of-range values
}

function onHRM(hrm) {
  lastHRM = hrm;
}

function onHRMRaw(hrm) {
  var currentTime = getTime();
  if (currentTime - lastHRMTime >= sampleInterval / 1000) {
    hrmToggle = !hrmToggle;
    WIDGETS["heart"].draw();
    if (recFile && lastHRM) {
      var encodedHR = encodeHuffman(lastHRM.bpm, huffmanHRTable);
      var encodedRaw = encodeHuffman(hrm.bpm, huffmanHRTable);
      recFile.write([getTime().toFixed(0), encodedHR, lastHRM.confidence, encodedRaw, 
                     hrm.raw].join(",") + "\n");
    }
    lastHRMTime = currentTime;
  }
}
function draw() {
  if (!settings.isRecording) return;
  g.reset();
  g.setFontAlign(0,0);
  g.clearRect(this.x,this.y,this.x+23,this.y+23);
  g.setColor(hrmToggle ? "#ff0000" : "#ff8000");
  g.fillCircle(this.x+6,this.y+6,4); // draw heart left circle
  g.fillCircle(this.x+16,this.y+6,4); // draw heart right circle
  g.fillPoly([this.x+2,this.y+8,this.x+20,this.y+8,this.x+11,this.y+18]); // draw heart bottom triangle
  g.setColor(-1); // Reset color
}
function reload() {
  settings = require("Storage").readJSON("heart.json", 1) || {};
  settings.fileNbr |= 0;
  Bangle.removeListener('HRM', onHRM);
  Bangle.removeListener('HRM-raw', onHRMRaw);

  if (settings.isRecording) {
    WIDGETS["heart"].width = 24;
    Bangle.on('HRM', onHRM);
    Bangle.on('HRM-raw', onHRMRaw);
    Bangle.setHRMPower(1, "heart"); // Ensure HRM is powered on before attaching listener
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

