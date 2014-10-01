/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(function() {

  // jQuery extensions
  var urlChange = ko.observable(window.location.hash);
  window.addEventListener("hashchange", function(e) {
    setTimeout(function() {
      urlChange(window.location.hash);
    },10);
  });


  $.fn.scrollReveal = function(){
    $("<a href='#'>&nbsp;</a>").insertAfter(this).focus().remove();
  }

  $.fn.clickOut = function(callback, context){
    return this.each(function(){
      context = context || this;
      var _this = this;
      // SetTimeout to prevent evt propagation conflicts
      setTimeout(function(){
        $(document).click(function(e){
          if (!$(_this).has(e.target).length){
            $(document).unbind("click", arguments.callee);
            callback.call(context, e);
          }
        });
      }, 10);
    });
  }

  $(document.body).on("click", ".dropdown:not(.dropdownNoEvent)",function(e){
    $(this).toggleClass("opened");
  }).on("click", ".dropdown dd.prevent",function(e){
    e.stopPropagation();
  });

  // Custom ko bindings

  // -------------
  // Main difference between INCLUDE and INSERT:
  // include uses its own applybinding, while insert need an "upper" state in argument
  // -------------

  ko.bindingHandlers.include = {
    init: function(elem, valueAccessor) {
    },
    update: function(elem, valueAccessor) {
      var placeholder = ko.virtualElements.firstChild(elem);
      if (!placeholder){
        placeholder = document.createComment("placeholder");
        elem.parentNode.insertBefore(placeholder, elem.nextSibling);
      }
      var inc = ko.utils.unwrapObservable(valueAccessor());
      setTimeout(function(){
        $(placeholder).replaceWith(inc);
      },0);
    }
  }
  ko.virtualElements.allowedBindings.include = true;

  ko.bindingHandlers.insert = {
    init: function(elem, valueAccessor) {
    },
    update: function(elem, valueAccessor) {
      ko.virtualElements.emptyNode(elem);
      if (typeof valueAccessor() == 'string'){
        elem.parentNode.innerHtml = valueAccessor();
      } else {
        elem.parentNode.insertBefore(valueAccessor(), elem.nextSibling);
      }
    }
  }
  ko.virtualElements.allowedBindings.insert = true;
  // -------------

  // toggle Booleans from binding
  ko.bindingHandlers.toggle = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var val = valueAccessor();
      ko.applyBindingsToNode(element, { click: function() {
        val(!val());
      } });
    },
    update: function() {}
  };

  ko.bindingHandlers.switchButton = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var val = valueAccessor();
      ko.applyBindingsToNode(element, { css: { 'active': val }, toggle: val });
    },
    update: function() {}
  };

  // add active class on link if in url
  ko.bindingHandlers.isActiveUrl = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      var isActive = ko.computed(function() {
        return (urlChange()+"/").indexOf(url+"/") == 0;
      });
      ko.applyBindingsToNode(element, { css: {'active': isActive} });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  ko.bindingHandlers.isExactUrl = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      var isActive = ko.computed(function() {
        return urlChange() == url;
      });
      ko.applyBindingsToNode(element, { css: {'active': isActive} });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  // Just pass a function in the template, to call it
  ko.bindingHandlers['exec'] = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      valueAccessor()(element, allBindings, viewModel, bindingContext);
    }
  };
  // Log
  ko.bindingHandlers['log'] = {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
          debug && console.log("LOG FROM HTML:",valueAccessor());
      }
  };

  ko.bindingHandlers.href = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      ko.applyBindingsToNode(element, { attr: {'href': url} });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  ko.bindingHandlers.memorizeLinks = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var url = valueAccessor();
      var link = ko.observable(url);
      ko.applyBindingsToNode(element, { attr: {'href': link} });
      urlChange.subscribe(function(cu) {
        if (cu.indexOf(url) === 0) {
          link(cu);
        }
      });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    }
  }

  ko.bindingHandlers.memoScroll = (function(){
    var memos = {}
    return {
      init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        element.addEventListener('scroll', function(e) {
          var memo = valueAccessor();
          memos[memo] = [element.scrollLeft,element.scrollTop];
        });
      },
      update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var memo = valueAccessor();
        if (!memos[memo]) {
          memos[memo] = [0,0];
        }

        setTimeout(function() {
          debug && console.log(memo, memos[memo])
          element.scrollLeft = memos[memo][0];
          element.scrollTop  = memos[memo][1];
        }, 1);// Wait for everything to be displayed
      }
    }
  }());

  function throttle(f){
    var timer;
    return function(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(f, 1);
    }
  }

  ko.bindingHandlers.logScroll = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var memo = valueAccessor();
      if (!memo()) {
        memo('stick');
      }
      setTimeout(function() {
        if (memo() == 'stick'){
          element.scrollTop = 9e9;
        } else {
          element.scrollTop = memo();
        }
      }, 100);

      // When an element is added to the node, we reactualise the scroll.
      // This is more efficient than anything else since this callback is
      // removed when the element is gone.
      element.addEventListener("DOMNodeInserted", function() {
        if (memo() == 'stick'){
          element.scrollTop = 9e9;
        }
      }, true);

      element.addEventListener('scroll', function(e) {
        if ((element.scrollTop + element.offsetHeight) > (element.scrollHeight - 20)) { // 20 is the error margin
          memo('stick');
        } else {
          memo(element.scrollTop);
        }
      },true);
    }
  }

  // This allows to style SVG in css (including css transition and animations)
  ko.bindingHandlers.svg = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      $(element)
        .attr({
          width: "18px", // putting default small value,
          height: "18px" // to avoid cranky blinking
        });
      $.get(valueAccessor(), function(data) {
        var img = $(document.adoptNode(data.querySelector('svg')));
        $(element).replaceWith(img);
      }, 'xml');
    }
  }

  // Try to avoid the dom to be solicited on every messages, by looking for sequences:
  // when the server pushes 50 lines at once in the webscoket, it comes as 50 events
  // we buffer those sequences by listening all events that occur in less than 20ms.
  ko.buffer = function() {
    var timer, bufferArray = [];
    return function(item, callback) {
      bufferArray.push(item);
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = setTimeout(function() {
        callback(bufferArray);
        bufferArray = [];
        timer = null;
      }, 20);
    }
  }

  // Format micro-seconds in ms and s
  function roundDecimal(n) {
    return Math.round(n*10)/10;
  }
  ko.bindingHandlers.formatTime = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var value = valueAccessor();
      if (value > 10e5) element.innerText = roundDecimal(value/10e5)+" s"
      if (value > 10e2) element.innerText = roundDecimal(value/10e2)+" ms"
      else              element.innerText = roundDecimal(value)     +" µs"
    }
  }

  // Utility functions
  ko.domRemoved = function(target, callback) {
    return setTimeout(function() {
      return target.addEventListener("DOMNodeRemovedFromDocument", function(e) {
        return callback(e);
      });
    }, 0);
    // the setTimeout here is needed because browsers call this event
    // when we append nodes from a document fragment (build in knockout).
    // Since most nodes are in a fragment when we bind them therefore,
    // we call the "remove" event right after binding if we don't delay
  }

  ko.doOnChange = function(ob, fn) {
    fn(ob());
    return ob.subscribe(fn);
  }

  ko.bindhtml = function(html, model) {
    var dom = $(html)[0];
    ko.applyBindings(model, dom);
    return dom;
  }

  ko.once = function(observable, callback) {
    var subscription = observable.subscribe(function(newValue) {
      callback(newValue);
      subscription.dispose();
    });
  }

});
