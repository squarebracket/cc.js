'use strict';

var
  captionStream,
  CaptionStream = require('../lib/caption-stream'),
  QUnit = require('qunit'),
  characters = require('./utils/characters'),
  // sintelCaptions = require('./utils/sintel-captions'),
  // multiChannel608Captions = require('./utils/multi-channel-608-captions'),
  mixed608708Captions = require('./utils/mixed-608-708-captions');

// Create SEI nal-units from Caption packets
var makeSeiFromCaptionPacket = function(caption) {
  return {
    pts: caption.pts,
    dts: caption.dts,
    nalUnitType: 'sei_rbsp',
    escapedRBSP: new Uint8Array([
      0x04, // payload_type === user_data_registered_itu_t_t35

      0x0e, // payload_size

      181, // itu_t_t35_country_code
      0x00, 0x31, // itu_t_t35_provider_code
      0x47, 0x41, 0x39, 0x34, // user_identifier, "GA94"
      0x03, // user_data_type_code, 0x03 is cc_data

      // 110 00001
      0xc1, // process_cc_data, cc_count
      0xff, // reserved
      // 1111 1100
      (0xfc | caption.type), // cc_valid, cc_type (608, field 1)
      (caption.ccData & 0xff00) >> 8, // cc_data_1
      caption.ccData & 0xff, // cc_data_2 without parity bit set

      0xff // marker_bits
    ])
  };
};

// Create SEI nal-units from Caption packets
var makeSeiFromMultipleCaptionPackets = function(captionHash) {
  var pts = captionHash.pts,
    dts = captionHash.dts,
    captions = captionHash.captions;

  var data = [];
  captions.forEach(function(caption) {
    data.push(0xfc | caption.type);
    data.push((caption.ccData & 0xff00) >> 8);
    data.push(caption.ccData & 0xff);
  });

  return {
    pts: pts,
    dts: dts,
    nalUnitType: 'sei_rbsp',
    escapedRBSP: new Uint8Array([
      0x04, // payload_type === user_data_registered_itu_t_t35

      (0x0b + (captions.length * 3)), // payload_size

      181, // itu_t_t35_country_code
      0x00, 0x31, // itu_t_t35_provider_code
      0x47, 0x41, 0x39, 0x34, // user_identifier, "GA94"
      0x03, // user_data_type_code, 0x03 is cc_data

      // 110 00001
      (0x6 << 5) | captions.length, // process_cc_data, cc_count
      0xff // reserved
    ].concat(data).concat([0xff /* marker bits */])
    )
  };
};

QUnit.module('Caption Stream', {
  beforeEach: function() {
    captionStream = new CaptionStream(90000);
  }
});

QUnit.test('parses SEIs messages larger than 255 bytes', function() {
  var packets = [], data;
  captionStream.ccStreams_[0].push = function(packet) {
    packets.push(packet);
  };
  // set data channel 1 active for field 1
  captionStream.activeCea608Channel_[0] = 0;
  data = new Uint8Array(268);
  data[0] = 0x04; // payload_type === user_data_registered_itu_t_t35
  data[1] = 0xff; // payload_size
  data[2] = 0x0d; // payload_size
  data[3] = 181; // itu_t_t35_country_code
  data[4] = 0x00;
  data[5] = 0x31; // itu_t_t35_provider_code
  data[6] = 0x47;
  data[7] = 0x41;
  data[8] = 0x39;
  data[9] = 0x34; // user_identifier, "GA94"
  data[10] = 0x03; // user_data_type_code, 0x03 is cc_data
  data[11] = 0xc1; // process_cc_data, cc_count
  data[12] = 0xff; // reserved
  data[13] = 0xfc; // cc_valid, cc_type (608, field 1)
  data[14] = 0xff; // cc_data_1 with parity bit set
  data[15] = 0x0e; // cc_data_2 without parity bit set
  data[16] = 0xff; // marker_bits

  captionStream.push({
    nalUnitType: 'sei_rbsp',
    escapedRBSP: data
  });
  captionStream.flush();
  QUnit.equal(packets.length, 1, 'parsed a caption');
});

QUnit.test('parses SEIs containing multiple messages', function() {
  var packets = [], data;

  captionStream.ccStreams_[0].push = function(packet) {
    packets.push(packet);
  };
  // set data channel 1 active for field 1
  captionStream.activeCea608Channel_[0] = 0;

  data = new Uint8Array(22);
  data[0] = 0x01; // payload_type !== user_data_registered_itu_t_t35
  data[1] = 0x04; // payload_size
  data[6] = 0x04; // payload_type === user_data_registered_itu_t_t35
  data[7] = 0x0d; // payload_size
  data[8] = 181; // itu_t_t35_country_code
  data[9] = 0x00;
  data[10] = 0x31; // itu_t_t35_provider_code
  data[11] = 0x47;
  data[12] = 0x41;
  data[13] = 0x39;
  data[14] = 0x34; // user_identifier, "GA94"
  data[15] = 0x03; // user_data_type_code, 0x03 is cc_data
  data[16] = 0xc1; // process_cc_data, cc_count
  data[17] = 0xff; // reserved
  data[18] = 0xfc; // cc_valid, cc_type (608, field 1)
  data[19] = 0xff; // cc_data_1 with parity bit set
  data[20] = 0x0e; // cc_data_2 without parity bit set
  data[21] = 0xff; // marker_bits

  captionStream.push({
    nalUnitType: 'sei_rbsp',
    escapedRBSP: data
  });
  captionStream.flush();
  QUnit.equal(packets.length, 1, 'parsed a caption');
});

QUnit.test('ignores SEIs that do not have type user_data_registered_itu_t_t35', function() {
  var captions = [];
  captionStream.on('data', function(caption) {
    captions.push(caption.cue);
  });
  captionStream.push({
    nalUnitType: 'sei_rbsp',
    escapedRBSP: new Uint8Array([
      0x05 // payload_type !== user_data_registered_itu_t_t35
    ])
  });

  QUnit.equal(captions.length, 0, 'ignored the unknown payload type');
});

QUnit.test('parses a minimal example of caption data', function() {
  var packets = [];
  captionStream.ccStreams_[0].push = function(packet) {
    packets.push(packet);
  };
  // set data channel 1 active for field 1
  captionStream.activeCea608Channel_[0] = 0;
  captionStream.push({
    nalUnitType: 'sei_rbsp',
    escapedRBSP: new Uint8Array([
      0x04, // payload_type === user_data_registered_itu_t_t35

      0x0d, // payload_size

      181, // itu_t_t35_country_code
      0x00, 0x31, // itu_t_t35_provider_code
      0x47, 0x41, 0x39, 0x34, // user_identifier, "GA94"
      0x03, // user_data_type_code, 0x03 is cc_data

      // 110 00001
      0xc1, // process_cc_data, cc_count
      0xff, // reserved
      // 1111 1100
      0xfc, // cc_valid, cc_type (608, field 1)
      0xff, // cc_data_1 with parity bit set
      0x0e, // cc_data_2 without parity bit set

      0xff // marker_bits
    ])
  });
  captionStream.flush();
  QUnit.equal(packets.length, 1, 'parsed a caption packet');
});

QUnit.test('sorting is fun', function() {
  var packets, captions, seiNals;
  packets = [
    // Send another command so that the second EOC isn't ignored
    { pts: 10 * 1000, ccData: 0x1420, type: 0 },
    // RCL, resume caption loading
    { pts: 1000, ccData: 0x1420, type: 0 },
    // 'test string #1'
    { pts: 1000, ccData: characters('te'), type: 0 },
    { pts: 1000, ccData: characters('st'), type: 0 },
    { pts: 1000, ccData: characters(' s'), type: 0 },
    // 'test string #2'
    { pts: 10 * 1000, ccData: characters('te'), type: 0 },
    { pts: 10 * 1000, ccData: characters('st'), type: 0 },
    { pts: 10 * 1000, ccData: characters(' s'), type: 0 },
    // 'test string #1' continued
    { pts: 1000, ccData: characters('tr'), type: 0 },
    { pts: 1000, ccData: characters('in'), type: 0 },
    { pts: 1000, ccData: characters('g '), type: 0 },
    { pts: 1000, ccData: characters('#1'), type: 0 },
    // 'test string #2' continued
    { pts: 10 * 1000, ccData: characters('tr'), type: 0 },
    { pts: 10 * 1000, ccData: characters('in'), type: 0 },
    { pts: 10 * 1000, ccData: characters('g '), type: 0 },
    { pts: 10 * 1000, ccData: characters('#2'), type: 0 },
    // EOC, End of Caption. End display
    { pts: 10 * 1000, ccData: 0x142f, type: 0 },
    // EOC, End of Caption. Finished transmitting, begin display
    { pts: 1000, ccData: 0x142f, type: 0 },
    // Send another command so that the second EOC isn't ignored
    { pts: 20 * 1000, ccData: 0x1420, type: 0 },
    // EOC, End of Caption. End display
    { pts: 20 * 1000, ccData: 0x142f, type: 0 }
  ];
  captions = [];

  seiNals = packets.map(makeSeiFromCaptionPacket);

  captionStream.on('data', function(caption) {
     captions.push(caption.cue);
  });

  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 2, 'detected two captions');
  QUnit.equal(captions[0].text, 'test string #1', 'parsed caption 1');
  QUnit.equal(captions[1].text, 'test string #2', 'parsed caption 2');
});

QUnit.test('drops duplicate segments', function() {
  var packets, captions, seiNals;
  packets = [
    {
      pts: 1000, dts: 1000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL (resume caption loading)
        {ccData: 0x1420, type: 0 }, // RCL, duplicate as per spec
        {ccData: characters('te'), type: 0 },
        {ccData: characters('st'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters(' s'), type: 0 },
        {ccData: characters('tr'), type: 0 },
        {ccData: characters('in'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('g '), type: 0 },
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters(' s'), type: 0 },
        {ccData: characters('tr'), type: 0 },
        {ccData: characters('in'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('g '), type: 0 },
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    },
    {
      pts: 4000, dts: 4000, captions: [
        {ccData: 0x142f, type: 0 }, // EOC (end of caption), mark display start
        {ccData: 0x142f, type: 0 }, // EOC, duplicate as per spec
        {ccData: 0x142f, type: 0 }, // EOC, mark display end and flush
        {ccData: 0x142f, type: 0 } // EOC, duplicate as per spec
      ]
    }
  ];
  captions = [];

  seiNals = packets.map(makeSeiFromMultipleCaptionPackets);

  captionStream.on('data', function(caption) {
     captions.push(caption.cue);
  });

  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 1, 'detected one caption');
  QUnit.equal(captions[0].text, 'test string data', 'parsed caption properly');
});

QUnit.test('drops duplicate segments with multi-segment DTS values', function() {
  var packets, captions, seiNals;
  packets = [
    {
      pts: 1000, dts: 1000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL (resume caption loading)
        {ccData: 0x1420, type: 0 }, // RCL, duplicate as per spec
        {ccData: characters('te'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters('st'), type: 0 },
        {ccData: characters(' s'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters('tr'), type: 0 },
        {ccData: characters('in'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('g '), type: 0 },
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters(' s'), type: 0 },
        {ccData: characters('tr'), type: 0 },
        {ccData: characters('in'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('g '), type: 0 },
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters(' s'), type: 0 },
        {ccData: characters('tu'), type: 0 },
        {ccData: characters('ff'), type: 0 }
      ]
    },
    {
      pts: 4000, dts: 4000, captions: [
        {ccData: 0x142f, type: 0 }, // EOC (end of caption)
        // EOC not duplicated for robustness testing
        {ccData: 0x1420, type: 0 } // RCL (resume caption loading)
      ]
    },
    {
      pts: 5000, dts: 5000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL, duplicated as per spec
        {ccData: characters(' a'), type: 0 },
        {ccData: characters('nd'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters(' e'), type: 0 },
        {ccData: characters('ve'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('n '), type: 0 },
        {ccData: characters('mo'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('re'), type: 0 },
        {ccData: characters(' t'), type: 0 }
      ]
    },
    {
      pts: 5000, dts: 5000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL, duplicated as per spec
        {ccData: characters(' a'), type: 0 },
        {ccData: characters('nd'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters(' e'), type: 0 },
        {ccData: characters('ve'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('n '), type: 0 },
        {ccData: characters('mo'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('re'), type: 0 },
        {ccData: characters(' t'), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('ex'), type: 0 },
        {ccData: characters('t '), type: 0 }
      ]
    },
    {
      pts: 6000, dts: 6000, captions: [
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    },
    {
      pts: 7000, dts: 7000, captions: [
        {ccData: characters(' h'), type: 0 },
        {ccData: characters('er'), type: 0 }
      ]
    },
    {
      pts: 8000, dts: 8000, captions: [
        {ccData: characters('e!'), type: 0 },
        {ccData: 0x142f, type: 0 }, // EOC (end of caption), mark display start
        {ccData: 0x142f, type: 0 }, // EOC, duplicated as per spec
        {ccData: 0x142f, type: 0 } // EOC, mark display end and flush
        // EOC not duplicated for robustness testing
      ]
    }
  ];
  captions = [];

  seiNals = packets.map(makeSeiFromMultipleCaptionPackets);

  captionStream.on('data', function(caption) {
     captions.push(caption.cue);
  });

  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 2, 'detected two captions');
  QUnit.equal(captions[0].text, 'test string data stuff', 'parsed caption properly');
  QUnit.equal(captions[1].text, 'and even more text data here!', 'parsed caption properly');
});

QUnit.test("doesn't ignore older segments if reset", function() {
  var firstPackets, secondPackets, captions, seiNals1, seiNals2;
  firstPackets = [
    {
      pts: 11000, dts: 11000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL (resume caption loading)
        {ccData: 0x1420, type: 0 }, // RCL, duplicated as per spec
        {ccData: characters('te'), type: 0 }
      ]
    },
    {
      pts: 12000, dts: 12000, captions: [
        {ccData: characters('st'), type: 0 },
        {ccData: characters(' s'), type: 0 }
      ]
    },
    {
      pts: 12000, dts: 12000, captions: [
        {ccData: characters('tr'), type: 0 },
        {ccData: characters('in'), type: 0 }
      ]
    },
    {
      pts: 13000, dts: 13000, captions: [
        {ccData: characters('g '), type: 0 },
        {ccData: characters('da'), type: 0 },
        {ccData: characters('ta'), type: 0 }
      ]
    }
  ];
  secondPackets = [
    {
      pts: 1000, dts: 1000, captions: [
        {ccData: 0x1420, type: 0 }, // RCL (resume caption loading)
        {ccData: 0x1420, type: 0 }, // RCL, duplicated as per spec
        {ccData: characters('af'), type: 0 }
      ]
    },
    {
      pts: 2000, dts: 2000, captions: [
        {ccData: characters('te'), type: 0 },
        {ccData: characters('r '), type: 0 },
        {ccData: characters('re'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('se'), type: 0 },
        {ccData: characters('t '), type: 0 },
        {ccData: characters('da'), type: 0 }
      ]
    },
    {
      pts: 3000, dts: 3000, captions: [
        {ccData: characters('ta'), type: 0 },
        {ccData: characters('!!'), type: 0 }
      ]
    },
    {
      pts: 4000, dts: 4000, captions: [
        {ccData: 0x142f, type: 0 }, // EOC (end of caption), mark display start
        {ccData: 0x142f, type: 0 }, // EOC, duplicated as per spec
        {ccData: 0x142f, type: 0 } // EOC, mark display end and flush
        // EOC not duplicated for robustness testing
      ]
    }
  ];
  captions = [];

  seiNals1 = firstPackets.map(makeSeiFromMultipleCaptionPackets);
  seiNals2 = secondPackets.map(makeSeiFromMultipleCaptionPackets);

  captionStream.on('data', function(caption) {
     captions.push(caption.cue);
  });

  seiNals1.forEach(captionStream.push, captionStream);
  captionStream.flush();
  QUnit.equal(captionStream.latestDts_, 13000, 'DTS is tracked correctly');

  captionStream.reset();
  QUnit.equal(captionStream.latestDts_, null, 'DTS tracking was reset');

  seiNals2.forEach(captionStream.push, captionStream);
  captionStream.flush();
  QUnit.equal(captionStream.latestDts_, 4000, 'DTS is tracked correctly');

  QUnit.equal(captions.length, 1, 'detected one caption');
  QUnit.equal(captions[0].text, 'after reset data!!', 'parsed caption properly');
});

QUnit.test('extracts all theoretical caption channels', function() {
  var captions = [];
  captionStream.on('data', function(caption) {
    captions.push(caption);
  });

  // RU2 = roll-up, 2 rows
  // CR = carriage return
  var packets = [
    { pts: 1000, type: 0, ccData: 0x1425 }, // RU2 (sets CC1)
    { pts: 2000, type: 0, ccData: characters('1a') }, // CC1
    { pts: 3000, type: 0, ccData: 0x1c25 }, // RU2 (sets CC2)
    { pts: 4000, type: 1, ccData: 0x1525 }, // RU2 (sets CC3)
    { pts: 5000, type: 1, ccData: characters('3a') }, // CC3
    // this next one tests if active channel is tracked per-field
    // instead of globally
    { pts: 6000, type: 0, ccData: characters('2a') }, // CC2
    { pts: 7000, type: 1, ccData: 0x1d25 }, // RU2 (sets CC4)
    { pts: 8000, type: 1, ccData: characters('4a') }, // CC4
    { pts: 9000, type: 1, ccData: characters('4b') }, // CC4
    { pts: 10000, type: 0, ccData: 0x142d }, // CR (sets + flushes CC1)
    { pts: 11000, type: 0, ccData: 0x1c2d }, // CR (sets + flushes CC2)
    { pts: 12000, type: 0, ccData: 0x1425 }, // RU2 (sets CC1)
    { pts: 13000, type: 0, ccData: characters('1b') }, // CC1
    { pts: 14000, type: 0, ccData: characters('1c') }, // CC1
    { pts: 15000, type: 0, ccData: 0x142d }, // CR (sets + flushes CC1)
    { pts: 16000, type: 1, ccData: 0x152d }, // CR (sets + flushes CC3)
    { pts: 17000, type: 1, ccData: 0x1d2d }, // CR (sets + flushes CC4)
    { pts: 18000, type: 0, ccData: 0x1c25 }, // RU2 (sets CC2)
    { pts: 19000, type: 0, ccData: characters('2b') }, // CC2
    { pts: 20000, type: 0, ccData: 0x1c2d } // CR (sets + flushes CC2)
  ];

  var seiNals = packets.map(makeSeiFromCaptionPacket);
  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 6, 'got all captions');
  QUnit.equal(captions[0].cue.text, '1a', 'cc1 first row');
  QUnit.equal(captions[0].stream, 'CC1', 'is CC1');
  QUnit.equal(captions[1].cue.text, '2a', 'cc2 first row');
  QUnit.equal(captions[1].stream, 'CC2', 'is CC2');
  QUnit.equal(captions[2].cue.text, '1a\n1b1c', 'cc1 first and second row');
  QUnit.equal(captions[2].stream, 'CC1', 'is CC1');
  QUnit.equal(captions[3].cue.text, '3a', 'cc3 first row');
  QUnit.equal(captions[3].stream, 'CC3', 'is CC3');
  QUnit.equal(captions[4].cue.text, '4a4b', 'cc4 first row');
  QUnit.equal(captions[4].stream, 'CC4', 'is CC4');
  QUnit.equal(captions[5].cue.text, '2a\n2b', 'cc2 first and second row');
  QUnit.equal(captions[5].stream, 'CC2', 'is CC2');

});

QUnit.test('drops data until first command that sets activeChannel for a field', function() {
  var captions = [];
  captionStream.on('data', function(caption) {
    captions.push(caption);
  });

  var packets = [
    // test that packets in same field and same data channel are dropped
    // before a control code that sets the data channel
    { pts: 0 * 1000, ccData: characters('no'), type: 0 },
    { pts: 0 * 1000, ccData: characters('t '), type: 0 },
    { pts: 0 * 1000, ccData: characters('th'), type: 0 },
    { pts: 0 * 1000, ccData: characters('is'), type: 0 },
    // EOC (end of caption), sets CC1
    { pts: 1 * 1000, ccData: 0x142f, type: 0 },
    // RCL (resume caption loading)
    { pts: 1 * 1000, ccData: 0x1420, type: 0 },
    // EOC, if data wasn't dropped this would dispatch a caption
    { pts: 2 * 1000, ccData: 0x142f, type: 0 },
    // RCL
    { pts: 3 * 1000, ccData: 0x1420, type: 0 },
    { pts: 4 * 1000, ccData: characters('fi'), type: 0 },
    { pts: 4 * 1000, ccData: characters('el'), type: 0 },
    { pts: 4 * 1000, ccData: characters('d0'), type: 0 },
    // EOC, mark display start
    { pts: 5 * 1000, ccData: 0x142f, type: 0 },
    // EOC, duplicated as per spec
    { pts: 5 * 1000, ccData: 0x142f, type: 0 },
    // EOC, mark display end and flush
    { pts: 6 * 1000, ccData: 0x142f, type: 0 },
    // EOC not duplicated cuz not necessary
    // now switch to field 1 and test that packets in the same field
    // but DIFFERENT data channel are dropped
    { pts: 7 * 1000, ccData: characters('or'), type: 1 },
    { pts: 7 * 1000, ccData: characters(' t'), type: 1 },
    { pts: 7 * 1000, ccData: characters('hi'), type: 1 },
    { pts: 7 * 1000, ccData: characters('s.'), type: 1 },
    // EOC (end of caption, sets CC4)
    { pts: 8 * 1000, ccData: 0x1d2f, type: 1 },
    // RCL (resume caption loading)
    { pts: 8 * 1000, ccData: 0x1d20, type: 1 },
    // EOC, if data wasn't dropped this would dispatch a caption
    { pts: 9 * 1000, ccData: 0x1d2f, type: 1 },
    // RCL
    { pts: 10 * 1000, ccData: 0x1d20, type: 1 },
    { pts: 11 * 1000, ccData: characters('fi'), type: 1 },
    { pts: 11 * 1000, ccData: characters('el'), type: 1 },
    { pts: 11 * 1000, ccData: characters('d1'), type: 1 },
    // EOC, mark display start
    { pts: 12 * 1000, ccData: 0x1d2f, type: 1 },
    // EOC, duplicated as per spec
    { pts: 12 * 1000, ccData: 0x1d2f, type: 1 },
    // EOC, mark display end and flush
    { pts: 13 * 1000, ccData: 0x1d2f, type: 1 }
    // EOC not duplicated cuz not necessary
  ];

  var seiNals = packets.map(makeSeiFromCaptionPacket);
  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 2, 'received 2 captions');
  QUnit.equal(captions[0].cue.text, 'field0', 'received only confirmed field0 data');
  QUnit.equal(captions[0].stream, 'CC1', 'caption went to right channel');
  QUnit.equal(captions[1].cue.text, 'field1', 'received only confirmed field1 data');
  QUnit.equal(captions[1].stream, 'CC4', 'caption went to right channel');
});

QUnit.test('clears buffer and drops data until first command that sets activeChannel after reset', function() {
  var firstPackets, secondPackets, captions, seiNals1, seiNals2;
  captions = [];

  firstPackets = [
    // RCL (resume caption loading), CC1
    { pts: 1 * 1000, ccData: 0x1420, type: 0 },
    { pts: 2 * 1000, ccData: characters('fi'), type: 0 },
    { pts: 2 * 1000, ccData: characters('el'), type: 0 },
    { pts: 2 * 1000, ccData: characters('d0'), type: 0 },
    // EOC (end of caption), swap text to displayed memory
    { pts: 3 * 1000, ccData: 0x142f, type: 0 },
    { pts: 4 * 1000, ccData: characters('fi'), type: 0 },
    { pts: 4 * 1000, ccData: characters('el'), type: 0 },
    { pts: 4 * 1000, ccData: characters('d0'), type: 0 },
    // RCL (resume caption loading), CC4
    { pts: 5 * 1000, ccData: 0x1d20, type: 1 },
    { pts: 6 * 1000, ccData: characters('fi'), type: 1 },
    { pts: 6 * 1000, ccData: characters('el'), type: 1 },
    { pts: 6 * 1000, ccData: characters('d1'), type: 1 },
    // EOC (end of caption), swap text to displayed memory
    { pts: 7 * 1000, ccData: 0x1d2f, type: 1 },
    { pts: 8 * 1000, ccData: characters('fi'), type: 1 },
    { pts: 8 * 1000, ccData: characters('el'), type: 1 },
    { pts: 8 * 1000, ccData: characters('d1'), type: 1 }
  ];
  secondPackets = [
    // following packets are dropped
    { pts: 9 * 1000, ccData: characters('no'), type: 0 },
    { pts: 9 * 1000, ccData: characters('t '), type: 0 },
    { pts: 9 * 1000, ccData: characters('th'), type: 0 },
    { pts: 9 * 1000, ccData: characters('is'), type: 0 },
    { pts: 10 * 1000, ccData: characters('or'), type: 1 },
    { pts: 10 * 1000, ccData: characters(' t'), type: 1 },
    { pts: 10 * 1000, ccData: characters('hi'), type: 1 },
    { pts: 10 * 1000, ccData: characters('s.'), type: 1 },
    // EOC (end of caption), sets CC1
    { pts: 11 * 1000, ccData: 0x142f, type: 0 },
    // RCL (resume caption loading), CC1
    { pts: 11 * 1000, ccData: 0x1420, type: 0 },
    // EOC, sets CC4
    { pts: 12 * 1000, ccData: 0x1d2f, type: 1 },
    // RCL, CC4
    { pts: 12 * 1000, ccData: 0x1d20, type: 1 },
    // EOC, CC1, would dispatch caption if packets weren't ignored
    { pts: 13 * 1000, ccData: 0x142f, type: 0 },
    // RCL, CC1
    { pts: 13 * 1000, ccData: 0x1420, type: 0 },
    // EOC, CC4, would dispatch caption if packets weren't ignored
    { pts: 14 * 1000, ccData: 0x1d2f, type: 1 },
    // RCL, CC4
    { pts: 14 * 1000, ccData: 0x1d20, type: 1 },
    { pts: 18 * 1000, ccData: characters('bu'), type: 0 },
    { pts: 18 * 1000, ccData: characters('t '), type: 0 },
    { pts: 18 * 1000, ccData: characters('th'), type: 0 },
    { pts: 18 * 1000, ccData: characters('is'), type: 0 },
    { pts: 19 * 1000, ccData: characters('an'), type: 1 },
    { pts: 19 * 1000, ccData: characters('d '), type: 1 },
    { pts: 19 * 1000, ccData: characters('th'), type: 1 },
    { pts: 19 * 1000, ccData: characters('is'), type: 1 },
    // EOC (end of caption), CC1, mark caption 1 start
    { pts: 20 * 1000, ccData: 0x142f, type: 0 },
    // EOC, CC1, duplicated as per spec
    { pts: 20 * 1000, ccData: 0x142f, type: 0 },
    // EOC, CC1, mark caption 1 end and dispatch
    { pts: 21 * 1000, ccData: 0x142f, type: 0 },
    // No duplicate EOC cuz not necessary
    // EOC, CC4, mark caption 2 start
    { pts: 22 * 1000, ccData: 0x1d2f, type: 1 },
    // EOC, CC4, duplicated as per spec
    { pts: 22 * 1000, ccData: 0x1d2f, type: 1 },
    // EOC, CC4, mark caption 2 end and dispatch
    { pts: 23 * 1000, ccData: 0x1d2f, type: 1 }
    // No duplicate EOC cuz not necessary
  ];

  seiNals1 = firstPackets.map(makeSeiFromCaptionPacket);
  seiNals2 = secondPackets.map(makeSeiFromCaptionPacket);

  captionStream.on('data', function(caption) {
    captions.push(caption);
  });

  seiNals1.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captionStream.ccStreams_[0].nonDisplayed_[14], 'field0',
    'there is data in non-displayed memory for field 0 before reset');
  QUnit.equal(captionStream.ccStreams_[3].nonDisplayed_[14], 'field1',
    'there is data in non-displayed memory for field 1 before reset');
  QUnit.equal(captionStream.ccStreams_[0].displayed_[14], 'field0',
    'there is data in displayed memory for field 0 before reset');
  QUnit.equal(captionStream.ccStreams_[3].displayed_[14], 'field1',
    'there is data in displayed memory for field 1 before reset');

  captionStream.reset();

  QUnit.equal(captionStream.ccStreams_[0].nonDisplayed_[14], '',
    'there is no data in non-displayed memory for field 0 after reset');
  QUnit.equal(captionStream.ccStreams_[3].nonDisplayed_[14], '',
    'there is no data in non-displayed memory for field 1 after reset');
  QUnit.equal(captionStream.ccStreams_[0].displayed_[14], '',
    'there is no data in displayed memory for field 0 after reset');
  QUnit.equal(captionStream.ccStreams_[3].displayed_[14], '',
    'there is no data in displayed memory for field 1 after reset');

  seiNals2.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 2, 'detected two captions');
  QUnit.equal(captions[0].cue.text, 'but this', 'parsed caption properly');
  QUnit.equal(captions[0].stream, 'CC1', 'caption went to right channel');
  QUnit.equal(captions[1].cue.text, 'and this', 'parsed caption properly');
  QUnit.equal(captions[1].stream, 'CC4', 'caption went to right channel');
});

QUnit.test('ignores CEA708 captions', function() {
  var captions = [];
  captionStream.on('data', function(caption) {
    captions.push(caption.cue);
  });

  var seiNals = mixed608708Captions.map(makeSeiFromCaptionPacket);
  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 3, 'parsed three captions');
  QUnit.equal(captions[0].text, 'BUT IT\'S NOT SUFFERING\nRIGHW.', 'parsed first caption correctly');
  // there is also bad data in the captions, but the null ascii character is removed
  QUnit.equal(captions[1].text, 'IT\'S NOT A THREAT TO ANYBODY.', 'parsed second caption correctly');
  QUnit.equal(captions[2].text, 'WE TRY NOT TO PUT AN ANIMAL DOWN\nIF WE DON\'T HAVE TO.', 'parsed third caption correctly');
});

// Full character translation tests are below for Cea608Stream, they just only
// test support for CC1
QUnit.test('special and extended character codes work regardless of field and data channel', function() {
  var packets, seiNals, captions = [];
  packets = [
    // RU2 (roll-up, 2 rows), CC2
    { ccData: 0x1c25, type: 0 },
    // ®
    { ccData: 0x1930, type: 0 },
    // CR (carriage return), CC2, flush caption
    { ccData: 0x1c2d, type: 0 },
    // RU2, CC3
    { ccData: 0x1525, type: 1 },
    // "
    { ccData: 0x2200, type: 1 },
    // «
    { ccData: 0x123e, type: 1 },
    // CR, CC3, flush caption
    { ccData: 0x152d, type: 1 },
    // RU2, CC4
    { ccData: 0x1d25, type: 1 },
    // "
    { ccData: 0x2200, type: 1 },
    // »
    { ccData: 0x1a3f, type: 1 },
    // CR, CC4, flush caption
    { ccData: 0x1d2d, type: 1 }
  ];

  captionStream.on('data', function(caption) {
    captions.push(caption.cue);
  });

  seiNals = packets.map(makeSeiFromCaptionPacket);
  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.deepEqual(captions[0].text, String.fromCharCode(0xae), 'CC2 special character correct');
  QUnit.deepEqual(captions[1].text, String.fromCharCode(0xab), 'CC3 extended character correct');
  QUnit.deepEqual(captions[2].text, String.fromCharCode(0xbb), 'CC4 extended character correct');
});

QUnit.test('newStream events are dispatched on the first packet of a new stream', function() {
  var streams = [];

  captionStream.on('newStream', function(stream) {
    streams.push(stream);
  });

  // RU2 = roll-up, 2 rows
  // CR = carriage return
  var packets = [
    { pts: 1000, type: 0, ccData: 0x1425 }, // RU2 (sets CC1)
    { pts: 2000, type: 0, ccData: characters('1a') }, // CC1
    { pts: 3000, type: 0, ccData: 0x142d }, // CR, CC1
    { pts: 4000, type: 1, ccData: 0x1525 }, // RU2 (sets CC3)
    { pts: 5000, type: 1, ccData: characters('3a') }, // CC3
    { pts: 6000, type: 1, ccData: 0x152d }, // CR, CC3
    { pts: 7000, type: 0, ccData: characters('1a') }, // CC1
    { pts: 8000, type: 0, ccData: 0x142d }, // CR, CC1
    { pts: 9000, type: 1, ccData: characters('3a') }, // CC3
    { pts: 10000, type: 1, ccData: 0x152d } // CR, CC3
  ];

  var seiNals1 = packets.slice(0, 3).map(makeSeiFromCaptionPacket);
  var seiNals2 = packets.slice(3, 6).map(makeSeiFromCaptionPacket);
  var seiNals3 = packets.slice(6).map(makeSeiFromCaptionPacket);

  QUnit.equal(streams.length, 0, 'no streams have been seen');

  seiNals1.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(streams.length, 1, 'event dispatched for first CC1 packet');
  QUnit.equal(streams[0], 'CC1', 'first event is for stream CC1');

  seiNals2.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(streams.length, 2, 'event dispatched for first CC3 packet');
  QUnit.equal(streams[1], 'CC3', 'second event is for stream CC3');

  seiNals3.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(streams.length, 2, 'no more events have been dispatched');

});

QUnit.test('uses timescale to calculate start/end times', function() {
  var captions = [];

  captionStream = new CaptionStream(1000);
  captionStream.on('data', function(caption) {
    captions.push(caption.cue);
  });

  var packets = [
    { pts: 1000, type: 0, ccData: 0x1425 }, // RU2 (roll-up 2 rows)
    { pts: 2000, type: 0, ccData: characters('hi') },
    { pts: 3000, type: 0, ccData: 0x142d } // CR (carriage return)
  ];

  var seiNals = packets.map(makeSeiFromCaptionPacket);

  seiNals.forEach(captionStream.push, captionStream);
  captionStream.flush();

  QUnit.equal(captions.length, 1, 'received caption');
  QUnit.equal(captions[0].startTime, 0,
    'used timescale to calculate caption start time');
  QUnit.equal(captions[0].endTime, 3,
    'used timescale to calculate caption end time');
});

QUnit.test('uses a timescale of 90000 by default', function() {
  captionStream = new CaptionStream();
  QUnit.equal(captionStream.timescale_, 90000);
});

