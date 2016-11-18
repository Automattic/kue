-- Kue
-- User: behrad
-- Date: 5/28/16
-- Change job's state

-- KEYS[1] prefix
-- ARGV[1] job id
-- ARGV[2] job zid
-- ARGV[3] new state
-- ARGV[4] current timestamp


local jobKey    = KEYS[1]..':job:'..ARGV[1]
local newState  = ARGV[3]
local returnVal = 1

if newState == 'active' then
    -- you can't set job active this way!
    return 0
end

if redis.call("EXISTS", jobKey) ~= 1 then
    -- job not exists
    return 0
end

local pairs = redis.call('HMGET', jobKey, 'type', 'priority', 'state')
if not pairs[1] then
    return 0
end

local jobType   = pairs[1] --redis.call('HGET', jobKey, 'type')
local prio      = pairs[2] --redis.call('HGET', jobKey, 'priority')
local curState  = pairs[3] --redis.call('HGET', jobKey, 'state')
local order     = tonumber(prio)


if curState then
    redis.call('ZREM', KEYS[1]..':jobs:'..curState, ARGV[2])
    redis.call('ZREM', KEYS[1]..':jobs:'..jobType..':'..curState, ARGV[2])
end


if newState == 'complete' then
    redis.call('HSET', jobKey, 'progress', 100)
    redis.call('HINCRBY', jobKey, 'attempts', 1)
    order = tonumber(ARGV[4])
    -- set duration
end


if newState == 'failed' then
    order = tonumber(ARGV[4])
    redis.call('HSET', jobKey, 'failed_at', tonumber(ARGV[4]))
    local attempts      = tonumber(redis.call('HGET', jobKey, 'attempts'))
    local max_attempts  = tonumber(redis.call('HGET', jobKey, 'max_attempts'))
    if not attempts then
        attempts = 1
    end
    if not max_attempts then
        max_attempts = 1
    end
    if attempts < max_attempts then
        local thisAttempt = redis.call('HINCRBY', jobKey, 'attempts', 1)
        local remaining = max_attempts - thisAttempt
        if remaining > 0 then
            -- reattempt
            local backoff  = redis.call('HGET', jobKey, 'backoff')
            local delay  = redis.call('HGET', jobKey, 'delay')
            if not delay then
                delay = 0
            end
            if backoff then
                newState = 'delayed'
                backoff = cjson.decode(backoff)
                if backoff == true then
                else
                    if backoff['delay'] then
                        delay = tonumber(backoff['delay'])
                    end
                    if backoff['type'] == 'exponential' then
                        delay = math.floor((math.pow(2, thisAttempt) - 1) * 0.5 * delay)
                    end
                end
                redis.call('HSET', jobKey, 'delay', delay)
                local lastAttemptTs = tonumber(redis.call('HGET', jobKey, 'failed_at'))
                if not lastAttemptTs then
                    lastAttemptTs = tonumber(redis.call('HGET', jobKey, 'created_at'))
                end
                local promote_at = tonumber(delay) + lastAttemptTs
                redis.call('HSET', jobKey, 'promote_at', promote_at)
            else
                newState = 'inactive'
            end
        end
        returnVal = {remaining, thisAttempt, max_attempts }
    else
        returnVal = {0, attempts, max_attempts}
    end
end


if newState == 'delayed' then
    order = tonumber(redis.call('HGET', jobKey, 'promote_at'))
end


redis.call('HMSET', jobKey, 'state', newState, 'updated_at', tonumber(ARGV[4]))
redis.call('ZADD', KEYS[1]..':jobs:'..newState, order, ARGV[2])
redis.call('ZADD', KEYS[1]..':jobs:'..jobType..':'..newState, order, ARGV[2])


if newState == 'inactive' then
    local helperList = KEYS[1]..':'..jobType..':jobs'
    redis.call('LPUSH', helperList, ARGV[2])
end

return returnVal