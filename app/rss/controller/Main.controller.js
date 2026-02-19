sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/v4/ODataModel"
], function(Controller, MessageBox, MessageToast, JSONModel) {
  "use strict";
  
  return Controller.extend("rssreader.controller.Main", {
    
    onInit: function() {
      // Local state model
      var oStateModel = new JSONModel({
        items: [],
        selectedFeed: null,
        loading: false
      });
      this.getView().setModel(oStateModel, "state");
      
      // Load feeds from backend
      this._loadFeeds();
    },
    
    _loadFeeds: function() {
      var that = this;
      
      fetch("/api/RssFeeds")
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          var oModel = that.getView().getModel("app");
          oModel.setProperty("/feeds", data.value || []);
          
          // Auto-select first feed
          setTimeout(function() {
            var oList = that.byId("feedList");
            if (oList && oList.getItems().length > 0) {
              oList.setSelectedItem(oList.getItems()[0]);
              var sUrl = data.value[0]?.url;
              if (sUrl) {
                that._loadFeed(sUrl);
              }
            }
          }, 300);
        })
        .catch(function(err) {
          console.error("Failed to load feeds:", err);
        });
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
      var oStateModel = this.getView().getModel("state");
      var sUrl = oStateModel.getProperty("/selectedFeed");
      if (sUrl) {
        this._loadFeed(sUrl);
        MessageToast.show("Refreshing feed...");
      } else {
        MessageToast.show("Please select a feed first");
      }
    },
    
    onAddFeed: function() {
      var that = this;
      
      if (!this._oAddDialog) {
        this._oAddDialog = new sap.m.Dialog({
          title: "Add RSS Feed",
          contentWidth: "400px",
          content: [
            new sap.m.VBox({
              items: [
                new sap.m.Label({ text: "Feed Name", labelFor: "feedName" }),
                new sap.m.Input({ id: "feedName", placeholder: "e.g., My Blog" }),
                new sap.m.Label({ text: "Feed URL", labelFor: "feedUrl" }).addStyleClass("sapUiSmallMarginTop"),
                new sap.m.Input({ id: "feedUrl", placeholder: "https://example.com/feed.xml", type: "Url" })
              ]
            }).addStyleClass("sapUiSmallMargin")
          ],
          beginButton: new sap.m.Button({
            text: "Add",
            type: "Emphasized",
            press: function() {
              var sName = sap.ui.getCore().byId("feedName").getValue().trim();
              var sUrl = sap.ui.getCore().byId("feedUrl").getValue().trim();
              
              if (sName && sUrl) {
                that._createFeed(sName, sUrl);
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
    
    _createFeed: function(sName, sUrl) {
      var that = this;
      
      fetch("/api/RssFeeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: sName,
          url: sUrl
        })
      })
      .then(function(response) {
        if (!response.ok) throw new Error("Failed to create feed");
        return response.json();
      })
      .then(function() {
        MessageToast.show("Feed added!");
        that._loadFeeds();
      })
      .catch(function(err) {
        MessageBox.error("Failed to add feed: " + err.message);
      });
    },
    
    onDeleteFeed: function(oEvent) {
      var that = this;
      var oItem = oEvent.getSource().getParent();
      var oContext = oItem.getBindingContext("app");
      var sId = oContext.getProperty("ID");
      var sName = oContext.getProperty("name");
      
      MessageBox.confirm("Delete feed '" + sName + "'?", {
        title: "Confirm Delete",
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            that._deleteFeed(sId);
          }
        }
      });
    },
    
    _deleteFeed: function(sId) {
      var that = this;
      
      fetch("/api/RssFeeds(" + sId + ")", {
        method: "DELETE"
      })
      .then(function(response) {
        if (!response.ok && response.status !== 204) throw new Error("Failed to delete");
        MessageToast.show("Feed deleted!");
        that._loadFeeds();
        
        // Clear articles if deleted feed was selected
        that.getView().getModel("state").setProperty("/items", []);
      })
      .catch(function(err) {
        MessageBox.error("Failed to delete feed: " + err.message);
      });
    },
    
    onArticlePress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("state");
      var sLink = oContext.getProperty("link");
      if (sLink) {
        window.open(sLink, "_blank");
      }
    },
    
    _loadFeed: function(sUrl) {
      var that = this;
      var oStateModel = this.getView().getModel("state");
      
      oStateModel.setProperty("/loading", true);
      oStateModel.setProperty("/selectedFeed", sUrl);
      oStateModel.setProperty("/items", []);
      
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
          var oItems = oDoc.querySelectorAll("item");
          if (oItems.length === 0) {
            oItems = oDoc.querySelectorAll("entry");
          }
          
          oItems.forEach(function(item) {
            var title = item.querySelector("title");
            var link = item.querySelector("link");
            var description = item.querySelector("description, summary, content");
            var pubDate = item.querySelector("pubDate, published, updated");
            
            var sLink = link ? (link.getAttribute("href") || link.textContent) : "";
            var sDesc = description ? description.textContent : "";
            sDesc = sDesc.replace(/<[^>]*>/g, "").substring(0, 300);
            
            aItems.push({
              title: title ? title.textContent : "No title",
              link: sLink,
              description: sDesc,
              pubDate: pubDate ? that._formatDate(pubDate.textContent) : ""
            });
          });
          
          oStateModel.setProperty("/items", aItems);
          oStateModel.setProperty("/loading", false);
          
          if (aItems.length === 0) {
            MessageToast.show("No articles found in this feed");
          }
        })
        .catch(function(err) {
          oStateModel.setProperty("/loading", false);
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
