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
        
    it 'should be able to pause/resume the worker', (done) ->
      jobs = kue.createQueue()
      job_data =
        title: 'resumable jobs'
        to: 'tj@learnboost.com'
      total_jobs = 3
      for i in [0...total_jobs]
        jobs.create('resumable-jobs', job_data).save()

      jobs.process 'resumable-jobs', 1, (job, job_done, ctx) ->
        if( !--total_jobs )
          jobs.shutdown done
        else
          ctx.pause()
          setTimeout ctx.resume, 300
        job_done()
        
    

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


