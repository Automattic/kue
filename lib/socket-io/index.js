var json = require('./events/json.js');
var app = require('../http/');
var io = require('socket.io')();

io.on('connection', (socket)=>{
	socket.on('stats', json.stats);
	socket.on('search', json.search);
	socket.on('jobRange', json.jobRange);
	socket.on('jobTypeRange', json.jobTypeRange);
	socket.on('jobTypeStateStats', json.jobTypeStateStats);
	socket.on('jobStateRange', json.jobStateRange);
	socket.on('types', json.types);
	socket.on('job', json.job);
	socket.on('log', json.log);
	socket.on('updateState', json.updateState);
	socket.on('updatePriority', json.updatePriority);
	socket.on('remove', json.remove);
	socket.on('createJob', json.createJob);
	socket.on('inactive', json.inactive);
});

module.exports = io;