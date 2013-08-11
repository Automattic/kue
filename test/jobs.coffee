
kue     = require '../'
should  = require 'should'

describe 'kue', ->

  jobs = null
  theJobs = []

  it 'Creates a Queue', (done) ->
    jobs = kue.createQueue()
    jobs.should.not.be.null
    (typeof jobs).should.equal "object"
    jobs.client.flushall (err, res) ->
      done()

  it 'Creates jobs', ->
    theJobs.push jobs.createJob('test')
    theJobs.length.should.equal 1
    theJobs[0].type.should.equal 'test'

    theJobs.push jobs.createJob('test')
    theJobs.length.should.equal 2
    theJobs[1].type.should.equal 'test'

  it 'Saves jobs', ->
    theJobs[0].save (err) ->
      should.not.exist err
      theJobs[1].save (err) ->
        theJobs[1].active()
        should.not.exist err

  it 'Retrieves and counts inactive jobs', ->
    jobs.inactive (err, ids) ->
      should.not.exist err
      ids.length.should.equal 1

    jobs.inactiveCount (err, count) ->
      should.not.exist err
      count.should.equal 1

  it 'Retrieves and counts outstanding jobs', ->
    jobs.outstanding (err, ids) ->
      should.not.exist err      
      ids.length.should.equal 2

    jobs.outstandingCount (err, count) ->
      should.not.exist err
      count.should.equal 2

  it 'Stores data', ->
    theJob = jobs.createJob 'test', { name : 'Brandon' }
    theJobs.push(theJob)
    theJob.save (err) ->
      should.not.exist err

  it 'Retrieves jobs by ID', ->
    jobs.getById 3, (err, job) ->
      should.not.exist err
      job.data.name.should.equal 'Brandon'


  # it 'Does not index data automatically', ->

  # it should process jobs


  it 'Stores job keys when specified', ->
    theJob = jobs.createJob('test', { key:'ABCDEFG' });
    theJobs.push(theJob)
    theJob.save (err) ->
      should.not.exist err

  it 'Detects whether jobs are outstanding', ->
    theJob = jobs.isOutstanding 3, (err, isOutstanding) ->
      should.not.exist err
      isOutstanding.should.be.true

      theJob = jobs.isOutstanding { type:"test", key:"ABCDEFG" }, (err, isOutstanding) ->
        should.not.exist err
        isOutstanding.should.be.true


  # it should retry jobs on failures


  # it should mark jobs as complete


  # it should mark jobs as failed


  # it should find jobs by type


  # it should handle jobs by concurrency

  # it allows a job to mark itself as complete


