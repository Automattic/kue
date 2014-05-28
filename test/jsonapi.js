var request = require('supertest')
  , express = require('express');
// var app = express();

// app.get('/user', function(req, res){
//   res.send(200, { name: 'tobi' });
// });

var kue  = require('../index');
var jobs = kue.createQueue({
  redis: {
    port: 6379,
    host: 'eit.tw',
    auth: 'ptt.link',
    options: {
      // look for more redis options in [node_redis](https://github.com/mranney/node_redis)
    }
  }
});
var app = kue.app;

var priority = [10, 0 , -5, -10, -15];
function jobsPopulate(count) {
	
	var jobs = [];
	for (var i = 0; i < count; i++) {
		jobs.push({
			"type": "test",
			"data": {
				"title": i
			},
			"options": {
				// random priority
				"priority": priority[Math.floor(Math.random() * 5)]
			}
		});
	}

	return jobs.length == 1 ? jobs[0] : jobs; // return array only if length > 1
}

function vaildSortedResult(arr, key, order) {

	var current = (order === 'desc') ? Number.MAX_VALUE : Number.MIN_VALUE;
	var compare = (order === 'desc') ? function(a, b) { return a >= b;}
	 															 : function(a, b) { return a <= b;};
	
	if ( order === 'desc')
		console.log(arr);

	for (var i = 0; i < arr.length; i++) {
		var value = parseInt(arr[i][key], 10);
		if (compare(current, value)) {
			current = value;
		} else {
			throw "Order incorrect." + current + " " + value;
		}
	}
}

describe('POST /job', function() {

	it('Insert a job, respond with an id', function(done) {
		request(app)
			.post('/job')
			.send(jobsPopulate(1))
			.expect(200)
			.expect(function(res) {
				if (!res.body.id) {
					throw "create one job error";
				}
			})
			.end(done);
	});

	// it('Insert jobs, respond with ids', function(done) {

	// 	var jobCount = 5;
	// 	request(app)
	// 		.post('/job')
	// 		.send(jobsPopulate(jobCount))
	// 		.expect(200)
	// 		.expect(function(res) {
	// 			if (res.body.id.length != jobCount) {
	// 				throw "create jobs error";
	// 			}
	// 		})
	// 		.end(done);
	// });
})

describe('GET /inactive', function() {

	it('sort desc by priority', function(done) {
		request(app)
			.get('/jobs/inactive/0..100/desc')
			.expect(200)
			.expect(function(res) {
				vaildSortedResult(res.body, 'priority', 'desc');
			})
			.end(done);
	});

	it('sort asc by priority', function(done) {
		request(app)
			.get('/jobs/inactive/0..100/asc')
			.expect(200)
			.expect(function(res) {
				vaildSortedResult(res.body, 'priority', 'asc');
			})
			.end(done);
	});

	// it('sort desc by id', function(done) {
	// 	request(app)
	// 		.get('/jobs/inactive/0..100/byId:desc')
	// 		.expect(200)
	// 		.expect(function(res) {
	// 			vaildSortedResult(res.body, 'id', 'desc');
	// 		})
	// 		.end(done);
	// });

	// it('sort asc by id', function(done) {
	// 	request(app)
	// 		.get('/jobs/inactive/0..100/byId:asc')
	// 		.expect(200)
	// 		.expect(function(res) {
	// 			vaildSortedResult(res.body, 'id', 'asc');
	// 		})
	// 		.end(done);
	// });
});

  // it('respond with json', function(done) {
  //   request(app)
  //     .get('/jobs/active/0..10/asc')
  //     // .set('Accept', 'application/')
  //     .expect('Content-Type', /json/)
  //     .expect(200, done);
  // })