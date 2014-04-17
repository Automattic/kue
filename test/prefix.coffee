kue = require '../'

describe 'Kue - Prefix', ->

  makeJobs = (queueName) ->
      opts =
          redis:
              prefix: queueName
      jobs = kue.createQueue opts
      return jobs

  stopJobs = (jobs, callback) ->
      jobs.shutdown (err) ->
          callback()

  # expected redis activity
  #
  # 1397744169.196792 "subscribe" "q:events"
  # 1397744169.196852 "unsubscribe"
  it 'should use prefix q by default', (done) ->
      jobs = kue.createQueue()
      jobs.client.prefix.should.equal 'q'
      stopJobs jobs, done

  # expected redis activity
  #
  it 'should accept and store prefix', (done) ->

      jobs = makeJobs('testPrefix1')

      jobs.client.prefix.should.equal 'testPrefix1'

      stopJobs jobs, (err) ->
          jobs2 = makeJobs('testPrefix2')
          jobs2.client.prefix.should.equal 'testPrefix2'
          stopJobs jobs2, done


  it 'store queued jobs in different prefixes', (testDone) ->
      jobs = makeJobs('jobCompleteTest')

      jobs.inactiveCount (err, count) ->
          prevCount = count

          jobs.create( 'fakeJob', {} ).save()
          f = ->
              jobs.inactiveCount (err, count) ->
                  count.should.equal prevCount + 1
                  testDone()
          setTimeout f, 100
