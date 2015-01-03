function Bookmark(data) {
  this.raw = data;
  $.extend(this, data);
}

Bookmark.prototype = {
  isValid: function() {
    return true;
  }
}

function Container(data) {
  $.extend(this, data);
  this.raw = data;
  this.children = this._calculateChildren();
}

Container.prototype = {
  bookmarks: function() {
    var accumulator;
    this._bookmarks(accumulator = []);
    return this._sanitizeBookmarks(accumulator);
  },

  containers: function() {
    var accumulator;
    this._containers(accumulator = []);
    return this._sanitizeContainers(accumulator);
  },

  _sanitizeBookmarks: function(bookmarks) {
    function isNotScriptlet(url) {
      return !url.match(/^javascript/);
    }

    return bookmarks.filter(function(bookmark) {
      return isNotScriptlet(bookmark.url);
    });
  },

  _sanitizeContainers: function(containers) {
    return containers.filter(function(container) {
      return (container.title != "");
    });
  },

  _containers: function(_c) {
    this.children.forEach(function(node) {
      if (node instanceof Container) {
        _c.push(node);
        node._containers(_c)
      }
    }.bind(this));
  },

  _bookmarks: function(_c) {
    this.children.forEach(function(node) {
      if ((node.title != "") && typeof(node.children) == "undefined") {
        _c.push(node);
      }
    }.bind(this));
  },

  _calculateChildren: function() {
    if (this.raw instanceof(Array)) {
      return this.raw.map(function(childNode) {
        return new Container(childNode);
      }.bind(this));
    } else if (this.raw.children.length > 0) {
      return this.raw.children.map(function(child) {
        if (typeof(child.url) === "undefined") {
          return new Container(child);
        } else {
          return new Bookmark(child);
        }
      }.bind(this));
    }
    throw {
      message: "Expected Container to be initialized with children that were enumerable; they were not.",
      name: "UnclassifiedChildrenCollectionType"
    }
  }
}
function View(selector) {
  this._initControls();
}

View.prototype = {
  draw: function(data) {
    data.bookmarks.containers().forEach(function(container) {
      $("#bookmarks").append([
        '<tr class="info" id="',
        container.id,
        '"><td colspan="3"> <b>',
        container.title,
        '</b></td></tr>'
      ].join(''));
      container.bookmarks().forEach(function(bm) {
        this._urlTesting(bm);
      }.bind(this));
    }.bind(this));
  },

  _initControls: function() {
    this._initSelectionControls();
    this._initCleaningControl();
  },

  _initSelectionControls: function() {
    var links = [
      { selector: "#threehun", text: "300s", inputsSelector: "form input:checkbox[status^=3]" },
      { selector: "#fourhun", text: "400s", inputsSelector: "form input:checkbox[status^=4]"  },
      { selector: "#fivehun", text: "500s", inputsSelector: "form input:checkbox[status^=5]"  },
      { selector: "#generics", text: "Generic Errors", inputsSelector: "form input:checkbox[status^=0]"  }
    ];

    links.forEach(function(clickBehaviorSpecifier) {
      $(clickBehaviorSpecifier.selector).on("click", function(e) {
        if (
          typeof($(e.target)).data('toggled') == "undefined" ||
            $(e.target).data('toggled') === false
        ) {
          $(e.target).data('toggled', true);
          $(e.target).text("Deselect " + clickBehaviorSpecifier.text);
          $(clickBehaviorSpecifier.inputsSelector).prop("checked", true);
        } else {
          $(e.target).text("Select " + clickBehaviorSpecifier.text);
          $(e.target).data('toggled', false);
          $(clickBehaviorSpecifier.inputsSelector).prop("checked", false);
        }
      });
    });
  },

  _initCleaningControl: function() {
    $( "#clean").click(function() {
      var checkedLength = $( "input:checked" ).length
      if (checkedLength < 1) {
        $( "#delwarning" ).text("You haven't selected any bookmarks to delete.")
        $( "#dialog" ).dialog({
          buttons: [{
            text: "Close",
            click: function() {
              $( this ).dialog( "close" );
            }
          }
          ]
        });
      }
      else {
        $( "#delwarning" )
          .text("This will delete " +
                checkedLength +
                " bookmarks. Are you sure you want to do this?")
        $( "#dialog" ).dialog({
          buttons: [
            {
              text: "I'm sure.",
              click: function() {
                $( this ).dialog( "close" );
                for (var i=0; i < checkedLength; i++) {
                  var badBookmark = $( "input:checked" )[i].value;
                  //chrome.bookmarks.remove(String(badBookmark))
                  $('#'+badBookmark).remove();
                };
              }
          },
          {
            text: "Nope, get me out of here.",
            click: function() {
              $( this ).dialog( "close" );
            }
          }]
        });
      };
    });
  },

  _urlTesting: function(obj) {
    var obj = obj,
      view = this;

    $.ajax({
      url: obj.url,
      type: 'GET',
    })
    .then(function(data, statusText, jqXHR){
      view._tableRow(obj, jqXHR)
    })
    .fail(function(jqXHR, statusText) {
      view._tableRow(obj, jqXHR)
    });
  },

  _tableRow: function(obj, jqXHR) {
    $('#'+obj.parentId).after([
      '<tr id=',
      obj.id,
      '><td><a href="',
      obj.url,
      '"> ',
      obj.title,
      ' </a> </td><td name="status">',
      jqXHR.status,
      '</td><td class="checkbox"><input type="checkbox" parentId="',
      obj.parentId,
      '" status="',
      jqXHR.status,
      '" name="selected" value="',
      obj.id,
      '"></td></tr>'
    ].join(''));
  }
};

function Controller(view) {
  this.view = view;

  this.bookmarks = [];
}

Controller.prototype = {
  addBookmarks: function(newBookmarks) {
    this.bookmarks = new Container(newBookmarks);
    this.view.draw(this);
  }
}

$(document).ready(function(){
  chrome.bookmarks.getTree(function(bookmarkCollection) {
    new Controller(new View()).addBookmarks(bookmarkCollection);
  });
});
