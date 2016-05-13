_ = require 'lodash'
async = require 'async'
should = require 'should'
kue = require '../'

describe 'Kue Tests', ->

  jobs = null
  Job = null

  beforeEach ->
    jobs = kue.createQueue({promotion:{interval:50}})
    Job = kue.Job

  afterEach (done) ->
    jobs.shutdown 50, done

  #  before (done) ->
  #    jobs = kue.createQueue({promotion:{interval:100}})
  #    jobs.client.flushdb done

  #  after (done) ->
  #    jobs = kue.createQueue({promotion:{interval:100}})
  #    jobs.client.flushdb done


  describe 'Job Producer', ->
    it 'should save jobs having a new id', (done) ->
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      job = jobs.create('email-to-be-saved', job_data)
      jobs.process('email-to-be-saved', _.noop)
      job.save (err) ->
        job.id.should.be.an.instanceOf(Number)
        done err


    it 'should set worker id on job hash', (done) ->
      job_data =
        title: 'Test workerId Job'
        to: 'tj@learnboost.com'
      job = jobs.create('worker-id-test', job_data)
      jobs.process 'worker-id-test', (job, jdone)->
        jdone()
        Job.get job.id, (err, j) ->
          j.toJSON().workerId.should.be.not.null;
          done()
      job.save()


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



    it 'should receive job progress event with extra data', (done) ->
      jobs.process 'email-to-be-progressed', (job, done)->
        job.progress 1, 2,
          notifyTime : "2014-11-22"
        done()
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.create('email-to-be-progressed', job_data)
      .on 'progress', (progress, extraData)->
        progress.should.be.equal 50
        extraData.notifyTime.should.be.equal "2014-11-22"
        done()
      .save()



    it 'should receive job failed attempt events', (done) ->
      total = 2
      errorMsg = 'myError'
      jobs.process 'email-to-be-failed', (job, jdone)->
        jdone errorMsg
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.create('email-to-be-failed', job_data).attempts(2)
      .on 'failed attempt', (errMsg,doneAttempts) ->
        errMsg.should.be.equal errorMsg
        doneAttempts.should.be.equal 1
        total--
      .on 'failed', (errMsg)->
        errMsg.should.be.equal errorMsg
        (--total).should.be.equal 0
        done()
      .save()



    it 'should receive queue level complete event', (done) ->
      jobs.process 'email-to-be-completed', (job, jdone)->
        jdone( null, { prop: 'val' } )
      jobs.on 'job complete', (id, result) ->
        id.should.be.equal testJob.id
        result.prop.should.be.equal 'val'
        done()
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      testJob = jobs.create('email-to-be-completed', job_data).save()



    it 'should receive queue level failed attempt events', (done) ->
      total = 2
      errorMsg = 'myError'
      jobs.process 'email-to-be-failed', (job, jdone)->
        jdone errorMsg
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.on 'job failed attempt', (id, errMsg, doneAttempts) ->
        id.should.be.equal newJob.id
        errMsg.should.be.equal errorMsg
        doneAttempts.should.be.equal 1
        total--
      .on 'job failed', (id, errMsg)->
        id.should.be.equal newJob.id
        errMsg.should.be.equal errorMsg
        (--total).should.be.equal 0
        done()
      newJob = jobs.create('email-to-be-failed', job_data).attempts(2).save()




  describe 'Job', ->
    it 'should be processed after delay', (done) ->
      now = Date.now()
      jobs.create( 'simple-delay-job', { title: 'simple delay job' } ).delay(300).save()
      jobs.process 'simple-delay-job', (job, jdone) ->
        processed = Date.now()
        (processed - now).should.be.approximately( 300, 100 )
        jdone()
        done()


    it 'should have promote_at timestamp', (done) ->
      now = Date.now()
      job = jobs.create( 'simple-delayed-job', { title: 'simple delay job' } ).delay(300).save()
      jobs.process 'simple-delayed-job', (job, jdone) ->
        job.promote_at.should.be.approximately(now + 300, 100)
        jdone()
        done()


    it 'should update promote_at after delay change', (done) ->
      now = Date.now()
      job = jobs.create( 'simple-delayed-job-1', { title: 'simple delay job' } ).delay(300).save()
      job.delay(100).save()
      jobs.process 'simple-delayed-job-1', (job, jdone) ->
        job.promote_at.should.be.approximately(now + 100, 100)
        jdone()
        done()



    it 'should update promote_at after failure with backoff', (done) ->
      now = Date.now()
      job = jobs.create( 'simple-delayed-job-2', { title: 'simple delay job' } ).delay(100).attempts(2).backoff({delay: 100, type: 'fixed'}).save()
      calls = 0
      jobs.process 'simple-delayed-job-2', (job, jdone) ->
        processed = Date.now()
        if calls == 1
          (processed - now).should.be.approximately(300, 100)
          jdone()
          done()
        else
          (processed - now).should.be.approximately(100, 100)
          jdone('error')

        calls++



    it 'should be processed at a future date', (done) ->
      now = Date.now()
      jobs.create( 'future-job', { title: 'future job' } ).delay(new Date(now + 200)).save()
      jobs.process 'future-job', (job, jdone) ->
        processed = Date.now()
        (processed - now).should.be.approximately( 200, 100 )
        jdone()
        done()



    it 'should receive promotion event', (done) ->
      job_data =
        title: 'Test Email Job'
        to: 'tj@learnboost.com'
      jobs.process('email-to-be-promoted', (job,done)-> )
      jobs.create('email-to-be-promoted', job_data).delay(200)
      .on 'promotion', ()->
        done()
      .save()



    it 'should be re tried after failed attempts', (done) ->
      [total, remaining] = [2,2]
      jobs.create( 'simple-multi-attempts-job', { title: 'simple-multi-attempts-job' } ).attempts(total).save()
      jobs.process 'simple-multi-attempts-job', (job, jdone) ->
        job.toJSON().attempts.remaining.should.be.equal remaining
        (job.toJSON().attempts.made + job.toJSON().attempts.remaining).should.be.equal total
        if( !--remaining )
          jdone()
          done()
        else
          jdone( new Error('reaattempt') )



    it 'should honor original delay at fixed backoff', (done) ->
      [total, remaining] = [2,2]
      start = Date.now()
      jobs.create( 'backoff-fixed-job', { title: 'backoff-fixed-job' } ).delay( 200 ).attempts(total).backoff( true ).save()
      jobs.process 'backoff-fixed-job', (job, jdone) ->
        if( !--remaining )
          now = Date.now()
          (now - start).should.be.approximately(400,120)
          jdone()
          done()
        else
          jdone( new Error('reaattempt') )



    it 'should honor original delay at exponential backoff', (done) ->
      [total, remaining] = [3,3]
      start = Date.now()
      jobs.create( 'backoff-exponential-job', { title: 'backoff-exponential-job' } )
      .delay( 50 ).attempts(total).backoff( {type:'exponential', delay: 100} ).save()
      jobs.process 'backoff-exponential-job', (job, jdone) ->
        job._backoff.type.should.be.equal "exponential"
        job._backoff.delay.should.be.equal 100
        now = Date.now()
        if( !--remaining )
          (now - start).should.be.approximately(350,100)
          jdone()
          done()
        else
          jdone( new Error('reaattempt') )



    it 'should honor users backoff function', (done) ->
      [total, remaining] = [2,2]
      start = Date.now()
      jobs.create( 'backoff-user-job', { title: 'backoff-user-job' } )
      .delay( 50 ).attempts(total).backoff( ( attempts ) -> 250 ).save()
      jobs.process 'backoff-user-job', (job, jdone) ->
        now = Date.now()
        if( !--remaining )
          (now - start).should.be.approximately(350, 100)
          jdone()
          done()
        else
          jdone( new Error('reaattempt') )

    it 'should log with a sprintf-style string', (done) ->
      jobs.create( 'log-job', { title: 'simple job' } ).save()
      jobs.process 'log-job', (job, jdone) ->
        job.log('this is %s number %d','test',1)
        Job.log job.id, (err,logs) ->
          logs[0].should.be.equal('this is test number 1');
          done()
        jdone()



    it 'should log objects, errors, arrays, numbers, etc', (done) ->
      jobs.create( 'log-job', { title: 'simple job' } ).save()
      jobs.process 'log-job', (job, jdone) ->
        job.log()
        job.log(undefined)
        job.log(null)
        job.log({test: 'some text'})
        job.log(new Error('test error'))
        job.log([1,2,3])
        job.log(123)
        job.log(1.23)
        job.log(0)
        job.log(NaN)
        job.log(true)
        job.log(false)
        Job.log job.id, (err,logs) ->
          logs[0].should.be.equal('undefined');
          logs[1].should.be.equal('undefined');
          logs[2].should.be.equal('null');
          logs[3].should.be.equal('{ test: \'some text\' }');
          logs[4].should.be.equal('[Error: test error]');
          logs[5].should.be.equal('[ 1, 2, 3 ]');
          logs[6].should.be.equal('123');
          logs[7].should.be.equal('1.23');
          logs[8].should.be.equal('0');
          logs[9].should.be.equal('NaN');
          logs[10].should.be.equal('true');
          logs[11].should.be.equal('false');
          done()
        jdone()




  describe 'Kue Core', ->

    it 'should receive a "job enqueue" event', (done) ->
      jobs.on 'job enqueue', (id, type) ->
        if type == 'email-to-be-enqueued'
          id.should.be.equal job.id
          done()
      jobs.process 'email-to-be-enqueued', (job, jdone) -> jdone()
      job = jobs.create('email-to-be-enqueued').save()


    it 'should receive a "job remove" event', (done) ->
      jobs.on 'job remove', (id, type) ->
        if type == 'removable-job'
          id.should.be.equal job.id
          done()
      jobs.process 'removable-job', (job, jdone) -> jdone()
      job = jobs.create('removable-job').save().remove()


    it 'should fail a job with TTL is exceeded', (done) ->
      jobs.process('test-job-with-ttl', (job, jdone) ->
        # do nothing to sample a stuck worker
      )
      jobs.create('test-job-with-ttl', title: 'a ttl job').ttl(500)
        .on 'failed', (err) ->
          err.should.be.equal 'TTL exceeded'
          done()
        .save()


  describe 'Kue Job Concurrency', ->

    it 'should process 2 concurrent jobs at the same time', (done) ->
      now = Date.now()
      jobStartTimes = []
      jobs.process('test-job-parallel', 2, (job,jdone) ->
        jobStartTimes.push Date.now()
        if( jobStartTimes.length == 2 )
          (jobStartTimes[0] - now).should.be.approximately( 0, 100 )
          (jobStartTimes[1] - now).should.be.approximately( 0, 100 )
          done()
        setTimeout(jdone, 500)
      )
      jobs.create('test-job-parallel', title: 'concurrent job 1').save()
      jobs.create('test-job-parallel', title: 'concurrent job 2').save()

    it 'should process non concurrent jobs serially', (done) ->
      now = Date.now()
      jobStartTimes = []
      jobs.process('test-job-serial', 1, (job,jdone) ->
        jobStartTimes.push Date.now()
        if( jobStartTimes.length == 2 )
          (jobStartTimes[0] - now).should.be.approximately( 0, 100 )
          (jobStartTimes[1] - now).should.be.approximately( 500, 100 )
          done()
        setTimeout(jdone, 500)
      )
      jobs.create('test-job-serial', title: 'non concurrent job 1').save()
      jobs.create('test-job-serial', title: 'non concurrent job 2').save()

    it 'should process a new job after a previous one fails with TTL is exceeded', (done) ->
      failures = 0
      now = Date.now()
      jobStartTimes = []
      jobs.process('test-job-serial-failed', 1, (job,jdone) ->
        jobStartTimes.push Date.now()
        if( jobStartTimes.length == 2 )
          (jobStartTimes[0] - now).should.be.approximately( 0, 100 )
          (jobStartTimes[1] - now).should.be.approximately( 500, 100 )
          failures.should.be.equal 1
          done()
        # do not call jdone to simulate a stuck worker
      )
      jobs.create('test-job-serial-failed', title: 'a ttl job 1').ttl(500).on( 'failed', ()->
        ++failures
      ).save()
      jobs.create('test-job-serial-failed', title: 'a ttl job 2').ttl(500).on( 'failed', ()->
        ++failures
      ).save()


  describe 'Kue Job Removal', ->

    beforeEach (done) ->
      jobs.process 'sample-job-to-be-cleaned', (job, jdone) -> jdone()
      async.each([1..10], (id, next) ->
        jobs.create( 'sample-job-to-be-cleaned', {id: id} ).save(next)
      , done)


    it 'should be able to remove completed jobs', (done) ->
      jobs.complete (err, ids) ->
        should.not.exist err
        async.each(ids, (id, next) ->
          Job.remove(id, next)
        , done)


    it 'should be able to remove failed jobs', (done) ->
      jobs.failed (err, ids) ->
        should.not.exist err
        async.each(ids, (id, next) ->
          Job.remove(id, next)
        , done)

