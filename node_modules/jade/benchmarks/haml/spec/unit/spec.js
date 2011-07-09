
describe 'haml'
  describe '.version'
    it 'should be a triplet'
      haml.version.should.match(/^\d+\.\d+\.\d+$/)
    end
  end
  
  describe '.render()'
    before
      assertAs = function(name, type, options) {
        var str = fixture(name + '.haml')
        try {
          var html = haml.render(str, options).trim(),
              expected = fixture(name + '.' + type).trim()
          if (html === expected)
            pass()
          else
            fail('got:\n' + html + '\n\nexpected:\n' + expected)
        } catch (err) {
          if (err instanceof haml.HamlError) {
            throw err
          } else {
            fail('\n:' + err.stack + '\n')
          }
        }
      }
      assert = function(name, options) {
        assertAs(name, 'html', options, 'CRLF', '\r\n')
      }
      assertXML = function(name, options) {
        assertAs(name, 'xml', options, 'CRLF', '\r\n')
      }
    end
    
    it 'should allow passing of a context object'
      assert('context', { context: 'yay' })
    end
    
    it 'should allow passing of literals'
      assert('literals', { locals: { user: 'tj' }})
    end
    
    it 'should not fail on trailing indents'
      assert('trailing-indent')
    end
    
    it 'should add xml support via the "xml" option'
      assertXML('feed', { xml: true })
    end
    
    it 'should support xml namespaces'
      assertXML('namespace')
    end
    
    it 'should utilize "filename" option when an error is thrown'
      try { assert('error', { filename: 'error.haml' }) }
      catch (err) {
        err.message.should.eql '(error.haml):3 invalid indentation; got 3, when previous was 1'
      }
    end
    
    it 'should default filename to "Haml" when an error is thrown'
      try { assert('error') }
      catch (err) {
        err.message.should.eql '(Haml):3 invalid indentation; got 3, when previous was 1'
      }
    end
    
    it 'should bitch when "cache" is true without a filename given'
      // -{ assert('tag.simple', { cache: true }) }.should.throw_error
    end
    
    it 'should pre-compiled and cache when "cache" is true'
      assert('tag.simple', { cache: true, filename: 'tag.simple.haml' })
      assert('tag.simple', { cache: true, filename: 'tag.simple.haml' })
    end
    
    it 'should support blank lines'
      assert('newlines')
    end
    
    describe '.class'
      it 'should output a div with the given class'
        assert('class')
      end
      
      it 'should work with several classes'
        assert('classes')
      end
    end
    
    describe '#id'
      it 'should output a div with the given id'
        assert('id')
      end
    end
    
    describe '%tag'
      it 'should work with no text or block'
        assert('tag.simple')
      end
      
      it 'should work with text'
        assert('tag.text')
      end
      
      it 'should work with block text'
        assert('tag.text.block')
      end
      
      it 'should work with blocks of text and tags'
        assert('tag.text.block.complex')
      end
      
      it 'should work with many classes / ids / attrs'
        assert('tag.complex')
      end
      
      it 'should allow empty tags'
        assert('tag.empty')
      end
    end
    
    describe '%tag.class'
      it 'should output tag with a class'
        assert('tag.class')
      end
      
      it 'should work with several classes'
        assert('tag.classes')
      end
      
      it 'should support self-closing tags'
        assert('tag.self-close')
      end
    end
    
    describe '%tag!='
      it 'should output the evaluated code'
        assert('tag.code')
      end
      
      it 'should not escape output'
        assert('tag.code.no-escape')
      end
    end
    
    describe '%tag='
      it 'should escape the evaluated code'
        assert('tag.escape')
      end
    end
    
    describe '%namespace:tag'
      it 'should output a tag with a namespace prefix'
        assert('namespace.tag')
      end
    end
    
    describe '{...}'
      it 'should be mapped as html attributes'
        assert('tag.attrs')
      end
      
      it 'should escape values'
        assert('tag.attrs.escape')
      end
      
      it 'should allow booleans'
        assert('tag.attrs.bools')
      end
    end
    
    describe '!!!'
      it 'should default the doctype to 1.0 transitional'
        assert('doctype')
      end
    end
    
    describe '!!! NAME'
      it 'should output a specific doctype'
        assert('doctype.xml')
      end
      
      it 'should be case-insensitive'
        assert('doctype.xml.case')
      end
    end
    
    describe 'nesting'
      it 'should work when nested downwards'
        assert('nesting.simple')
      end
      
      it 'should work when blocks outdent'
        assert('nesting.complex')
      end
    end
    
    describe '- code'
      it 'should work with if statements'
        assert('code.if')
      end
      
      it 'should work when nested'
        assert('code.nested')
      end
    end
    
    describe '- each'
      it 'should iterate'
        assert('code.each', { locals: { items: ['one', 'two', 'three'] }})
        assert('code.each.non-enumerable', { locals: { items: null }})
      end
      
      it 'should iterate objects'
        assert('code.each', { locals: { items: { 0: 'one', 1: 'two', 2: 'three' }}})
        assert('code.each.index', { locals: { items: { 0: 'one', 1: 'two', 2: 'three' }}})
      end
      
      it 'should iterate with index'
        assert('code.each.index', { locals: { items: ['one', 'two', 'three'] }})
      end
    end
    
    describe '= code'
      it 'should output evaluation'
        assert('code')
      end
    end
    
    describe '&= code'
      it 'should output evaluation while escaping html entities'
        assert('code.escape')
      end
    end
    
    describe '<literal></html>'
      it 'should remain intact'
        assert('html')
      end
    end
    
    describe '\\char'
      it 'should escape the character'
        assert('escape')
      end
    end
    
    describe '-#'
      it 'should become a silent comment'
        assert('comment')
      end
    end
    
    describe '/'
      it 'should comment out tags'
        assert('comment.tag')
      end
      
      it 'should comment out blocks'
        assert('comment.block')
      end
      
      it 'should comment out text'
        assert('comment.text')
      end
      
      it 'should work in blocks'
        assert('comment.text.complex')
      end
    end
    
    describe '/[]'
      it 'should insert conditional comment blocks'
        assert('comment.block.conditional')
      end
    end

    describe ':filter'
      describe 'plain'
        it 'should ignore haml specific characters'
          assert('filter.plain')
        end
      end
    
      describe 'cdata'
        it 'should wrap with CDATA tags'
          assert('filter.cdata')
        end
        
        it 'should retain whitespace'
          assert('filter.cdata.whitespace')
        end
      end
      
      describe 'javascript'
        it 'should wrap with <script> and CDATA tags'
          assert('filter.javascript')
        end
      end
    end
    
    describe 'bug fixes'
      it '#8 code block'
        assert('issue.#8', { locals: { items: ['foo', 'bar', 'baz'] }})
      end
      
      it '#10 Attributes should not need quotes'
        assert('issue.#10')
      end
    end
    
  end
end