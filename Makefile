
test:
	@./node_modules/.bin/expresso \
		--require should \
		--serial

.PHONY: test