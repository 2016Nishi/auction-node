//'use strict';
var fs = require('fs');
var https = require('https');
var hfc = require('/usr/local/lib/node_modules/hfc');
//var Network_Json = require("./auction-NS-HSBN.json");
var chain = hfc.newChain("testChainZXY");
exports.chain = chain
var AuctionChainCalls = require('./auction-CC-DIQ-HSBN.js').ACC;
//var UsersJson = require("./auction-Users-CC-BMStarter.json");
//var UsersJson = require("./auction-Users-CC-HSBN.json");

var ca_url, certFile, network, peers, users, isHSBN
process.env['GRPC_SSL_CIPHER_SUITES'] = 'ECDHE-RSA-AES128-GCM-SHA256:' +
    'ECDHE-RSA-AES128-SHA256:' +
    'ECDHE-RSA-AES256-SHA384:' +
    'ECDHE-RSA-AES256-GCM-SHA384:' +
    'ECDHE-ECDSA-AES128-GCM-SHA256:' +
    'ECDHE-ECDSA-AES128-SHA256:' +
    'ECDHE-ECDSA-AES256-SHA384:' +
    'ECDHE-ECDSA-AES256-GCM-SHA384';
  // Configure the KeyValStore which is used to store sensitive keys.
  // This data needs to be located or accessible any time the users enrollmentID
  // perform any functions on the blockchain.  The users are not usable without
  // This data.
  // Please ensure you have a /tmp directory prior to placing the keys there.
  // If running on windows or mac please review the path setting.
  chain.setKeyValStore(hfc.newFileKeyValStore('/tmp/keyValStore'));
  exports.DownloadCopyCert = function DownloadCopyCert(cb){



  // Read and process the credentials.json

  try {
    console.log("Getting network")
    network = JSON.parse(fs.readFileSync('./ServiceCredentials.json', 'utf8'));
    //console.log("Got network", network)
  } catch (err){
    console.log("ServiceCredentials.json is missing, Rerun once the file is available")
    process.exit();
  }


  peers = network.credentials.peers;
  users = network.credentials.users;
  //console.log("network: %s", network);
  //console.log("PEERS: %s", peers);
  //console.log("USERS: %s", users);
  // Determining if we are running on a startup or HSBN network based on the url
  // of the discovery host name.  The HSBN will contain the string zone.
  isHSBN = peers[0].discovery_host.indexOf('zone') >= 0 ? true : false;
  var peerAddress = [];
  var network_id = Object.keys(network.credentials.ca);
  ca_url = "grpcs://" + network.credentials.ca[network_id].discovery_host + ":"+network.credentials.ca[network_id].discovery_port;

  if (!isHSBN) {
      //HSBN uses RSA generated keys
      chain.setECDSAModeForGRPC(true)
  }
  var ccPath = "/opt/gopath/src/github.com/auction"
  certFile = 'certificate.pem';
  var certUrl = network.credentials.cert;

  fs.access(certFile, function(err)  {
      if (!err) {
          console.log("\nDeleting existing certificate ", certFile);
          fs.unlinkSync(certFile);
      }
      downloadCertificate();
  });

  function downloadCertificate() {

      var file = fs.createWriteStream(certFile);
      var data = '';
      https.get(certUrl, function(res) {
          console.log('\nDownloading certificate ', certFile);
          /*res.on('data', function(d)  {
              fs.appendFile(certFile, d, function(err) {
                  if (err) //throw err;
                     return cb(err)
              });
          });
          res.pipe(file)*/
          res.on('data', function(d){
            data += d;
          })
          // event received when certificate download is completed
          res.on('end', function() {
            fs.writeFileSync(certFile, data);
            if (process.platform == "win32") {
              copyCertificate();
            } else {
              // Adding a new line character to the certificates
              fs.appendFile(certFile, "\n", function(err) {
                  if (err) //throw err;
                      return cb(err)
                  copyCertificate();
              });
            }
          });
      }).on('error', function(e)  {
          console.error(e);
          //process.exit();
          return cb(err)
      });
  }

  function copyCertificate(){
    //fs.createReadStream('certificate.pem').pipe(fs.createWriteStream(ccPath+'/certificate.pem'));
    fs.writeFileSync(ccPath + '/certificate.pem', fs.readFileSync(__dirname+'/certificate.pem'));

    setTimeout(function(){
      SetupNetwork();
      //cb()
    }, 3000);
  }
}
//exports.SetupNetwork = function SetupNetwork(cb) {
function SetupNetwork() {

      var cert = fs.readFileSync(certFile);
      chain.setMemberServicesUrl(ca_url, {pem: cert});

      // Adding all the peers to blockchain
      // this adds high availability for the client
      for (var i = 0; i < peers.length; i++) {
          chain.addPeer("grpcs://" + peers[i].discovery_host + ":" + peers[i].discovery_port, {pem: cert});
          console.log("Added peer ", peers[i].discovery_host + ":" + peers[i].discovery_port)
      }

      var testChaincodeID;

      // Enroll a 'admin' who is already registered because it is
      // listed in fabric/membersrvc/membersrvc.yaml with it's one time password.
      chain.enroll(users[1].username, users[1].secret, function(err, admin) {
          if (err) throw Error("\nERROR: failed to enroll admin : %s", err);

          console.log("\nEnrolled admin sucecssfully");

          // Set this user as the chain's registrar which is authorized to register other users.
          chain.setRegistrar(admin);
          var userName = users[2].username;
          var userSecret = users[2].secret;

          chain.enroll(userName, userSecret, function(err, WebAppAdmin) {
              if (err) throw Error("\nERROR: failed to enroll WebAppAdmin : %s", err);
              //chain.setRegistrar(WebAppAdmin);

              console.log("\nEnrolled WebAppAdmin sucecssfully");
              var enrollName = users[2].username; // "JohnDoe";
              var registrationRequest = {
                  enrollmentID: enrollName,
                  //affiliation: "group1"
                  account: "group1",
                  affiliation: "00001"
              };
              chain.registerAndEnroll(registrationRequest, function(err, user) {
                  if (err) throw Error(" Failed to register and enroll " + enrollName + ": " + err);
                  console.log("USER %j", user)
                  console.log("\nEnrolled and registered "+enrollName+ " successfully");
                  var mrseller = user
                  //setting timers for fabric waits
                  chain.setDeployWaitTime(80);
                  //chain.setInvokeWaitTime(20);
                  console.log("\nDeploying chaincode ...")
                  AuctionChainCalls(mrseller, isHSBN);
              });
          });
      });
}
