-- Kue
-- User: behrad
-- Date: 5/28/16
-- A ZPOP script, picking a job and pushing it into active zset

-- KEYS[1] prefix
-- KEYS[2] job type
-- ARGV[1] current timestamp
-- ARGV[2] worker id


local inactiveSet = KEYS[1]..':jobs:'..KEYS[2]..':inactive'
local activeSet = KEYS[1]..':jobs:'..KEYS[2]..':active'
local helperList = KEYS[1]..':'..KEYS[2]..':jobs'


local val = redis.call('ZRANGE', inactiveSet, 0, 0)
if val then
    for _, zid in pairs(val) do
        redis.call('ZREMRANGEBYRANK', inactiveSet, 0, 0)
        redis.call('ZREM', KEYS[1]..':jobs:inactive', zid)
        redis.call('LPUSH', helperList, zid)

        -- change job state to active now!
        local _, id = zid:match("([^|]+)|([^|]+)")
        local jobKey = KEYS[1]..':job:'..id

        if redis.call("EXISTS", jobKey) ~= 1 then
            return 0
        end

        redis.call('ZADD', activeSet, tonumber(ARGV[1]), zid)
        redis.call('ZADD', KEYS[1]..':jobs:active', tonumber(ARGV[1]), zid)

        redis.call('HSET', jobKey, 'state', 'active')
        redis.call('HSET', jobKey, 'updated_at', tonumber(ARGV[1]))
        redis.call('HSET', jobKey, 'started_at', tonumber(ARGV[1]))
        redis.call('HSET', jobKey, 'workerId', ARGV[2])
    end
end

return val