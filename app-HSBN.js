'use strict';
var hfc = require('/usr/local/lib/node_modules/hfc')
var DownloadCopyCert = require('./auction-NS-HSBN.js').DownloadCopyCert;

try {
  DownloadCopyCert(function(err){
    if (err) {
      console.log("Error in DownloadCopyCert %s", err)
    }else {
      //console.log("Downloaded Cert, SetupNetwork,Enrolled Users and called chaincode API")
    }
  })

} catch (e) {
    console.log(e);
}
