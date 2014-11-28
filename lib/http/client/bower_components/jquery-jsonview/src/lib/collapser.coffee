Collapser =
  bindEvent: (item, collapsed) ->
    collapser = document.createElement('div')
    collapser.className = 'collapser'
    collapser.innerHTML = if collapsed then '+' else '-'
    collapser.addEventListener('click', (event) =>
      @toggle(event.target)
    )
    item.insertBefore(collapser, item.firstChild)
    @collapse(collapser) if collapsed

  expand: (collapser) ->
    target = @collapseTarget(collapser)
    ellipsis = target.parentNode.getElementsByClassName('ellipsis')[0]
    target.parentNode.removeChild(ellipsis)
    target.style.display = ''
    collapser.innerHTML = '-'

  collapse: (collapser) ->
    target = @collapseTarget(collapser)
    target.style.display = 'none'
    ellipsis = document.createElement('span')
    ellipsis.className = 'ellipsis'
    ellipsis.innerHTML = ' &hellip; '
    target.parentNode.insertBefore(ellipsis, target)
    collapser.innerHTML = '+'

  toggle: (collapser) ->
    target = @collapseTarget(collapser)
    if target.style.display == 'none'
      @expand(collapser)
    else
      @collapse(collapser)

  collapseTarget: (collapser) ->
    targets = collapser.parentNode.getElementsByClassName('collapsible')
    return unless targets.length
    target = targets[0]

