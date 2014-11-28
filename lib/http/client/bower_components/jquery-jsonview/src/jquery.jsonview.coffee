do (jQuery) ->

  # @include lib/json_formatter.coffee
  # @include lib/collapser.coffee

  $ = jQuery

  JSONView =
    collapse: (el) ->
      Collapser.collapse(el) if el.innerHTML == '-'

    expand: (el) ->
      Collapser.expand(el) if el.innerHTML == '+'

    toggle: (el) ->
      Collapser.toggle(el)

  $.fn.JSONView = ->
    args = arguments

    if JSONView[args[0]]?
      # it's method call
      method = args[0]

      @each ->
        $this = $(this)
        if args[1]?
          # collapse/expand by node level
          level = args[1]
          $this.find(".jsonview .collapsible.level#{level}").siblings('.collapser').each -> JSONView[method](this)

        else
          # no level specify? collapse/expand all!
          $this.find('.jsonview > ul > li > .collapsible').siblings('.collapser').each -> JSONView[method](this)

    else
      json = args[0]
      options = args[1] || {}

      defaultOptions =
        collapsed: false,
        nl2br: false

      options = $.extend(defaultOptions, options)

      formatter = new JSONFormatter(nl2br: options.nl2br)
      # Covert, and catch exceptions on failure
      json = JSON.parse(json) if Object.prototype.toString.call(json) == '[object String]'
      outputDoc = formatter.jsonToHTML(json)

      @each ->
        $this = $(this)

        $this.html(outputDoc)

        items = $this[0].getElementsByClassName('collapsible')

        for item in items
          Collapser.bindEvent(item.parentNode, options.collapsed) if item.parentNode.nodeName == 'LI'

