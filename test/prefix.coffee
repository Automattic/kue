kue = require '../'

describe 'Kue - Prefix', ->

  makeJobs = (queueName) ->
      opts =
          redis:
              prefix: queueName
      console.log "Random queue name: #{opts.redis.prefix}"
      jobs = kue.createQueue opts
      return jobs

  stopJobs = (jobs, callback) ->
      jobs.shutdown (err) ->
          callback()

  noop = () ->
      return null

  it 'should accept and store prefix', (done) ->

      jobs = makeJobs('testPrefix1')

      jobs.client.prefix.should.equal 'testPrefix1'

      stopJobs jobs, (err) ->
          jobs2 = makeJobs('testPrefix2')
          jobs2.client.prefix.should.equal 'testPrefix2'
          stopJobs jobs2, done


  it 'store queued jobs in different prefixes', (testDone) ->
      jobs = makeJobs('jobCompleteTest')
      jobs.create( 'fakeJob', {} ).save()
      f = ->
          jobs.inactiveCount (err, count) ->
              count.should.equal 1
              testDone()
      setTimeout f, 100
