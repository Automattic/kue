REPORTER = spec

test-tdd:
		@./node_modules/.bin/mocha \
			--reporter $(REPORTER) \
			--ui tdd \
			test/tdd/*.js

test-bdd:
		@./node_modules/.bin/mocha \
			--reporter $(REPORTER) \
			--ui bdd \
			test/*.js

test-all: test-bdd test-tdd

.PHONY: test-all