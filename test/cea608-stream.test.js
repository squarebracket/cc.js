'use strict';

var
  cea608Stream,
  Cea608Stream = require('../lib/cea608-stream'),
  QUnit = require('qunit'),
  characters = require('./utils/characters');


QUnit.module('CEA 608 Stream', {
  beforeEach: function() {
    cea608Stream = new Cea608Stream();
  }
});

QUnit.skip('filters null data', function() {
  QUnit.ok(false, 'not implemented');
});

QUnit.skip('removes parity bits', function() {
  QUnit.ok(false, 'not implemented');
});

QUnit.test('converts non-ASCII character codes to ASCII', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // ASCII exceptions
    { ccData: 0x2a5c, type: 0 },
    { ccData: 0x5e5f, type: 0 },
    { ccData: 0x607b, type: 0 },
    { ccData: 0x7c7d, type: 0 },
    { ccData: 0x7e7f, type: 0 },
    // EOC, End of Caption
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption, clear the display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text,
        String.fromCharCode(0xe1, 0xe9, 0xed, 0xf3, 0xfa, 0xe7, 0xf7, 0xd1, 0xf1, 0x2588),
        'translated non-standard characters');
});

QUnit.test('properly handles special character codes', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // Special characters as defined by CEA-608
    // see the CHARACTER_TRANSLATION hash in lib/cea608-stream for the
    // mapping table
    { ccData: 0x1130, type: 0 },
    { ccData: 0x1131, type: 0 },
    { ccData: 0x1132, type: 0 },
    { ccData: 0x1133, type: 0 },
    { ccData: 0x1134, type: 0 },
    { ccData: 0x1135, type: 0 },
    { ccData: 0x1136, type: 0 },
    { ccData: 0x1137, type: 0 },
    { ccData: 0x1138, type: 0 },
    { ccData: 0x1139, type: 0 },
    { ccData: 0x113a, type: 0 },
    { ccData: 0x113b, type: 0 },
    { ccData: 0x113c, type: 0 },
    { ccData: 0x113d, type: 0 },
    { ccData: 0x113e, type: 0 },
    { ccData: 0x113f, type: 0 },
    // EOC, End of Caption
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption, CC1, clear the display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions[0].text,
        String.fromCharCode(0xae, 0xb0, 0xbd, 0xbf, 0x2122, 0xa2, 0xa3, 0x266a,
            0xe0, 0xa0, 0xe8, 0xe2, 0xea, 0xee, 0xf4, 0xfb),
        'translated special characters');
});

QUnit.test('properly handles extended character codes', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // Extended characters are defined in CEA-608 as a standard character,
    // which is followed by an extended character, and the standard character
    // gets deleted.
    // see the CHARACTER_TRANSLATION hash in lib/cea608-stream for the
    // mapping table
    { ccData: 0x2200, type: 0 },
    { ccData: 0x123e, type: 0 },
    { ccData: 0x4c41, type: 0 },
    { ccData: 0x1230, type: 0 },
    { ccData: 0x2d4c, type: 0 },
    { ccData: 0x4100, type: 0 },
    { ccData: 0x1338, type: 0 },
    { ccData: 0x204c, type: 0 },
    { ccData: 0x417d, type: 0 },
    { ccData: 0x4400, type: 0 },
    { ccData: 0x1137, type: 0 },
    { ccData: 0x2200, type: 0 },
    { ccData: 0x123f, type: 0 },
    // EOC, End of Caption
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption, clear the display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions[0].text, '«LÀ-LÅ LAÑD♪»',
        'translated special characters');
});

QUnit.test('pop-on mode', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // 'hi'
    { ccData: characters('hi'), type: 0 },
    // EOC, End of Caption. Finished transmitting, begin display
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption. End display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];

  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.deepEqual(captions[0], {
    startPts: 1000,
    endPts: 10 * 1000,
    text: 'hi',
    stream: 'CC1'
  }, 'parsed the caption');
});

QUnit.test('ignores null characters', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // 'mu'
    { ccData: characters('mu'), type: 0 },
    // null characters
    { ccData: 0x0000, type: 0 },
    // ' x'
    { ccData: characters(' x'), type: 0 },
    // EOC, End of Caption. Finished transmitting, begin display
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption. End display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];

  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.deepEqual(captions[0], {
    startPts: 1000,
    endPts: 10 * 1000,
    text: 'mu x',
    stream: 'CC1'
  }, 'ignored null characters');
});

QUnit.test('recognizes the Erase Displayed Memory command', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // '01'
    { ccData: characters('01'), type: 0 },
    // EOC, End of Caption. Finished transmitting, display '01'
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // EDM, Erase Displayed Memory
    { pts: 1.5 * 1000, ccData: 0x142c, type: 0 },
    // '23'
    { ccData: characters('23'), type: 0 },
    // EOC, End of Caption. Display '23'
    { pts: 2 * 1000, ccData: 0x142f, type: 0 },
    // '34'
    { ccData: characters('34'), type: 0 },
    // EOC, End of Caption. Display '34'
    { pts: 3 * 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0},
    // EOC, End of Caption
    { pts: 4 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];

  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 3, 'detected three captions');
  QUnit.deepEqual(captions[0], {
    startPts: 1 * 1000,
    endPts: 1.5 * 1000,
    text: '01',
    stream: 'CC1'
  }, 'parsed the first caption');
  QUnit.deepEqual(captions[1], {
    startPts: 2 * 1000,
    endPts: 3 * 1000,
    text: '23',
    stream: 'CC1'
  }, 'parsed the second caption');
  QUnit.deepEqual(captions[2], {
    startPts: 3 * 1000,
    endPts: 4 * 1000,
    text: '34',
    stream: 'CC1'
  }, 'parsed the third caption');
});

QUnit.test('backspaces are applied to non-displayed memory for pop-on mode', function() {
  var captions = [], packets;
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // '01'
    { ccData: characters('01'), type: 0 },
    // backspace
    { ccData: 0x1421, type: 0 },
    { ccData: characters('23'), type: 0 },
    // PAC: row 13, no indent
    { pts: 1 * 1000, ccData: 0x1370, type: 0 },
    { pts: 1 * 1000, ccData: characters('32'), type: 0 },
    // backspace
    { pts: 2 * 1000, ccData: 0x1421, type: 0 },
    { pts: 3 * 1000, ccData: characters('10'), type: 0 },
    // EOC, End of Caption
    { pts: 4 * 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption, flush caption
    { pts: 5 * 1000, ccData: 0x142f, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.equal(captions[0].text, '310\n\n023', 'applied the backspaces');
});

QUnit.test('backspaces on cleared memory are no-ops', function() {
  var captions = [], packets;
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420 },
    // backspace
    { ccData: 0x1421 },
    // EOC, End of Caption. Finished transmitting, display '01'
    { pts: 1 * 1000, ccData: 0x142f }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 0, 'no captions detected');
});

QUnit.test('recognizes the Erase Non-Displayed Memory command', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // '01'
    { ccData: characters('01'), type: 0 },
    // ENM, Erase Non-Displayed Memory
    { ccData: 0x142e, type: 0 },
    { ccData: characters('23'), type: 0 },
    // EOC, End of Caption. Finished transmitting, display '23'
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];

  packets.forEach(cea608Stream.push, cea608Stream);

  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected one caption');
  QUnit.deepEqual(captions[0], {
    startPts: 1 * 1000,
    endPts: 2 * 1000,
    text: '23',
    stream: 'CC1'
  }, 'cleared the non-displayed memory');
});

QUnit.test('ignores unrecognized commands', function() {
  var packets, captions;
  packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // a row-9 magenta command, which is not supported
    { ccData: 0x1f4c, type: 0 },
    // '01'
    { ccData: characters('01'), type: 0 },
    // EOC, End of Caption
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions[0].text, '01', 'skipped the unrecognized commands');
});

QUnit.skip('applies preamble address codes', function() {
  QUnit.ok(false, 'not implemented');
});

QUnit.skip('applies mid-row colors', function() {
  QUnit.ok(false, 'not implemented');
});

QUnit.test('applies mid-row underline', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    { ccData: characters('no'), type: 0 },
    // mid-row, white underline
    { ccData: 0x1121, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, 'no <u>yes.</u>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('applies mid-row italics', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    { ccData: characters('no'), type: 0 },
    // mid-row, italics
    { ccData: 0x112e, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, 'no <i>yes.</i>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('applies mid-row italics underline', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    { ccData: characters('no'), type: 0 },
    // mid-row, italics underline
    { ccData: 0x112f, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, 'no <i><u>yes.</u></i>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

// NOTE: With the exception of white italics PACs (the following two test
// cases), PACs only have their underline attribute extracted and used
QUnit.test('applies PAC underline', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    // PAC: row 15, white underline
    { ccData: 0x1461, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, '<u>yes.</u>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('applies PAC white italics', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    // PAC: row 15, white italics
    { ccData: 0x146e, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, '<i>yes.</i>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('applies PAC white italics underline', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    // PAC: row 15, white italics underline
    { ccData: 0x146f, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // CR (carriage return), dispatches caption
    { ccData: 0x142d, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, '<u><i>yes.</i></u>', 'properly closed by CR');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('closes formatting at PAC row change', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // PAC: row 14, white italics underlime
    { ccData: 0x144f, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // PAC: row 15, indent 0
    { ccData: 0x1470, type: 0 },
    { ccData: characters('no'), type: 0 },
    // EOC, End of Caption
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, '<u><i>yes.</i></u>\nno', 'properly closed by PAC row change');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('closes formatting at EOC', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // PAC: row 15, white italics underline
    { ccData: 0x146f, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // EOC, End of Caption
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { ccData: 0x1420, type: 0 },
    // EOC, End of Caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  QUnit.equal(captions[0].text, '<u><i>yes.</i></u>', 'properly closed by EOC');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('closes formatting at negating mid-row code', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // RU2 (roll-up, 2 rows)
    { ccData: 0x1425, type: 0 },
    { ccData: characters('no'), type: 0 },
    // mid-row: italics underline
    { ccData: 0x112f, type: 0 },
    { ccData: characters('ye'), type: 0 },
    { ccData: characters('s.'), type: 0 },
    // mid-row: white
    { ccData: 0x1120, type: 0 },
    { ccData: characters('no'), type: 0 }
  ];

  packets.forEach(cea608Stream.push, cea608Stream);
  cea608Stream.flushDisplayed();
  QUnit.equal(captions[0].text, 'no <i><u>yes.</u></i> no', 'properly closed by negating mid-row code');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting is empty');
});

QUnit.test('roll-up display mode', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0},
    // '01'
    {
      pts: 1 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // CR, carriage return
    { pts: 3 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected one caption');
  QUnit.deepEqual(captions[0], {
    startPts: 0 * 1000,
    endPts: 3 * 1000,
    text: '01',
    stream: 'CC1'
  }, 'parsed the caption');
  captions = [];

  [ // RU4, roll-up captions 4 rows
    { ccdata: 0x1427, type: 0 },
    // '23'
    {
      pts: 4 * 1000,
      ccData: characters('23'),
      type: 0,
      stream: 'CC1'
    },
    // CR
    { pts: 5 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected another caption');
  QUnit.deepEqual(captions[0], {
    startPts: 3 * 1000,
    endPts: 5 * 1000,
    text: '01\n23',
    stream: 'CC1'
  }, 'parsed the new caption and kept the caption up after the new caption');
});

QUnit.test('roll-up displays multiple rows simultaneously', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0,
      stream: 'CC1'
    },
    // CR, carriage return
    { pts: 1 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.deepEqual(captions[0], {
    startPts: 0 * 1000,
    endPts: 1 * 1000,
    text: '01',
    stream: 'CC1'
  }, 'created a caption for the first period');
  captions = [];

  [ // '23'
    {
      pts: 2 * 1000,
      ccData: characters('23'),
      type: 0,
      stream: 'CC1'
    },
    // CR, carriage return
    { pts: 3 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected another caption');
  QUnit.deepEqual(captions[0], {
    startPts: 1 * 1000,
    endPts: 3 * 1000,
    text: '01\n23',
    stream: 'CC1'
  }, 'created the top and bottom rows after the shift up');
  captions = [];

  [ // '45'
    {
      pts: 4 * 1000,
      ccData: characters('45'),
      type: 0,
      stream: 'CC1'
    },
    // CR, carriage return
    { pts: 5 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected third caption');
  QUnit.deepEqual(captions[0], {
    startPts: 3 * 1000,
    endPts: 5 * 1000,
    text: '23\n45',
    stream: 'CC1'
  }, 'created the top and bottom rows after the shift up');
});

QUnit.test('the roll-up count can be changed on-the-fly', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0,
      stream: 'CC1'
    },
    // CR, carriage return
    { pts: 1 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  captions = [];

  [ // RU3, roll-up captions 3 rows
    { ccData: 0x1426, type: 0 },
    // CR, carriage return
    { pts: 2 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'still displaying a caption');
  captions = [];

  [ // RU4, roll-up captions 4 rows
    { ccData: 0x1427, type: 0 },
    // CR, carriage return
    { pts: 3 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'still displaying a caption');
  captions = [];

  // RU3, roll-up captions 3 rows
  cea608Stream.push({ ccdata: 0x1426, type: 0 });
  QUnit.equal(captions.length, 0, 'cleared the caption');
});

QUnit.test('switching to roll-up from pop-on wipes memories and flushes captions', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RCL (resume caption loading)
    { pts: 0 * 1000, ccData: 0x1420, type: 0 },
    { pts: 0 * 1000, ccData: characters('hi'), type: 0 },
    // EOC (end of caption), mark 1st caption start
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // RCL, resume caption loading
    { pts: 1 * 1000, ccData: 0x1420, type: 0 },
    { pts: 2 * 1000, ccData: characters('oh'), type: 0 },
    // EOC, mark 2nd caption start and flush 1st caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 },
    // RU2 (roll-up, 2 rows), flush 2nd caption
    { pts: 3 * 1000, ccData: 0x1425, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  var displayed = cea608Stream.displayed_.reduce(function(acc, val) {
    acc += val;
    return acc;
  });
  var nonDisplayed = cea608Stream.nonDisplayed_.reduce(function(acc, val) {
    acc += val;
    return acc;
  });

  QUnit.equal(captions.length, 2, 'both captions flushed');
  QUnit.equal(displayed, '', 'displayed memory is wiped');
  QUnit.equal(nonDisplayed, '', 'non-displayed memory is wiped');
  QUnit.deepEqual(captions[0], {
    startPts: 1000,
    endPts: 2000,
    text: 'hi',
    stream: 'CC1'
  }, 'first caption correct');
  QUnit.deepEqual(captions[1], {
    startPts: 2000,
    endPts: 3000,
    text: 'oh',
    stream: 'CC1'
  }, 'second caption correct');
});

QUnit.test('switching to roll-up from paint-on wipes memories and flushes captions', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RDC (resume direct captioning)
    { pts: 0 * 1000, ccData: 0x1429, type: 0 },
    { pts: 0 * 1000, ccData: characters('hi'), type: 0 },
    // RU2 (roll-up, 2 rows), flush displayed caption
    { pts: 1 * 1000, ccData: 0x1425, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  var displayed = cea608Stream.displayed_.reduce(function(acc, val) {
    acc += val;
    return acc;
  });
  var nonDisplayed = cea608Stream.nonDisplayed_.reduce(function(acc, val) {
    acc += val;
    return acc;
  });

  QUnit.equal(captions.length, 1, 'flushed caption');
  QUnit.equal(displayed, '', 'displayed memory is wiped');
  QUnit.equal(nonDisplayed, '', 'non-displayed memory is wiped');
  QUnit.deepEqual(captions[0], {
    startPts: 0,
    endPts: 1000,
    text: 'hi',
    stream: 'CC1'
  }, 'caption correct');
});

// NOTE: This should change to not wiping the display when caption
// positioning is properly implemented
QUnit.test('switching to paint-on from pop-on flushes display', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RCL (resume caption loading)
    { pts: 0 * 1000, ccData: 0x1420, type: 0 },
    // PAC: row 14, indent 0
    { pts: 0 * 1000, ccData: 0x1450, type: 0 },
    { pts: 0 * 1000, ccData: characters('hi'), type: 0 },
    // EOC (end of caption), mark caption start
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // RCL
    { pts: 1 * 1000, ccData: 0x1420, type: 0 },
    // RDC (resume direct captioning), flush caption
    { pts: 2 * 1000, ccData: 0x1429, type: 0 },
    // PAC: row 14, indent 0
    { pts: 2 * 1000, ccData: 0x1450, type: 0 },
    // TO1 (tab offset 1 column)
    { pts: 2 * 1000, ccData: 0x1721, type: 0 },
    { pts: 3 * 1000, ccData: characters('io'), type: 0 },
    // EDM (erase displayed memory), flush paint-on caption
    { pts: 4 * 1000, ccData: 0x142c, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 2, 'detected 2 captions');
  QUnit.equal(captions[0].text, 'hi', 'pop-on caption received');
  QUnit.equal(captions[0].startPts, 1000, 'proper start pts');
  QUnit.equal(captions[0].endPts, 2000, 'proper end pts');
  QUnit.equal(captions[1].text, 'io', 'paint-on caption received');
  QUnit.equal(captions[1].startPts, 2000, 'proper start pts');
  QUnit.equal(captions[1].endPts, 4000, 'proper end pts');
});

QUnit.test('backspaces are reflected in the generated captions', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // backspace
    { ccData: 0x1421, type: 0 },
    {
      pts: 1 * 1000,
      ccData: characters('23'),
      type: 0
    },
    // CR, carriage return
    { pts: 1 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.equal(captions[0].text, '023', 'applied the backspace');
});

QUnit.test('backspaces can remove a caption entirely', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // backspace
    { ccData: 0x1421, type: 0 },
    // Send another command so that the backspace isn't
    // ignored as a duplicate command
    { ccData: 0x1425, type: 0 },
    // backspace
    { ccData: 0x1421, type: 0 },
    // CR, carriage return
    { pts: 1 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 0, 'no caption emitted');
});

QUnit.test('a second identical control code immediately following the first is ignored', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // '02'
    {
      pts: 1 * 1000,
      ccData: characters('02'),
      type: 0
    },
    // backspace
    { ccData: 0x1421, type: 0 },
    // backspace
    { ccData: 0x1421, type: 0 }, // duplicate is ignored
    // backspace
    { ccData: 0x1421, type: 0 },
    // CR, carriage return
    { pts: 2 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'caption emitted');
  QUnit.equal(captions[0].text, '01', 'only two backspaces processed');
});

QUnit.test('a second identical control code separated by only padding from the first is ignored', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // '02'
    {
      pts: 1 * 1000,
      ccData: characters('02'),
      type: 0
    },
    // backspace
    { ccData: 0x1421, type: 0 },
    { ccData: 0x0000, type: 0 },
    { ccData: 0x0000, type: 0 },
    { ccData: 0x0000, type: 0 },
    // backspace
    { pts: 2 * 1000, ccData: 0x1421, type: 0 }, // duplicate is ignored
    // CR, carriage return
    { pts: 3 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'caption emitted');
  QUnit.equal(captions[0].text, '010', 'only one backspace processed');
});

QUnit.test('preamble address codes on same row are NOT converted into spaces', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // PAC: row 15, indent 0
    { ccData: 0x1470, type: 0 },
    // '02'
    {
      pts: 1 * 1000,
      ccData: characters('02'),
      type: 0
    },
    // CR, carriage return
    { pts: 2 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'caption emitted');
  QUnit.equal(captions[0].text, '0102', 'PACs were NOT converted to space');
});

QUnit.test('preserves newlines from PACs in pop-on mode', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RCL, resume caption loading
    { ccData: 0x1420, type: 0 },
    // ENM, erase non-displayed memory
    { ccData: 0x142e, type: 0 },
    // PAC: row 12, indent 0
    { ccData: 0x1350, type: 0 },
    { ccData: 0x5445, type: 0 },
    { ccData: 0x5354, type: 0 },
    // PAC: row 14, indent 0
    { ccData: 0x1450, type: 0 },
    { ccData: 0x5354, type: 0 },
    { ccData: 0x5249, type: 0 },
    { ccData: 0x4e47, type: 0 },
    // PAC: row 15, indent 0
    { ccData: 0x1470, type: 0 },
    { ccData: 0x4441, type: 0 },
    { ccData: 0x5441, type: 0 },
    // EOC, end of caption
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // EOC, duplicated as per spec
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // EOC, dispatch caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'caption emitted');
  QUnit.equal(captions[0].text, 'TEST\n\nSTRING\nDATA', 'Position PACs were converted to newlines');
});

QUnit.test('extracts real-world cc1 and cc3 channels', function() {
  var cea608Stream1 = cea608Stream;
  var cea608Stream3 = new Cea608Stream(1, 0);
  var captions = [];
  cea608Stream1.on('data', function(caption) {
    captions.push(caption);
  });
  cea608Stream3.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    { pts: 425316, type: 0, ccData: 5158 }, // RU3
    { pts: 431322, type: 0, ccData: 5165 }, // CR
    { pts: 440331, type: 0, ccData: 4944 }, // position 11,0
    { pts: 443334, type: 0, ccData: 20549 }, // PE
    { pts: 449340, type: 0, ccData: 21065 }, // RI
    { pts: 449340, type: 0, ccData: 0 }, // padding
    { pts: 452343, type: 0, ccData: 20292 }, // OD
    { pts: 458349, type: 0, ccData: 11264 }, // ,
    { pts: 458349, type: 0, ccData: 0 }, // padding
    { pts: 461352, type: 0, ccData: 0 }, // padding
    { pts: 467358, type: 0, ccData: 8192 }, // (space)
    { pts: 467358, type: 0, ccData: 17920 }, // F
    { pts: 470361, type: 0, ccData: 0 }, // padding
    { pts: 476367, type: 0, ccData: 0 }, // padding
    { pts: 476367, type: 0, ccData: 20300 }, // OL
    { pts: 479370, type: 0, ccData: 19283 }, // KS
    { pts: 485376, type: 0, ccData: 0 }, // padding
    { pts: 485376, type: 0, ccData: 11776 }, // .
    { pts: 674565, type: 0, ccData: 5158 }, // RU3
    { pts: 677568, type: 0, ccData: 5165 }, // CR
    { pts: 371262, type: 1, ccData: 5414 }, // RU3
    { pts: 377268, type: 1, ccData: 0 }, // padding
    { pts: 377268, type: 1, ccData: 4944 }, // position 11,0
    { pts: 380271, type: 1, ccData: 0 }, // padding
    { pts: 386277, type: 1, ccData: 4412 }, // ê
    { pts: 386277, type: 1, ccData: 0 }, // padding
    { pts: 389280, type: 1, ccData: 29810 }, // tr
    { pts: 395286, type: 1, ccData: 25888 }, // e(space)
    { pts: 395286, type: 1, ccData: 30062 }, // un
    { pts: 398289, type: 1, ccData: 25888 }, // e(space)
    { pts: 404295, type: 1, ccData: 28764 }, // pé
    { pts: 404295, type: 1, ccData: 29289 }, // ri
    { pts: 407298, type: 1, ccData: 28516 }, // od
    { pts: 413304, type: 1, ccData: 25856 }, // e
    { pts: 413304, type: 1, ccData: 0 }, // padding
    { pts: 443334, type: 1, ccData: 8292 }, // (space)d
    { pts: 449340, type: 1, ccData: 25888 }, // e(space)
    { pts: 449340, type: 1, ccData: 29045 }, // qu
    { pts: 452343, type: 1, ccData: 25971 }, // es
    { pts: 458349, type: 1, ccData: 29801 }, // ti
    { pts: 458349, type: 1, ccData: 28526 }, // on
    { pts: 461352, type: 1, ccData: 29440 }, // s
    { pts: 467358, type: 1, ccData: 5421 }, // CR
    { pts: 467358, type: 1, ccData: 0 }, // padding
    { pts: 470361, type: 1, ccData: 5414 }, // RU3
    { pts: 476367, type: 1, ccData: 0 } // padding
  ];

  packets.forEach(function(packet) {
    cea608Stream1.push(packet);
    cea608Stream3.push(packet);
  });

  var cc1 = {stream: 'CC1', text: 'PERIOD, FOLKS.'};
  var cc3 = {stream: 'CC3', text: 'être une période de questions'};

  QUnit.equal(captions.length, 2, 'caption emitted');
  QUnit.equal(captions[0].stream, cc1.stream, 'cc1 stream detected');
  QUnit.equal(captions[0].text, cc1.text, 'cc1 stream extracted successfully');
  QUnit.equal(captions[1].stream, cc3.stream, 'cc3 stream detected');
  QUnit.equal(captions[1].text, cc3.text, 'cc3 stream extracted successfully');
});

QUnit.test('backspaces stop at the beginning of the line', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RU2, roll-up captions 2 rows
    { ccData: 0x1425, type: 0 },
    // '01'
    {
      pts: 0 * 1000,
      ccData: characters('01'),
      type: 0
    },
    // backspace
    { ccData: 0x1421, type: 0 },
    // Send another command so that the backspace isn't
    // ignored as a duplicate command
    { ccData: 0x1425, type: 0 },
    // backspace
    { ccData: 0x1421, type: 0 },
    // Send another command so that the backspace isn't
    // ignored as a duplicate command
    { ccData: 0x1425, type: 0 },
    // backspace
    { ccData: 0x1421, type: 0 },
    // CR, carriage return
    { pts: 1 * 1000, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 0, 'no caption emitted');
});

QUnit.test('reset works', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });
  [ // RU2, roll-up captions 2 rows
    { pts: 0, ccData: 0x1425, type: 0 },
    // mid-row: white underline
    { pts: 0, ccData: 0x1121, type: 0 },
    { pts: 0, ccData: characters('01'), type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);
  var buffer = cea608Stream.displayed_.map(function(row) {
    return row.trim();
  }).join('\n')
  .replace(/^\n+|\n+$/g, '');

  QUnit.equal(buffer, '<u>01', 'buffer is as expected');

  cea608Stream.reset();
  buffer = cea608Stream.displayed_
    .map(function(row) {
      return row.trim();
    })
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
  QUnit.equal(buffer, '', 'displayed buffer reset successfully');
  QUnit.equal(cea608Stream.lastControlCode_, null, 'last control code reset successfully');
  QUnit.deepEqual(cea608Stream.formatting_, [], 'formatting was reset');

});


QUnit.test('paint-on mode', function() {
  var packets, captions;
  packets = [
    // RDC, resume direct captioning, begin display
    { pts: 1000, ccData: 0x1429, type: 0 },
    { pts: 2000, ccData: characters('hi'), type: 0 },
    // EDM, erase displayed memory. Finish display, flush caption
    { pts: 3000, ccData: 0x142c, type: 0 }
  ];
  captions = [];

  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  packets.forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.deepEqual(captions[0], {
    startPts: 1000,
    endPts: 3000,
    text: 'hi',
    stream: 'CC1'
  }, 'parsed the caption');
});

QUnit.test('preserves newlines from PACs in paint-on mode', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RDC, resume direct captioning
    { pts: 1000, ccData: 0x1429, type: 0 },
    // PAC: row 12, indent 0
    { pts: 1000, ccData: 0x1350, type: 0 },
    // text: TEST
    { pts: 2000, ccData: 0x5445, type: 0 },
    { pts: 2000, ccData: 0x5354, type: 0 },
    // PAC: row 14, indent 0
    { pts: 3000, ccData: 0x1450, type: 0 },
    // text: STRING
    { pts: 3000, ccData: 0x5354, type: 0 },
    { pts: 4000, ccData: 0x5249, type: 0 },
    { pts: 4000, ccData: 0x4e47, type: 0 },
    // PAC: row 15, indent 0
    { pts: 5000, ccData: 0x1470, type: 0 },
    // text: DATA
    { pts: 5000, ccData: 0x4441, type: 0 },
    { pts: 6000, ccData: 0x5441, type: 0 },
    // EDM, erase displayed memory. Finish display, flush caption
    { pts: 6000, ccData: 0x142c, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'caption emitted');
  QUnit.equal(captions[0].text, 'TEST\n\nSTRING\nDATA', 'Position PACs were converted to newlines');
});

QUnit.test('backspaces are reflected in the generated captions (paint-on)', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [ // RDC, resume direct captioning
    { ccData: 0x1429, type: 0 },
    // '01', default row 15
    { pts: 0 * 1000, ccData: characters('01'), type: 0 },
    // backspace
    { pts: 0 * 1000, ccData: 0x1421, type: 0 },
    { pts: 1 * 1000, ccData: characters('23'), type: 0 },
    // PAC: row 13, indent 0
    { pts: 2 * 1000, ccData: 0x1370, type: 0 },
    { pts: 2 * 1000, ccData: characters('32'), type: 0 },
    // backspace
    { pts: 3 * 1000, ccData: 0x1421, type: 0 },
    { pts: 4 * 1000, ccData: characters('10'), type: 0 },
    // EDM, erase displayed memory, flush caption
    { pts: 5 * 1000, ccData: 0x142c, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 1, 'detected a caption');
  QUnit.equal(captions[0].text, '310\n\n023', 'applied the backspaces');
});

QUnit.test('mix of all modes (extract from CNN)', function() {
  var captions = [];
  cea608Stream.on('data', function(caption) {
    captions.push(caption);
  });

  [
    // RU2 (roll-up, 2 rows)
    { pts: 6675, ccData: 0x1425, type: 0 },
    // CR (carriange return), flush nothing
    { pts: 6675, ccData: 0x142d, type: 0 },
    // PAC: row 2, indent 0
    { pts: 6675, ccData: 0x1170, type: 0 },
    // text: YEAR.
    { pts: 6676, ccData: 0x5945, type: 0 },
    { pts: 6676, ccData: 0x4152, type: 0 },
    { pts: 6676, ccData: 0x2e00, type: 0 },
    // RU2 (roll-up, 2 rows)
    { pts: 6677, ccData: 0x1425, type: 0 },
    // CR (carriange return), flush 1 row
    { pts: 6677, ccData: 0x142d, type: 0 },
    // PAC: row 2, indent 0
    { pts: 6677, ccData: 0x1170, type: 0 },
    // text: GO TO CNNHEROS.COM.
    { pts: 6677, ccData: 0x474f, type: 0 },
    { pts: 6678, ccData: 0x2054, type: 0 },
    { pts: 6678, ccData: 0x4f00, type: 0 },
    { pts: 6678, ccData: 0x2043, type: 0 },
    { pts: 6679, ccData: 0x4e4e, type: 0 },
    { pts: 6679, ccData: 0x4845, type: 0 },
    { pts: 6679, ccData: 0x524f, type: 0 },
    { pts: 6680, ccData: 0x532e, type: 0 },
    { pts: 6680, ccData: 0x434f, type: 0 },
    { pts: 6680, ccData: 0x4d2e, type: 0 },
    // EDM (erase displayed memory), flush 2 displayed roll-up rows
    { pts: 6697, ccData: 0x142c, type: 0 },
    // RDC (resume direct captioning), wipes memories, flushes nothing
    { pts: 6749, ccData: 0x1429, type: 0 },
    // PAC: row 1, indent 0
    { pts: 6750, ccData: 0x1150, type: 0 },
    // text: Did your Senator or Congressman
    { pts: 6750, ccData: 0x4469, type: 0 },
    { pts: 6750, ccData: 0x6420, type: 0 },
    { pts: 6750, ccData: 0x796f, type: 0 },
    { pts: 6751, ccData: 0x7572, type: 0 },
    { pts: 6751, ccData: 0x2053, type: 0 },
    { pts: 6751, ccData: 0x656e, type: 0 },
    { pts: 6752, ccData: 0x6174, type: 0 },
    { pts: 6752, ccData: 0x6f72, type: 0 },
    { pts: 6752, ccData: 0x206f, type: 0 },
    { pts: 6753, ccData: 0x7220, type: 0 },
    { pts: 6753, ccData: 0x436f, type: 0 },
    { pts: 6753, ccData: 0x6e67, type: 0 },
    { pts: 6753, ccData: 0x7265, type: 0 },
    { pts: 6754, ccData: 0x7373, type: 0 },
    { pts: 6754, ccData: 0x6d61, type: 0 },
    { pts: 6754, ccData: 0x6e00, type: 0 },
    // PAC: row 2, indent 0
    { pts: 6755, ccData: 0x1170, type: 0 },
    // TO2 (tab offset 2 columns)
    { pts: 6755, ccData: 0x1722, type: 0 },
    // text: get elected by talking tough
    { pts: 6755, ccData: 0x6765, type: 0 },
    { pts: 6756, ccData: 0x7420, type: 0 },
    { pts: 6756, ccData: 0x656c, type: 0 },
    { pts: 6756, ccData: 0x6563, type: 0 },
    { pts: 6756, ccData: 0x7465, type: 0 },
    { pts: 6757, ccData: 0x6420, type: 0 },
    { pts: 6757, ccData: 0x6279, type: 0 },
    { pts: 6757, ccData: 0x2074, type: 0 },
    { pts: 6758, ccData: 0x616c, type: 0 },
    { pts: 6758, ccData: 0x6b69, type: 0 },
    { pts: 6758, ccData: 0x6e67, type: 0 },
    { pts: 6759, ccData: 0x2074, type: 0 },
    { pts: 6759, ccData: 0x6f75, type: 0 },
    { pts: 6759, ccData: 0x6768, type: 0 },
    // RCL (resume caption loading)
    { pts: 6759, ccData: 0x1420, type: 0 },
    // PAC: row 1, indent 4
    { pts: 6760, ccData: 0x1152, type: 0 },
    // TO1 (tab offset 1 column)
    { pts: 6760, ccData: 0x1721, type: 0 },
    // text: on the national debt?
    { pts: 6760, ccData: 0x6f6e, type: 0 },
    { pts: 6761, ccData: 0x2074, type: 0 },
    { pts: 6761, ccData: 0x6865, type: 0 },
    { pts: 6761, ccData: 0x206e, type: 0 },
    { pts: 6762, ccData: 0x6174, type: 0 },
    { pts: 6762, ccData: 0x696f, type: 0 },
    { pts: 6762, ccData: 0x6e61, type: 0 },
    { pts: 6762, ccData: 0x6c20, type: 0 },
    { pts: 6763, ccData: 0x6465, type: 0 },
    { pts: 6763, ccData: 0x6274, type: 0 },
    { pts: 6763, ccData: 0x3f00, type: 0 },
    // RCL (resume caption loading)
    { pts: 6781, ccData: 0x1420, type: 0 },
    // EDM (erase displayed memory), flush paint-on caption
    { pts: 6781, ccData: 0x142c, type: 0 },
    // EOC (end of caption), mark pop-on caption 1 start
    { pts: 6782, ccData: 0x142f, type: 0 },
    // RCL (resume caption loading)
    { pts: 6782, ccData: 0x1420, type: 0 },
    // PAC: row 1, indent 4
    { pts: 6782, ccData: 0x1152, type: 0 },
    // TO2 (tab offset 2 columns)
    { pts: 6783, ccData: 0x1722, type: 0 },
    // text: Will they stay true
    { pts: 6783, ccData: 0x5769, type: 0 },
    { pts: 6783, ccData: 0x6c6c, type: 0 },
    { pts: 6783, ccData: 0x2074, type: 0 },
    { pts: 6784, ccData: 0x6865, type: 0 },
    { pts: 6784, ccData: 0x7920, type: 0 },
    { pts: 6784, ccData: 0x7374, type: 0 },
    { pts: 6785, ccData: 0x6179, type: 0 },
    { pts: 6785, ccData: 0x2074, type: 0 },
    { pts: 6785, ccData: 0x7275, type: 0 },
    { pts: 6786, ccData: 0x6500, type: 0 },
    // PAC: row 2, indent 8
    { pts: 6786, ccData: 0x1174, type: 0 },
    // text: to their words?
    { pts: 6786, ccData: 0x746f, type: 0 },
    { pts: 6786, ccData: 0x2074, type: 0 },
    { pts: 6787, ccData: 0x6865, type: 0 },
    { pts: 6787, ccData: 0x6972, type: 0 },
    { pts: 6787, ccData: 0x2077, type: 0 },
    { pts: 6788, ccData: 0x6f72, type: 0 },
    { pts: 6788, ccData: 0x6473, type: 0 },
    { pts: 6788, ccData: 0x3f00, type: 0 },
    // RCL (resume caption loading)
    { pts: 6797, ccData: 0x1420, type: 0 },
    // EDM (erase displayed memory), mark pop-on caption 1 end and flush
    { pts: 6797, ccData: 0x142c, type: 0 },
    // EOC (end of caption), mark pop-on caption 2 start, flush nothing
    { pts: 6798, ccData: 0x142f, type: 0 },
    // RCL
    { pts: 6799, ccData: 0x1420, type: 0 },
    // EOC, mark pop-on caption 2 end and flush
    { pts: 6838, ccData: 0x142f, type: 0 },
    // RU2 (roll-up, 2 rows), wipes memories
    { pts: 6841, ccData: 0x1425, type: 0 },
    // CR (carriage return), flush nothing
    { pts: 6841, ccData: 0x142d, type: 0 },
    // PAC: row 2, indent 0
    { pts: 6841, ccData: 0x1170, type: 0 },
    // text: NO MORE SPECULATION, NO MORE
    { pts: 6841, ccData: 0x3e3e, type: 0 },
    { pts: 6841, ccData: 0x3e00, type: 0 },
    { pts: 6842, ccData: 0x204e, type: 0 },
    { pts: 6842, ccData: 0x4f00, type: 0 },
    { pts: 6842, ccData: 0x204d, type: 0 },
    { pts: 6842, ccData: 0x4f52, type: 0 },
    { pts: 6842, ccData: 0x4500, type: 0 },
    { pts: 6842, ccData: 0x2000, type: 0 },
    { pts: 6842, ccData: 0x5350, type: 0 },
    { pts: 6843, ccData: 0x4543, type: 0 },
    { pts: 6843, ccData: 0x554c, type: 0 },
    { pts: 6843, ccData: 0x4154, type: 0 },
    { pts: 6843, ccData: 0x494f, type: 0 },
    { pts: 6843, ccData: 0x4e2c, type: 0 },
    { pts: 6843, ccData: 0x204e, type: 0 },
    { pts: 6843, ccData: 0x4f00, type: 0 },
    { pts: 6843, ccData: 0x204d, type: 0 },
    { pts: 6844, ccData: 0x4f52, type: 0 },
    { pts: 6844, ccData: 0x4500, type: 0 },
    // RU2 (roll-up, two rows)
    { pts: 6844, ccData: 0x1425, type: 0 },
    // CR (carriage return), flush 1 roll-up row
    { pts: 6844, ccData: 0x142d, type: 0 },
    // PAC: row 2, indent 0
    { pts: 6844, ccData: 0x1170, type: 0 },
    // text: RUMORS OR GUESSING GAMES.
    { pts: 6844, ccData: 0x5255, type: 0 },
    { pts: 6844, ccData: 0x4d4f, type: 0 },
    { pts: 6844, ccData: 0x5253, type: 0 },
    { pts: 6844, ccData: 0x204f, type: 0 },
    { pts: 6845, ccData: 0x5200, type: 0 },
    { pts: 6845, ccData: 0x2047, type: 0 },
    { pts: 6845, ccData: 0x5545, type: 0 },
    { pts: 6845, ccData: 0x5353, type: 0 },
    { pts: 6845, ccData: 0x494e, type: 0 },
    { pts: 6845, ccData: 0x4700, type: 0 },
    { pts: 6845, ccData: 0x2047, type: 0 },
    { pts: 6845, ccData: 0x414d, type: 0 },
    { pts: 6845, ccData: 0x4553, type: 0 },
    { pts: 6845, ccData: 0x2e00, type: 0 },
    // RU2 (roll-up, 2 rows)
    { pts: 6846, ccData: 0x1425, type: 0 },
    // CR (carriage return), flush 2 roll-up rows
    { pts: 6846, ccData: 0x142d, type: 0 }
  ].forEach(cea608Stream.push, cea608Stream);

  QUnit.equal(captions.length, 7, 'detected 7 captions of varying types');
  QUnit.deepEqual(captions[0], {
    startPts: 6675,
    endPts: 6677,
    text: 'YEAR.',
    stream: 'CC1'
  }, 'parsed the 1st roll-up caption');
  QUnit.deepEqual(captions[1], {
    startPts: 6677,
    endPts: 6697,
    text: 'YEAR.\nGO TO CNNHEROS.COM.',
    stream: 'CC1'
  }, 'parsed the 2nd roll-up caption');
  QUnit.deepEqual(captions[2], {
    startPts: 6749,
    endPts: 6781,
    text: 'Did your Senator or Congressman\nget elected by talking tough',
    stream: 'CC1'
  }, 'parsed the paint-on caption');
  QUnit.deepEqual(captions[3], {
    startPts: 6782,
    endPts: 6797,
    text: 'on the national debt?',
    stream: 'CC1'
  }, 'parsed the 1st pop-on caption');
  QUnit.deepEqual(captions[4], {
    startPts: 6798,
    endPts: 6838,
    text: 'Will they stay true\nto their words?',
    stream: 'CC1'
  }, 'parsed the 2nd pop-on caption');
  QUnit.deepEqual(captions[5], {
    startPts: 6841,
    endPts: 6844,
    text: '>>> NO MORE SPECULATION, NO MORE',
    stream: 'CC1'
  }, 'parsed the 3rd roll-up caption');
  QUnit.deepEqual(captions[6], {
    startPts: 6844,
    endPts: 6846,
    text: '>>> NO MORE SPECULATION, NO MORE\nRUMORS OR GUESSING GAMES.',
    stream: 'CC1'
  }, 'parsed the 4th roll-up caption');

});
