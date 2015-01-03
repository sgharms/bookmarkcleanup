noQuery = {
  extend: function(recipient, source) {
    for (var key in source) {
      if(source.hasOwnProperty(key)){
        recipient[key] = source[key];
      }
    }
  }
};

function Bookmark(data) {
  noQuery.extend(this, data);

  this._resolveValidityState();
}

Bookmark.prototype = {
  appendToParentContainer: function() {
    $('#'+this.parentId)
      .after(this.toHTML());
  },

  _resolveValidityState: function() {
    var bookmark = this;

    this.isValid = false;

    if (this.url.match(/^javascript/)) {
      return;
    }

    this.ajaxCallback = $.ajax({
      url: this.url,
      context: this,
      type: 'GET',
    })
    .then(function(data, statusText, jqXHR){
      this.isValid = true;
      this.status = jqXHR.status;
    })
    .fail(function(jqXHR, statusText) {
      this.isValid = false;
      this.status = jqXHR.status;
    })
  },

  toHTML: function() {
    return [
      '<tr id=',
      this.id,
      '><td><a href="',
      this.url,
      '"> ',
      this.title,
      ' </a> </td><td name="status">',
      this.status,
      '</td><td class="checkbox"><input type="checkbox" parentId="',
      this.parentId,
      '" status="',
      this.status,
      '" name="selected" value="',
      this.id,
      '"></td></tr>'
    ].join('');
  }
}

function Container(data) {
  noQuery.extend(this, data);
  this.raw = data;
  this.children = this._calculateChildren();
}

Container.prototype = {
  toHTML: function() {
    return [
      '<tr class="info" id="', this.id, '">',
        '<td colspan="3"> <b>', this.title, '</b></td>',
      '</tr>'
    ].join('');
  },

  bookmarks: function() {
    var accumulator;
    this._bookmarks(accumulator = []);
    return this._sanitizeBookmarks(accumulator);
  },

  bookmarksByAscendingDate: function() {
    return this.bookmarks().sort(function(a, b) {
      return b.dateAdded - a.dateAdded;
    });
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

  _containers: function(memo) {
    this.children.forEach(function(node) {
      if (node instanceof Container) {
        memo.push(node);
        node._containers(memo)
      }
    }.bind(this));
  },

  _bookmarks: function(memo) {
    this.children.forEach(function(node) {
      if ((node.title != "") && typeof(node.children) == "undefined") {
        memo.push(node);
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
};

function View(selector) {
  this.$selector = $(selector);

  this._initControls();
};

View.prototype = {
  draw: function(data) {
    this.$selector.empty();
    data.bookmarks.containers().forEach(function(container) {
      this.$selector.append(container.toHTML());
      container.bookmarksByAscendingDate().forEach(function(bookmark) {
        bookmark.appendToParentContainer();
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
        var $target = $(e.target);
        if (
          typeof($target).data('toggled') == "undefined" ||
            $target.data('toggled') === false
        ) {
          $target
            .data('toggled', true)
            .text("Deselect " + clickBehaviorSpecifier.text);
          $(clickBehaviorSpecifier.inputsSelector).prop("checked", true);
        } else {
          $target
            .data('toggled', false)
            .text("Select " + clickBehaviorSpecifier.text);
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
  }
};

function Controller(view) {
  this.view = view;

  this.bookmarks = [];
}

Controller.prototype = {
  addBookmarks: function(newBookmarks) {
    this.bookmarks = new Container(newBookmarks);
  },

  draw: function() {
    this.view.draw(this);
  }
};

$(document).ready(function(){
  var controller = new Controller(new View("#bookmarks"));

  chrome.bookmarks.getTree(function(bookmarkCollection) {
    controller.addBookmarks(bookmarkCollection);
  });

   $(document).on("ajaxComplete", function(){
     controller.draw();
   });
});
