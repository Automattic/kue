kue = require '../'

describe 'Kue', ->

  jobs = null
  Job = null

  beforeEach (done) ->
    jobs = kue.createQueue()
    Job = kue.Job
    jobs.promote 1
    done()

  afterEach (done) ->
    onShutdown = (err) ->
      jobs = null
      done()

    jobs.shutdown onShutdown, 500

  describe 'job-producer', ->
    it 'should save jobs having new id', (done) ->
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      job = jobs.create('email-to-be-saved', job_data)
      jobs.process 'email-to-be-saved', (job, done)->
        done()
      job.save (err) ->
        job.id.should.be.an.instanceOf(Number)
        done err


    it 'should receive job complete event', (done) ->
      jobs.process 'email-to-be-completed', (job, done)->
        done()
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.create('email-to-be-completed', job_data)
      .on 'complete', ->
          done()
      .save()

    it 'should receive job result in complete event', (done) ->
      jobs.process 'email-with-results', (job, done)->
        done( null, {finalResult:123} )
      job_data =
        title: 'Test Email Job With Results'
        to: 'tj@learnboost.com'
      jobs.create('email-with-results', job_data)
      .on 'complete', (result)->
          result.finalResult.should.be.equal 123
          done()
      .save()


    it 'should receive job progress event', (done) ->
      jobs.process 'email-to-be-progressed', (job, done)->
        job.progress 1, 2
        done()
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.create('email-to-be-progressed', job_data)
      .on 'progress', (progress)->
          progress.should.be.equal 50
          done()
      .save()


    it 'should receive job failed event', (done) ->
      jobs.process 'email-to-be-failed', (job, done)->
        done 'error'
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.create('email-to-be-failed', job_data)
      .on 'failed', ->
          done()
      .save()


  describe 'Kue Management', ->
    totalJobs = {}
    removeJobById = (id, type, done)->
      Job.remove id, (err) ->
        done() if not --totalJobs[type]

    it.skip 'should be able to remove completed jobs', (done) ->
      jobs.complete (err, ids) ->
        totalJobs.complete = ids.length
        removeJobById id, 'complete', done for id in ids

    it.skip 'should be able to remove failed jobs', (done) ->
      jobs.failed (err, ids) ->
        totalJobs.failed = ids.length
        removeJobById id, 'failed', done for id in ids

    it 'should receive job result in complete event', (done) ->
      jobs.process 'email-with-results-2', (job, done)->
        done( null, {finalResult:123} )
      job_data =
        title: 'Test Email Job With Results'
        to: 'tj@learnboost.com'
      jobs.on 'job complete', (id, result) ->
        Number(id).should.be.a.Number
        result.finalResult.should.be.equal 123
        done()
      jobs.create('email-with-results-2', job_data).save()
