var express = require("express");

var connString = 'Endpoint=sb://cri-mean-contacts.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=4V7XMA9I6ZV6JOib/jvTBGgzQ4Gokftw65Lviosctho='; 
var azure = require('azure');

var serviceBus = azure.createServiceBusService(connString);
var queue = "contacts";
serviceBus.createQueueIfNotExists(queue, function (error) { 
    if (!error) { 
        // Topic was created or exists 
        console.log('queue created or exists.'); 
    } 
    else { 
        console.log(error); 
    } 
}); 

serviceBus.listQueues(null, function(error, result, response) {  
    if (error) {
        console.log(error);
        return;
    }

    //console.log(JSON.stringify(result, null, 3));
});

var messages = [];

doorbellListener(serviceBus);

//https://msdn.microsoft.com/en-us/magazine/dn802604.aspx
function doorbellListener(sb) {
  //Get the current unix time in seconds
  var date = new Date();
  var time = date.getTime();
  var startSeconds = time / 1000;
  var c_Timeout = 20;
  listenForMessages(c_Timeout);
  // Define a function that will listen for messages
  // on the queue for number of seconds
  function listenForMessages(seconds) {
    console.log('Doorbell Listener Started for timeout: ' + seconds);
    // Long poll the service bus for seconds
    sb.receiveQueueMessage(queue, { timeoutIntervalInS: seconds },
      function(err, data) {
        if(err){
          // This path will get hit if we didn't get any messages
          console.log(err);
        }
        else{
          // We have received a message from a device
          console.log(data);
          var m = JSON.parse(data.body);
          messages.push(m);
          console.log('recieved message');
          console.log(m.body);
          //continueListeningForMessages();

          function continueListeningForMessages(){
            // Go back and listen for more messages for the duration of this task
            var currentDate = new Date();
            var currentSeconds = currentDate.getTime() / 1000;
          console.log('currentSeconds ' + currentSeconds);
          console.log('startSeconds ' + startSeconds);
        // Compute the seconds between when we started this scheduled task and now
        // This is the time that we will long-poll the service bus
        var newTimeout = Math.round((c_Timeout - (currentSeconds - startSeconds)));
          if(newTimeout > 0){
          // Note: the receiveQueueMessage function takes ints no decimals!!
          listenForMessages(newTimeout);
        }
      }
    }
    listenForMessages(seconds);
  });
  }
}

var app = express();

var server = app.listen(process.env.PORT || 8081, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});


// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get("/", function(req, res) {
  res.send('Hello World');
});

app.get("/contacts", function(req, res) {
  res.status(200).json(messages);
});

app.get("/contacts/send/:body", function(req, res) {
var message = {
    body: req.params.body,
    customProperties: {
        testproperty: 'TestValue'
    }};
var jsonMessage = JSON.stringify(message);
console.log(jsonMessage);
serviceBus.sendQueueMessage(queue, jsonMessage, function(error){
    if(!error){
      var m = JSON.parse(jsonMessage);
      var msg = "message sent: " + m.body;
        console.log(msg);
        res.status(200).send(msg);
    }
});
});

