var json = require('./events/json.js');
var app = require('../http/');
var io = require('socket.io')();

io.on('connection', (socket)=>{
	socket.on('job:stats', json.stats);
	socket.on('job:search', json.search);
	socket.on('job:range', json.jobRange);
	socket.on('job:type:range', json.jobTypeRange);
	socket.on('job:type:state:stats', json.jobTypeStateStats);
	socket.on('job:state:range', json.jobStateRange);
	socket.on('job:types', json.types);
	socket.on('job:get', json.job);
	socket.on('job:log', json.log);
	socket.on('job:update:state', json.updateState);
	socket.on('job:update:priority', json.updatePriority);
	socket.on('job:remove', json.remove);
	socket.on('job:create', json.createJob);
	socket.on('job:inactive', json.inactive);
});

module.exports = io;