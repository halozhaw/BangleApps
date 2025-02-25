(() => {
var settings = {};
var hrmToggle = true;
var recFile;
var lastHRMTime = 0;
var sampleInterval = 40; // 25Hz (40ms interval)
var lastHRMRaw = null;

// Huffman Encoding Tables
// Optimized for HR range 50-180 with 60-100 as lowest size
var huffmanHRTable = {
  60: "000", 61: "001", 62: "010", 63: "011", 64: "100",
  65: "101", 66: "110", 67: "1110", 68: "1111", 69: "10000",
  70: "10001", 71: "10010", 72: "10011", 73: "10100", 74: "10101",
  75: "10110", 76: "10111", 77: "11000", 78: "11001", 79: "11010",
  80: "11011", 81: "11100", 82: "11101", 83: "11110", 84: "11111",
  85: "000000", 86: "000001", 87: "000010", 88: "000011", 89: "000100",
  90: "000101", 91: "000110", 92: "000111", 93: "001000", 94: "001001",
  95: "001010", 96: "001011", 97: "001100", 98: "001101", 99: "001110",
  100: "001111", 50: "0100000", 51: "0100001", 52: "0100010", 53: "0100011",
  54: "0100100", 55: "0100101", 56: "0100110", 57: "0100111", 58: "0101000",
  59: "0101001", 101: "0101010", 102: "0101011", 103: "0101100", 104: "0101101",
  105: "0101110", 106: "0101111", 107: "0110000", 108: "0110001", 109: "0110010",
  110: "0110011", 111: "0110100", 112: "0110101", 113: "0110110", 114: "0110111",
  115: "0111000", 116: "0111001", 117: "0111010", 118: "0111011", 119: "0111100",
  120: "0111101", 121: "0111110", 122: "0111111", 123: "1000000", 124: "1000001",
  125: "1000010", 126: "1000011", 127: "1000100", 128: "1000101", 129: "1000110",
  130: "1000111", 131: "1001000", 132: "1001001", 133: "1001010", 134: "1001011",
  135: "1001100", 136: "1001101", 137: "1001110", 138: "1001111", 139: "1010000",
  140: "1010001", 141: "1010010", 142: "1010011", 143: "1010100", 144: "1010101",
  145: "1010110", 146: "1010111", 147: "1011000", 148: "1011001", 149: "1011010",
  150: "1011011", 151: "1011100", 152: "1011101", 153: "1011110", 154: "1011111",
  155: "1100000", 156: "1100001", 157: "1100010", 158: "1100011", 159: "1100100",
  160: "1100101", 161: "1100110", 162: "1100111", 163: "1101000", 164: "1101001",
  165: "1101010", 166: "1101011", 167: "1101100", 168: "1101101", 169: "1101110",
  170: "1101111", 171: "1110000", 172: "1110001", 173: "1110010", 174: "1110011",
  175: "1110100", 176: "1110101", 177: "1110110", 178: "1110111", 179: "1111000",
  180: "1111001"
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
                     lastHRM.raw].join(",") + "\n");
    }
    lastHRMTime = currentTime;
  }
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

