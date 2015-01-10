describe("noQuery helper singleton", function() {
  it("has extend functionality", function() {
    var gaining = {},
      lending = { "foo": "bar" };

    noQuery.extend(gaining, lending);
    expect(gaining.foo).toEqual("bar");
  });
});

describe("Bookmark", function() {
  var testUrl = "/good/url",
    badUrl = "/bad/url";

  it("class exists", function() {
    expect(Bookmark).not.toBe(null);
  });

  describe("has the ability to test whether its URL is valid", function() {
    beforeEach(function() {
      jasmine.Ajax.install();
    });

    afterEach(function() {
      jasmine.Ajax.uninstall();
    });

    it("makes an Ajax request on instantiation", function() {
      var bm = new Bookmark({ url: testUrl }),
        mockedRequest = jasmine.Ajax.requests.mostRecent();

      expect(mockedRequest.url).toEqual(testUrl);
    });

    it("makes the status as 200 for a successful request", function() {
        var bm;

        jasmine.Ajax.stubRequest(testUrl).andReturn({
          "status": 200,
          "responseText": 'in spec response'
        });

        bm =  new Bookmark({ url: testUrl }),
        expect(bm.statusCode).toEqual(200);
    });

    it("builds a template based on an unsuccessful request", function(done) {
        var bm, htmlString,
          expectedString = '<tr id=><td><a href="/bad/url">  </a> </td><td name="status"></td><td class="checkbox"><input type="checkbox" parentId="" status="" name="selected" value=""></td></tr>';

        jasmine.Ajax.stubRequest(testUrl).andReturn({
          "status": 400,
          "responseText": 'Bad news'
        });

        bm = new Bookmark({ url: badUrl });
        bm.toHtml(function(htmlBody) {
          htmlString = htmlBody;
          expect(htmlString).toEqual(expectedString);
          done();
        });

        bm.toHtml().resolve();
    });
  });
});

describe("Container", function() {
  var c, trueRoot, subContainer,
  containerStub = {
    children: [
      { url: 'alpha'},
      { url: 'beta' },
      {
        children: [
          { url: 'sub1' },
          { url: 'sub2' },
          {
            children: [
          { url: 'subA1' },
          { url: 'subA2' },
            ]
          }
        ]
      }
    ]
  };

  beforeEach(function() {
    jasmine.Ajax.install();

      jasmine.Ajax.stubRequest('alpha').andReturn({
        "status": 200,
        "responseText": 'in alpha response'
      });

      jasmine.Ajax.stubRequest('beta').andReturn({
        "status": 400,
        "responseText": 'in beta response'
      });

      c = new Container([ containerStub ]);
      trueRoot = c.children[0];
      subContainer = trueRoot.containers()[0];
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it("finds all nested containers", function() {
    expect(c.containers().length).toEqual(3);
  });

  it("finds all nested bookmarks", function() {
    expect(c.bookmarks().length).toEqual(6);
  });
});

