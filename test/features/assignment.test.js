const {initializeWithTab} = require("../common");
const {buildConfirmPage} = require("../common");

describe("Assignment Reopen Feature", function () {
  const url = "http://example.com";

  beforeEach(async function () {
    this.webExt = await initializeWithTab({
      cookieStoreId: "firefox-default",
      url
    });
  });

  afterEach(function () {
    this.webExt.destroy();
  });

  describe("click the 'Always open in' checkbox in the popup", function () {
    beforeEach(async function () {
      // popup click to set assignment for activeTab.url
      await this.webExt.popup.helper.clickElementById("always-open-in");
      await this.webExt.popup.helper.clickElementByQuerySelectorAll("#picker-identities-list > .menu-item");
    });

    it("should open the page in the assigned container", async function () {
      // should have created a new tab with the confirm page
      this.webExt.background.browser.tabs.create.should.have.been.calledWithMatch({
        active: true,
        cookieStoreId: "firefox-container-4",
        index: 1,
        openerTabId: null,
        url: "http://example.com"
      });
    });

  });

});

describe("Assignment Comfirm Page Feature", function () {
  const url = "http://example.com";

  beforeEach(async function () {
    this.webExt = await initializeWithTab({
      cookieStoreId: "firefox-container-4",
      url
    });
  });

  afterEach(function () {
    this.webExt.destroy();
  });

  describe("open new Tab with the assigned URL in the default container", function () {
    let newTab;
    beforeEach(async function () {
      await this.webExt.popup.helper.clickElementById("always-open-in");
      await this.webExt.popup.helper.clickElementByQuerySelectorAll("#picker-identities-list > .menu-item");

      // new Tab opening activeTab.url in default container
      newTab = await this.webExt.background.browser.tabs._create({
        cookieStoreId: "firefox-default",
        url
      }, {
        options: {
          webRequestError: true // because request is canceled due to reopening
        }
      });
    });

    it("should open the confirm page", async function () {
      // should have created a new tab with the confirm page
      this.webExt.background.browser.tabs.create.should.have.been.calledWithMatch({
        url: "moz-extension://fake/confirm-page.html?" +
               `url=${encodeURIComponent(url)}` +
               `&cookieStoreId=${this.webExt.tab.cookieStoreId}`,
        cookieStoreId: undefined,
        openerTabId: null,
        index: 2,
        active: true
      });
    });

    it("should remove the new Tab that got opened in the default container", function () {
      this.webExt.background.browser.tabs.remove.should.have.been.calledWith(newTab.id);
    });


    describe("Set assignment to 'never ask' ", function () {
      beforeEach(async function () {
        // click confirm page to always open in container
        const confirmPage = await buildConfirmPage("moz-extension://fake/confirm-page.html?" + 
          `url=${encodeURIComponent(url)}` +
          `&cookieStoreId=${this.webExt.tab.cookieStoreId}`, this.webExt.browser);

        confirmPage.document.getElementById("never-ask").click();
        const event = new confirmPage.window.Event("submit");
        event.explicitOriginalTarget = confirmPage.document.getElementById("confirm");
        confirmPage.document.getElementById("redirect-form").dispatchEvent(event);
      });

      describe("open new Tab with url set to 'never ask' ", function () {
        beforeEach(async function () {
        // new Tab trying to open url in default container
          this.webExt.background.browser.tabs.create.resetHistory();
          await this.webExt.background.browser.tabs._create({
            cookieStoreId: "firefox-default",
            url
          });
          const tabs = await this.webExt.background.browser.tabs.query({});
          console.log("tabs", tabs);
        });

        it("should not open the confirm page", async function () {
          // should have created a new tab with the assigned url
          this.webExt.background.browser.tabs.create.should.have.been.calledWithMatch({
            url,
            cookieStoreId: "firefox-container-4",
            openerTabId: null,
            index: 3,
            active: true
          });
        });
      });
    });
  });
});
