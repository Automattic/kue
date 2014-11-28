# jQuery JSONView

Formats & syntax highlights JSON.

Port of Ben Hollis's JSONView extension for Firefox: http://jsonview.com

[Live demo](http://blog.yesmeck.com/jquery-jsonview/)

## Usage

```javascript
var json = {"hey": "guy","anumber": 243,"anobject": {"whoa": "nuts","anarray": [1,2,"thr<h1>ee"], "more":"stuff"},"awesome": true,"bogus": false,"meaning": null, "japanese":"明日がある。", "link": "http://jsonview.com", "notLink": "http://jsonview.com is great"};

$(function() {
  $("#json").JSONView(json);
  // with options
  $("#json-collasped").JSONView(json, {collapsed: true});
});
```

## Options

```javascript
{
  collapsed: false
}
```

## Methods

```javascript
// collapse nodes
$('#json').JSONView('collapse');

// expand nodes
$('#json').JSONView('expand');

// toggle nodes
$('#json').JSONView('toggle');

// toggle level1 nodes, also be supported in collapse and expand
$('#json').JSONView('toggle', 1)
```

## Licence

[MIT](http://opensource.org/licenses/MIT)
