'use strict';
var hfc = require('/usr/local/lib/node_modules/hfc')
var util = require('util');
var async = require('/usr/local/lib/node_modules/async')
var sleep = require('/usr/local/lib/node_modules/sleep');
//var myJson = require("./auction-Users-CC-BMStarter.json");
var myJson = require("./auction-Users-CC-HSBN.json");

var chain, chaincodeID;
var NS = require('./auction-NS-HSBN.js');
var chain = NS.chain;

chain.setDeployWaitTime(120)
chain.setInvokeWaitTime(60)
var testChaincodeID;

var userName;
exports.ACC = function AuctionChainCalls(user, isHSBN) {
  userName = user

  console.log("Calling DEPLOY  >>>")
  deploy(user, isHSBN, function(err) {
      if (err) {
          console.log("deploy error: %j", err.toString());
        }
    })
}

function deploy(name, isHSBN, cb) {

    console.log("deploying isHSBN True ? False", isHSBN);
    var req = {
      // Function to trigger
      fcn: "init",
      // Arguments to the initializing function
      args: ["INITIALIZE"],
      //certificatePath: "/var/hyperledger/production/.membersrvc/tlsca.cert"
      // for HSBN Network
      //certificatePath: "/root/"

      //BM Starter Network
      //certificatePath: "/certs/blockchain-cert.pem"
      certificatePath: isHSBN ? "/root/" : "/certs/blockchain-cert.pem"
    };

    if (!chain.isDevMode()) {
       console.log("Not in dev mode >>>>>>>>>>>>>")

       if (myJson.hasOwnProperty('Chaincode_Path')){
         req.chaincodePath = myJson['Chaincode_Path'];
         //req.chaincodePath = "github.com/auction/art/artchaincode";
       }else{
         console.log("chaincode path not found in auction-Users-CC.json")
         process.exit(1);
       }

       if (myJson.hasOwnProperty('Certificate_Path')){
         req.certifictaePath = myJson['Certificate_Path'];
         //req.chaincodePath = "github.com/auction/art/artchaincode";
       }else{
         console.log("chaincode path not found in auction-Users-CC.json")
         process.exit(1);
       }

    } else {
        console.log("Inside dev mode >>>>>>>>>>>>>>>")
        req.chaincodeName = chaincodeName;
    }

    console.log("deploy request: %j", req);
    var tx = name.deploy(req);

    tx.on('submitted', function (results) {
        console.log("deploy submitted: %j", results);
    });
    tx.on('complete', function (results) {
        console.log("deploy complete: %j", results);
        testChaincodeID = results.chaincodeID;
        console.log("Deploy Completed, Calling Invoke")
        asyncTest();
    });
    tx.on('error', function (err) {
      console.log("deploy error: %j", err.toString());
      return cb(err);
    });
  }


  function invoke(name, functionName, fArgs, callback ) {
          var invokeRequest = {
              // Name (hash) required for invoke
              chaincodeID: testChaincodeID,
              // Function to trigger
              //fcn: "PostUser",
              fcn: functionName,
              // Parameters for the invoke function
              //args: ["100", "USER", "Ashley Hart", "PR",  "One Copley Parkway, #216, Morrisville, NC 27560", "9198063535", "admin@itpeople.com", "SUNTRUST", "00017102345", "0234678"]
              args: fArgs
          };

          //console.log("Invoke request: %j %s", invokeRequest, name)

          var tx = name.invoke(invokeRequest);
          tx.on('submitted', function (results) {
            // Invoke transaction submitted successfully
            console.log("Successfully submitted chaincode invoke transaction");
          });
          tx.on('complete', function (results) {
            console.log("invoke completed ");
            console.log("Invoke request: %j", invokeRequest)
            callback()
         });
         tx.on('error', function (err) {
            console.log("user invoke", err);
            //process.exit(1);
            return callback(err)
          });
  }


  function query(name, functionName, fArgs, cb) {
      var queryRequest = {
        // Name (hash) required for query
        chaincodeID: testChaincodeID,
        // Function to trigger
        //fcn: "GetUser",
        fcn: functionName,
        // Existing state variable to retrieve
        //args: ["100"]
        args: fArgs
      };

      //console.log(" Query: %s, %s, %s",  testChaincodeID, functionName, fArgs)
      var tx = name.query(queryRequest);
      console.log(" Query: %s, %s, %s",  testChaincodeID, functionName, fArgs)
      tx.on('submitted', function (results) {
    // Invoke transaction submitted successfully
      console.log("Successfully submitted chaincode query transaction");
    });

    tx.on('complete', function (results) {
      //console.log(util.format('Results: %j', results));
      console.log("Successfully queried  chaincode function: request=%j, value=%s", queryRequest, results.result.toString());
      cb()
    });

    tx.on('error', function (err) {
      console.log("Alice query", err);
      // Exit the test script after a failure
      //process.exit(1);
      return cb(err)
    });
  }

function constructAndInvokeUsers(callback) {
    var name = userName;
    //console.log("FROM INVOKE NAME>>>>>>>>>>>>>%s %s", name, userName)

    var size = 10;
    var list = [];
    for ( var i=1; i <= size; i++) {
      list.push(i);
    }
    async.forEachOf(list, function(val, key, cb) {
        console.log("Posting user: ", val)
        var iUser100 = [ val.toString(), "USER", "Ashley Hart", "PR",  "One Copley Parkway, #216, Morrisville, NC 27560", "9198063535", "admin@itpeople.com", "SUNTRUST", "00017102345", "0234678"]
        var currUser = iUser100.slice(0)
        invoke(name, "PostUser", currUser, function(err){
          if (err) {
            return cb(err, null)
          }else {
            cb(null, val.toString())
          }
        })
    },
    function(err) {
      callback(err, null);
    });
  }

  function constructAndQueryUsers(callback) {

  console.log("Inside Querying user: ")
  var name = userName;
  var size = 10;
  var list = [];
  for ( var i=1; i <= size; i++) {
    list.push(i);
  }
  async.forEachOf(list, function(val, key, cb) {
      console.log("Querying user: ", val)
      query(name, "GetUser", val.toString(), function(err){
        if (err) {
          return cb(err, null)
        }else {
          cb(null, val.toString())
        }
      })
  },
  function(err) {
    console.log("Inside callback error from Query Users")
    if (err) {
      callback(err, null);
    }else {
      callback(null, null)
    }
  });
  }

  function callPostItemAuctionBids(callback) {

  var name = userName
  console.log("Inside PostItemAuctonBids")
  var iItem1000 =	["1000", "ARTINV", "Shadows by Asppen", "Asppen Messer", "10102015", "Original", "Nude", "Canvas", "15 x 15 in", "image.jpg","$600", "1"]

  invoke(name, "PostItem", iItem1000, function(err) {
      if (err) {
          console.log("Invoke: PostItem error: %j", err.toString());
          return callback(err, null)
      }

      console.log("AFTER POST ITEM >>>>>>")
      query(name, "GetItem", ["1000"], function(err) {
        if (err) {
            console.log("Query: GetItem error: %j", err.toString());
            return callback(err, null)
        }

        console.log ("Found Item 1000 successfully")
        var iAucReq =	["1111", "AUCREQ", "1000", "2", "1", "04012016", "1200", "1800", "INIT", "2016-05-20 11:00:00.3 +0000 UTC","2016-05-23 11:00:00.3 +0000 UTC"]

        invoke(name, "PostAuctionRequest", iAucReq, function(err) {
          if (err) {
            console.log("Invoke: PostAuctionRequest error: %j", err.toString());
            return callback(err, null)
          }
          console.log("Posted AuctionRequest")
          var iOpenAuc = ["1111", "OPENAUC", "3"]
          invoke(name, "OpenAuctionForBids", iOpenAuc, function(err) {
            if (err) {
              console.log("Invoke: OpenAuctionForBids error: %j", err.toString());
              return callback(err, null)
            }

            console.log("Opened Auction for Bids successfully:")

            var iBid1 = ["1111", "BID", "1", "1000", "3", "1200"]
            var iBid2 = ["1111", "BID", "2", "1000", "4", "3000"]
            var iBid3 = ["1111", "BID", "3", "1000", "4", "6000"]
            var iBid4 = ["1111", "BID", "4", "1000", "5", "7000"]
            var iBid5 = ["1111", "BID", "5", "1000", "4", "8000"]

            invoke(name, "PostBid", iBid1, function(){})
            invoke(name, "PostBid", iBid2, function(){})
            invoke(name, "PostBid", iBid3, function(){})
            invoke(name, "PostBid", iBid4, function(){})
            invoke(name, "PostBid", iBid5, function(err) {
              if (err) {
                console.log("Invoke: PostBid error: %j", err.toString());
                return callback(err, null)
              }
              query(name, "GetListOfBids", ["1111"], function(err) {
                if (err) {
                  console.log("Query: GetListOfBids error: %j", err.toString());
                  return callback(err, null)
                }
                console.log ("Found Bid 1111 successfully")
              query(name,  "IsItemOnAuction", ["1000", "VERIFY"], function (err) {
              if (err) {
                console.log("Query: IsItemOnAuction error: %j", err.toString());
                return callback(err, null)
              }
              console.log ("Found Item on Auction successfully")
              callback(null, "1000")
            })
          })
        })
      })
    })
  })
  })
  //callback()
  }

  function asyncTest(){

  async.series([
  //async.parallelLimit([
    function(cb) {
      constructAndInvokeUsers(cb)
    },

    function(callback) {
      callPostItemAuctionBids(callback)
      //callback()
    },
    function(callback) {
      constructAndQueryUsers(callback)
      //callback()
    }

  ], function(error, results) {
    if (error)
      console.log(results);
    else {
      console.log("ALl went fine .. No ERRORS")
    }
  });
}
