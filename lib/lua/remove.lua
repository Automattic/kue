-- Kue
-- User: behrad
-- Date: 5/28/16
-- Remove Job

-- KEYS[1] prefix
-- ARGV[1] job id
-- ARGV[2] job zid


if redis.call("EXISTS", KEYS[1]..':job:'..ARGV[1]) ~= 1 then
    return 0
end

local prefix = KEYS[1]..':jobs'
redis.call('ZREM', prefix..':inactive', ARGV[2])
redis.call('ZREM', prefix..':active', ARGV[2])
redis.call('ZREM', prefix..':complete', ARGV[2])
redis.call('ZREM', prefix..':failed', ARGV[2])
redis.call('ZREM', prefix..':delayed', ARGV[2])

local type = redis.call('HGET', KEYS[1]..':job:'..ARGV[1], 'type')
redis.call('ZREM', prefix..':'..type..':inactive', ARGV[2])
redis.call('ZREM', prefix..':'..type..':active', ARGV[2])
redis.call('ZREM', prefix..':'..type..':complete', ARGV[2])
redis.call('ZREM', prefix..':'..type..':failed', ARGV[2])
redis.call('ZREM', prefix..':'..type..':delayed', ARGV[2])

redis.call('ZREM', prefix, ARGV[2])

redis.call('DEL', KEYS[1]..':job:'..ARGV[1]..':log')
redis.call('DEL', KEYS[1]..':job:'..ARGV[1])