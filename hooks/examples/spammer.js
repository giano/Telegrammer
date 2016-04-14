"use strict";

/**
* @alias spammer
* @member {Object} spammer
* @description Example of command line hook. Just send passed string to chat
* @memberOf hooks/examples
*/


const Promise = require('promise');

module.exports = {
  exec: function (params, service) {
    if (params.what) {
      return service.send(params.what).then(function(message){
        if(message.message_id){
          return Promise.resolve(message.message_id);
        }else{
          Promise.reject(new Error("Message was not sent"));
        }
      });
    } else {
      return Promise.reject(new Error("Hey, why so silent?"));
    }
  },
  params: [{
    name: 'what',
    alias: 'w',
    type: String,
    exampleValue: "whateva!"
  }],
  description: "Example of command line hook. Just send passed string to chat."
};
