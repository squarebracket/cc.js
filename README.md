# cc.js [![Build Status](https://travis-ci.org/videojs/mux.js.svg?branch=master)](https://travis-ci.org/videojs/mux.js) [![Greenkeeper badge](https://badges.greenkeeper.io/videojs/mux.js.svg)](https://greenkeeper.io/)

NALs with CEA608 captions go in. Cues come out.

Lead Maintainers:
- Jon-Carlos Rivera [@imbcmdth](https://github.com/imbcmdth)
- Joe Forbes [@forbesjo](https://github.com/forbesjo)
- Matthew Neil [@mjneil](https://github.com/mjneil)
- Oshin Karamian [@OshinKaramian](https://github.com/OshinKaramian)
- Garrett Singer [@gesinger](https://github.com/gesinger)
- Chuck Wilson [@squarebracket](https://github.com/squarebracket)

Maintenance Status: Beta

## Usage
`CaptionStream` is the main class here, and you'll want to use it pretty
much like a standard node.js stream, but with two optional arguments in
the constructor:

```javascript
// if not provided, timescale is 90000 and CueObject is a simple wrapper
var captionStream = new CaptionStream(timescale, CueObject);
```

Register to the `data` event to receive caption objects of type
`CueObject`, whose interface must conform to the `VTTCue` interface, but
can be any object.

Push NALs with CEA608 captions into the `CaptionStream` with
`CaptionStream.push`. When you think it's appropriate to flush,
call `CaptionStream.flush`.

When new streams are detected, a `newStream` event is dispatched with the
`stream` as the data of the event (e.g. `CC1`, `CC2`, etc).

## Building
If you're using this project in a node-like environment, just
require() whatever you need. If you'd like to package up a
distribution to include separately, run `npm run build`. See the
package.json for other handy scripts if you're thinking about
contributing.

## References
Captions come in two varieties, based on their relationship to the
video. Typically on the web, captions are delivered as a separate file
and associated with a video through the `<track>` element. This type
of captions are sometimes referred to as *out-of-band*. The
alternative method involves embedding the caption data directly into
the video content and is sometimes called *in-band captions*. In-band
captions exist in many videos today that were originally encoded for
broadcast and they are also a standard method used to provide captions
for live events.

In-band HLS captions follow the CEA-708 standard.

- [Rec. ITU-T H.264](https://www.itu.int/rec/T-REC-H.264): H.264 video data specification. CEA-708 captions
  are encapsulated in supplemental enhancement information (SEI)
  network abstraction layer (NAL) units within the video stream.
- [ANSI/SCTE
  128-1](https://www.scte.org/documents/pdf/Standards/ANSI_SCTE%20128-1%202013.pdf):
  the binary encapsulation of caption data within an SEI
  user_data_registered_itu_t_t35 payload.
- CEA-708-E: describes the framing and interpretation of caption data
  reassembled out of the picture user data blobs.
- CEA-608-E: specifies the hex to character mapping for extended language
  characters.


