/* eslint-disable semi */
'use strict';
module.exports = {
  // eslint-disable-next-line no-unused-expressions
  getOtp: () => {
    var val = Math.floor(1000 + Math.random() * 9000);
    return val;
  },
  convertToMinutes: (time) => {
    var hms = time;   // your input string
    var a = hms.split(':'); // split it at the colons
    // Hours are worth 60 minutes.
    if (!a) {
      return '';
    } else {
      var minutes = (+a[0]) * 60 + (+a[1]);
    }
    console.log(minutes);
    return minutes;
  },
};
