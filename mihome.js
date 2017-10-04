var querystring = require('querystring');
var https = require('https');
var fs=require('fs');
var fname='key.json';
var host = 'mihome4u.co.uk';
var auth;
var apipath = '/api/v1/device_groups/power_on';
var sessionId = null;
var objid = '49119';
var valid=0;

function setauth(cb) {
  var content;
  fs.readFile(fname, 'utf8', function(err, fdata) {
    if (err) {
      return console.log(err);
    }
    content=JSON.parse(fdata);
    auth=content.email+':'+content.key;
    console.log('auth is '+auth); 
    cb('null');
  });
}


function getApiKey(email, pw, cb) {
  var bodyparse;
  var request=https.request({'hostname': 'mihome4u.co.uk',
                          'path': '/api/v1/users/profile',
                          'auth': email+':'+pw
                         },
        function(response) {
          //console.log('status: '+response.statusCode);
          //console.log('headers: '+JSON.stringify(response.headers));
          response.setEncoding('utf8');
          response.on('data', function(chunk) {
            //console.log('body is: '+chunk);
            bodyparse=JSON.parse(chunk);
            console.log('API key is: '+bodyparse.data.api_key);
            cb(bodyparse.data.api_key);
          });
          response.on('end', function() {
            //console.log('end');
          });
        });
  request.end();
}


function performRequest(endpoint, authstr, method, data, success) {
  var dataString = JSON.stringify(data);
  var headers = {};
  
  if (method == 'GET') {
    endpoint += '?' + querystring.stringify(data);
  }
  else {
    headers = {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length
    };
  }
  var options = {
    host: host,
    path: endpoint,
    auth: authstr,
    method: method,
    headers: headers
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      console.log(responseString);
      var responseObject = JSON.parse(responseString);
      success(responseObject);
    });
  });

  req.write(dataString);
  req.end();
}

module.exports=function(RED) {
  function func_mihome(config) {
    RED.nodes.createNode(this, config);
    const node=this;
    node.name=config.name;

    node.status({fill: 'green', shape: 'ring', text: 'empty'});


    this.on('input', function(msg) {
      valid=0;
      node.status({fill: 'green', shape: 'ring', text: 'a msg'});
      if (msg.payload.command=='group_on') {
        node.status({fill: 'green', shape: 'ring', text: 'group_on'});
        apipath='/api/v1/device_groups/power_on';
        objid=msg.payload.objid;
        valid=1;
      } else if (msg.payload.command=='group_off') {
        apipath='/api/v1/device_groups/power_off';
        objid=msg.payload.objid;
        valid=1;
      } else if (msg.payload.command=='get_key') {
        getApiKey(msg.payload.email, msg.payload.pw, function(info) {
          email=msg.payload.email;
          msg.payload='{"email":"'+email+'", "key":"'+info+'"}';
          node.send(msg);
        });
        valid=2;
      } 
      else if (msg.payload.command=='get_subdevice_list') {
        apipath='/api/v1/subdevices/list';
        setauth(function(ret){
          performRequest(apipath, auth, 'POST', {'id': parseInt(objid)},
            function(data){
            console.log(data);
            msg.payload=data;
            node.send(msg);
          });
        });
        valid=2;
      }      
      else if (msg.payload.command=='subdevice_on'){
        apipath='/api/v1/subdevices/power_on';
        objid=msg.payload.objid;
        setauth(function(ret){
          performRequest(apipath, auth, 'POST', {'id': parseInt(objid)},
            function(data){
            console.log(data);
            msg.payload=data;
            node.send(msg);
          });
        });
        valid=2;
      }      
      else if (msg.payload.command=='subdevice_off'){
        apipath='/api/v1/subdevices/power_off';
        objid=msg.payload.objid;
        setauth(function(ret){
          performRequest(apipath, auth, 'POST', {'id': parseInt(objid)},
            function(data){
            console.log(data);
            msg.payload=data;
            node.send(msg);
          });
        });
        valid=2;
      }
      else if (msg.payload.command=='subdevice_info'){
        apipath='/api/v1/subdevices/show';
        objid=msg.payload.objid;
        setauth(function(ret){
          performRequest(apipath, auth, 'POST', {'id': parseInt(objid)},
            function(data){
            console.log(data);
            msg.payload=data;
            node.send(msg);
          });
        });
        valid=2;
      }

      if (valid==1)
      {
        fs.readFile(fname, 'utf8', function(err, fdata) {
          if (err) {
            return console.log(err);
          }
          content=JSON.parse(fdata);
          auth=content.email+':'+content.key;
          console.log('auth is '+auth);
          performRequest(apipath, auth, 'POST', {'id': parseInt(objid)},
            function(data){
            console.log(data)});
          msg.payload='{"bob":"hello", "fred":"there"}';
          node.send(msg);
        });
      }
    });


  } // end func_mihome


  RED.nodes.registerType('mihome', func_mihome);
  RED.httpAdmin.post('/mihome/:id', RED.auth.needsPermission('mihome.write'), function(req, res) {
  const node=RED.nodes.getNode(req.params.id);
  if (node==null) {
    res.sendStatus(404);
  } else {
    try {
      node.receive({ok: true});
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
      node.error(RED._("mihome.failed", {error: err.toString()}));
    }
  }


  });

}

