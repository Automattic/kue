kue = require '../'

describe 'Kue - Prefix', ->

  makeJobs = (queueName) ->
      opts =
          prefix: queueName
          promotion:
            interval: 10
      jobs = kue.createQueue opts
      return jobs

  stopJobs = (jobs, callback) ->
      jobs.shutdown callback

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
  # 1397744498.330456 "subscribe" "testPrefix1:events"
  # 1397744498.330638 "unsubscribe"
  # 1397744498.330907 "subscribe" "testPrefix2:events"
  # 1397744498.331148 "unsubscribe"
  it 'should accept and store prefix', (done) ->

      jobs = makeJobs('testPrefix1')

      jobs.client.prefix.should.equal 'testPrefix1'

      stopJobs jobs, (err) ->
          jobs2 = makeJobs('testPrefix2')
          jobs2.client.prefix.should.equal 'testPrefix2'
          stopJobs jobs2, done

  it 'should process and complete a job using a prefix', (testDone) ->

      jobs = makeJobs('simplePrefixTest')

      job = jobs.create('simplePrefixJob')
      job.on 'complete', () ->
          stopJobs jobs, testDone
      job.save()
      jobs.process 'simplePrefixJob', (job, done) ->
          done()

  # expected redis activity
  #
  # 1397744498.333423 "subscribe" "jobCompleteTest:events"
  # 1397744498.334002 "info"
  # 1397744498.334358 "zcard" "jobCompleteTest:jobs:inactive"
  # 1397744498.335262 "info"
  # 1397744498.335578 "incr" "jobCompleteTest:ids"
  # etc...
  it 'store queued jobs in different prefixes', (testDone) ->
      jobs = makeJobs('jobCompleteTest')

      jobs.inactiveCount (err, count) ->
          prevCount = count

          jobs.create( 'fakeJob', {} ).save()
          f = ->
              jobs.inactiveCount (err, count) ->
                  count.should.equal prevCount + 1
                  stopJobs jobs, testDone
          setTimeout f, 10

  it 'should not pick up an inactive job from another prefix', (testDone) ->
      jobs = makeJobs('inactiveJobs')
      # create a job but do not process
      job = jobs.create('inactiveJob', {} ).save (err) ->
          # stop the 'inactiveJobs' prefix
          stopJobs jobs, (err) ->
              jobs = makeJobs('inactiveJobs2')

              # verify count of inactive jobs is 0 for this prefix
              jobs.inactiveCount (err, count) ->
                  count.should.equal 0

                  stopJobs jobs, testDone


  it 'should properly switch back to default queue', (testDone) ->
      jobs = makeJobs('notDefault')
      stopJobs jobs, (err) ->
          jobs = kue.createQueue()

          job = jobs.create('defaultPrefixJob')
          job.on 'complete', () ->
              stopJobs jobs, testDone
          job.save()

          jobs.process 'defaultPrefixJob', (job, done) ->
              done()

