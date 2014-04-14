kue = require '../'

# jobs = kue.createQueue()
# Job = kue.Job
# jobs.promote 1

describe 'Kue', ->
  describe 'Shutdown', ->
    it 'should destroy singleton on shutdown', (done) ->
      jobs = kue.createQueue()
      jobsToo = kue.createQueue()

      # references should be the same object
      jobs.should.equal jobsToo

      jobs.shutdown (err) ->
        newJobs = kue.createQueue()
        newJobs.should.not.equal jobs
        done()


