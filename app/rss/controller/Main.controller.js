sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel"
], function(Controller, MessageBox, MessageToast, JSONModel) {
  "use strict";
  
  return Controller.extend("rssreader.controller.Main", {
    
    onInit: function() {
      // Auto-select first feed on load
      var that = this;
      setTimeout(function() {
        var oList = that.byId("feedList");
        if (oList && oList.getItems().length > 0) {
          oList.setSelectedItem(oList.getItems()[0]);
          that._loadFeed(that.getView().getModel("app").getProperty("/feeds/0/url"));
        }
      }, 500);
    },
    
    onNavBack: function() {
      window.location.href = "/";
    },
    
    onFeedSelect: function(oEvent) {
      var oItem = oEvent.getParameter("listItem");
      var sUrl = oItem.getBindingContext("app").getProperty("url");
      this._loadFeed(sUrl);
    },
    
    onRefresh: function() {
      var oModel = this.getView().getModel("app");
      var sUrl = oModel.getProperty("/selectedFeed");
      if (sUrl) {
        this._loadFeed(sUrl);
        MessageToast.show("Refreshing feed...");
      } else {
        MessageToast.show("Please select a feed first");
      }
    },
    
    onAddFeed: function() {
      var that = this;
      var oModel = this.getView().getModel("app");
      
      // Simple dialog for adding a feed
      if (!this._oAddDialog) {
        this._oAddDialog = new sap.m.Dialog({
          title: "Add RSS Feed",
          contentWidth: "400px",
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.Label({ text: "Feed Name", labelFor: "feedName" }),
                new sap.m.Input({ id: "feedName", placeholder: "e.g., My Blog" }),
                new sap.m.Label({ text: "Feed URL", labelFor: "feedUrl", class: "sapUiSmallMarginTop" }),
                new sap.m.Input({ id: "feedUrl", placeholder: "https://example.com/feed.xml", type: "Url" })
              ]
            }).addStyleClass("sapUiSmallMargin")
          ],
          beginButton: new sap.m.Button({
            text: "Add",
            type: "Emphasized",
            press: function() {
              var sName = sap.ui.getCore().byId("feedName").getValue();
              var sUrl = sap.ui.getCore().byId("feedUrl").getValue();
              
              if (sName && sUrl) {
                var aFeeds = oModel.getProperty("/feeds");
                aFeeds.push({ name: sName, url: sUrl });
                oModel.setProperty("/feeds", aFeeds);
                MessageToast.show("Feed added!");
                that._oAddDialog.close();
                sap.ui.getCore().byId("feedName").setValue("");
                sap.ui.getCore().byId("feedUrl").setValue("");
              } else {
                MessageToast.show("Please fill in both fields");
              }
            }
          }),
          endButton: new sap.m.Button({
            text: "Cancel",
            press: function() {
              that._oAddDialog.close();
            }
          })
        });
      }
      this._oAddDialog.open();
    },
    
    onArticlePress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("app");
      var sLink = oContext.getProperty("link");
      if (sLink) {
        window.open(sLink, "_blank");
      }
    },
    
    _loadFeed: function(sUrl) {
      var that = this;
      var oModel = this.getView().getModel("app");
      
      oModel.setProperty("/loading", true);
      oModel.setProperty("/selectedFeed", sUrl);
      oModel.setProperty("/items", []);
      
      // Fetch via our proxy to avoid CORS
      var sProxyUrl = "/rss/fetch?url=" + encodeURIComponent(sUrl);
      
      fetch(sProxyUrl)
        .then(function(response) {
          if (!response.ok) throw new Error("Failed to fetch feed");
          return response.text();
        })
        .then(function(xml) {
          var oParser = new DOMParser();
          var oDoc = oParser.parseFromString(xml, "application/xml");
          
          var aItems = [];
          
          // Try RSS 2.0 format
          var oItems = oDoc.querySelectorAll("item");
          if (oItems.length === 0) {
            // Try Atom format
            oItems = oDoc.querySelectorAll("entry");
          }
          
          oItems.forEach(function(item) {
            var title = item.querySelector("title");
            var link = item.querySelector("link");
            var description = item.querySelector("description, summary, content");
            var pubDate = item.querySelector("pubDate, published, updated");
            
            // Handle Atom link which uses href attribute
            var sLink = link ? (link.getAttribute("href") || link.textContent) : "";
            
            // Strip HTML from description
            var sDesc = description ? description.textContent : "";
            sDesc = sDesc.replace(/<[^>]*>/g, "").substring(0, 300);
            
            aItems.push({
              title: title ? title.textContent : "No title",
              link: sLink,
              description: sDesc,
              pubDate: pubDate ? that._formatDate(pubDate.textContent) : ""
            });
          });
          
          oModel.setProperty("/items", aItems);
          oModel.setProperty("/loading", false);
          
          if (aItems.length === 0) {
            MessageToast.show("No articles found in this feed");
          }
        })
        .catch(function(err) {
          oModel.setProperty("/loading", false);
          MessageBox.error("Failed to load feed: " + err.message);
        });
    },
    
    _formatDate: function(sDate) {
      try {
        var oDate = new Date(sDate);
        return oDate.toLocaleDateString() + " " + oDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } catch (e) {
        return sDate;
      }
    }
  });
});
