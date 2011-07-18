var pool = require('./pool');

exports.jobs = {};

exports.addJob = function(Job) {
        if (Job.id) {
            exports.jobs[parseInt(Job.id)] = Job;
        }
        if (exports.subscribed !== true) {
            exports.subscribe();
            exports.subscribed = true;
        }
    }


exports.subscribe = function() {
    var client = pool.pubSubClient();
    client.subscribe("q:jobs:callback");
    client.on("message", this.onMessage);
}

exports.onMessage = function(channel, message) {
    message = JSON.parse(message);

    if (message.id  != undefined && exports.jobs[message.id] != undefined) {       
        exports.jobs[message.id].emit(message.status);
        exports.jobs[message.id].removeAllListeners();
        delete exports.jobs[message.id];
    }
}

exports.changeStatus = function(id, status) {
    var client = pool.alloc();
    var message = JSON.stringify({
        'id' : parseInt(id),
        'status': status
    });
    client.publish("q:jobs:callback", message);
}