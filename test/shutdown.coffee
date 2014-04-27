should = require 'should'

kue = require '../'

# jobs = kue.createQueue()
# Job = kue.Job
# jobs.promote 1

describe 'Kue', ->
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
          # one of the workers should be shutdown
          jobs.workers.should.have.length 1

          # kue should still be running
          jobs.promoter.should.not.be.empty
          jobs.client.should.not.be.empty

          jobs.shutdown testDone, 10

      jobs.shutdown fn, 1000, 'shutdownTask'


    it 'should fail active job when shutdown timer expires', (testDone) ->
      jobs = kue.createQueue()
      jobs.promote 1

      jobId = null

      jobs.process 'long-task', (job, done) ->
        jobId = job.id
        fn = ->
          done()
        setTimeout fn, 10000

      jobs.create('long-task', {}).save (err) ->
        should(err).be.empty

        fn = (err) ->
          kue.Job.get jobId, (err, job) ->
            job.should.have.property '_state', "failed"
            job.should.have.property '_error', "Shutdown"
            testDone()

        # shutdown timer is shorter than job length
        jobs.shutdown fn, 10

