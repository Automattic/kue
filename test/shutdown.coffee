should = require 'should'

kue = require '../'

# jobs = kue.createQueue()
# Job = kue.Job
# jobs.promote 1

describe 'Kue', ->

  before (done) ->
    jobs = kue.createQueue()
    jobs.client.flushdb done

  after (done) ->
    jobs = kue.createQueue()
    jobs.client.flushdb done

  describe 'Shutdown', ->
    it 'should return singleton from createQueue', (done) ->
      jobs = kue.createQueue()
      jobsToo = kue.createQueue()

      jobs.should.equal jobsToo

      jobs.shutdown done

    it 'should destroy singleton on shutdown', (done) ->
      jobs = kue.createQueue()

      jobs.shutdown (err) ->

        # test that new jobs object is a different reference
        newJobs = kue.createQueue()
        newJobs.should.not.equal jobs

        newJobs.shutdown done

    it 'should clear properties on shutdown', (done) ->
      jobs = kue.createQueue()
      jobs.promote()
      jobs.shutdown (err) ->
        should(jobs.workers).be.empty
        should(jobs.client).be.empty
        should(jobs.promoter).be.empty
        done()
        
    it 'should be able to pause/resume the worker', (done) ->
      jobs = kue.createQueue()
      job_data =
        title: 'resumable jobs'
        to: 'tj@learnboost.com'
      total_jobs = 3
      for i in [0...total_jobs]
        jobs.create('resumable-jobs', job_data).save()

      jobs.process 'resumable-jobs', 1, (job, job_done, ctx) ->
        job_done()
        if( !--total_jobs )
          jobs.shutdown done, 1000
        else
          ctx.pause()
          setTimeout ctx.resume, 100
        
    

    it 'should not clear properties on single type shutdown', (testDone) ->
      jobs = kue.createQueue()
      jobs.promote 1

      fn = (err) ->
          jobs.promoter.should.not.be.empty
          jobs.client.should.not.be.empty
          jobs.shutdown testDone, 10

      jobs.shutdown fn, 10, 'fooJob'

    it 'should shutdown one worker type on single type shutdown', (testDone) ->
      jobs = kue.createQueue()
      jobs.promote 1

      # set up two worker types
      jobs.process 'runningTask', (job, done) ->
          done()

      jobs.workers.should.have.length 1

      jobs.process 'shutdownTask', (job, done) ->
          done()

      jobs.workers.should.have.length 2

      fn = (err) ->
          # verify shutdownTask is not running but runningTask is
          for worker in jobs.workers
              switch worker.type
                  when 'shutdownTask'
                      worker.should.have.property 'running', false
                  when 'runningTask'
                      worker.should.have.property 'running', true

          # kue should still be running
          jobs.promoter.should.not.be.empty
          jobs.client.should.not.be.empty

          jobs.shutdown testDone, 10

      jobs.shutdown fn, 10, 'shutdownTask'


    it 'should fail active job when shutdown timer expires', (testDone) ->
      jobs = kue.createQueue()
      jobs.promote 1

      jobId = null

      jobs.process 'long-task', (job, done) ->
          jobId = job.id
          fn = ->
            done()
          setTimeout fn, 10000

      jobs.create('long-task', {}).save()

      # need to make sure long-task has had enough time to get into active state
      waitForJobToRun = ->
          fn = (err) ->
              kue.Job.get jobId, (err, job) ->
                  job.should.have.property '_state', "failed"
                  job.should.have.property '_error', "Shutdown"
                  testDone()

          # shutdown timer is shorter than job length
          jobs.shutdown fn, 10

      setTimeout waitForJobToRun, 50

    it 'should not call graceful shutdown twice on subsequent calls', (testDone) ->
      jobs = kue.createQueue()

      jobs.process 'test-subsequent-shutdowns', (job, done) ->
        done()
        setTimeout ()->
          jobs.shutdown (err)->
            should.not.exist(err)
          , 100
        , 50

        setTimeout ()->
          jobs.shutdown (err)->
            err.should.be.equal "Shutdown already in progress"
            testDone()
          , 100
        , 60

      jobs.create('test-subsequent-shutdowns', {}).save()

    it 'should fail active re-attemptable job when shutdown timer expires', (testDone) ->
      jobs = kue.createQueue()
      jobId = null

      jobs.process 'shutdown-reattemptable-jobs', (job, done) ->
        jobId = job.id
        setTimeout done, 500

      jobs.create('shutdown-reattemptable-jobs', { title: 'shutdown-reattemptable-jobs' }).attempts(2).save()

      # need to make sure long-task has had enough time to get into active state
      waitForJobToRun = ->
        fn = (err) ->
          kue.Job.get jobId, (err, job) ->
            job.should.have.property '_state', "inactive"
            job.should.have.property '_attempts', "1"
            job.should.have.property '_error', "Shutdown"
            testDone()

        # shutdown timer is shorter than job length
        jobs.shutdown fn, 100

      setTimeout waitForJobToRun, 50
