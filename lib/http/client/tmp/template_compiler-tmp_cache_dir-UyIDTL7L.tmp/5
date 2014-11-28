import Ember from 'ember';
export default Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, helper, options, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1;
  data.buffer.push("\n<div class=\"table jobs\">\n  <div class=\"heading\">\n      <div class=\"col\">id</div>\n      <div class=\"col\">type</div>\n      <div class=\"col\">state</div>\n      <div class=\"col\">created_at</div>\n      <div class=\"col\">updated_at</div>\n      <div class=\"col\">attempts</div>\n  </div>\n    ");
  stack1 = helpers.each.call(depth0, "job", "in", "model", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n</div>\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1;
  data.buffer.push("\n      <div class=\"table-row job\" ");
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "showDetail", "job", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0,depth0],types:["STRING","ID"],data:data})));
  data.buffer.push(">\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.id", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.type", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.state", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.created_at", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.updated_at", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n        <div class=\"col\">");
  stack1 = helpers._triageMustache.call(depth0, "job.attempts.made", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push(" (");
  stack1 = helpers._triageMustache.call(depth0, "job.attempts.remaining", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push(") </div>\n      </div>\n      ");
  stack1 = helpers['if'].call(depth0, "job.showDetail", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    ");
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = '', stack1;
  data.buffer.push("\n        <div class=\"table-row detail\">\n          <div class=\"col\">\n            <div class=\"\">id:");
  stack1 = helpers._triageMustache.call(depth0, "job.id", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n            <div class=\"\">type:");
  stack1 = helpers._triageMustache.call(depth0, "job.type", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n            <div class=\"\">state:");
  stack1 = helpers._triageMustache.call(depth0, "job.state", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n            <div class=\"\">created_at:");
  stack1 = helpers._triageMustache.call(depth0, "job.created_at", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n            <div class=\"\">updated_at:");
  stack1 = helpers._triageMustache.call(depth0, "job.updated_at", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</div>\n            <div class=\"\">");
  stack1 = helpers._triageMustache.call(depth0, "job.attempts.made", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push(" (");
  stack1 = helpers._triageMustache.call(depth0, "job.attempts.remaining", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push(") </div>\n          </div>\n        </div>\n      ");
  return buffer;
  }

  stack1 = (helper = helpers['jobs-filter'] || (depth0 && depth0['jobs-filter']),options={hash:{
    'type': ("type"),
    'state': ("state"),
    'page': ("page")
  },hashTypes:{'type': "ID",'state': "ID",'page': "ID"},hashContexts:{'type': depth0,'state': depth0,'page': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "jobs-filter", options));
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});
