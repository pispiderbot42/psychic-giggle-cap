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
      // App state model
      var oAppModel = new JSONModel({
        items: [],
        selectedFeed: null,
        loading: false
      });
      this.getView().setModel(oAppModel, "app");
      
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
          var aFeeds = data.value || [];
          that.getView().getModel("app").setProperty("/feeds", aFeeds);
          
          // Auto-select first feed
          setTimeout(function() {
            var oList = that.byId("feedList");
            if (oList && oList.getItems().length > 0) {
              oList.setSelectedItem(oList.getItems()[0]);
              var sUrl = aFeeds[0]?.url;
              if (sUrl) {
                that._loadFeedContent(sUrl);
              }
            }
          }, 300);
        })
        .catch(function(err) {
          console.error("Failed to load feeds:", err);
          // Fallback to empty
          that.getView().getModel("app").setProperty("/feeds", []);
        });
    },
    
    onNavBack: function() {
      window.location.href = "/";
    },
    
    onFeedSelect: function(oEvent) {
      var oItem = oEvent.getParameter("listItem");
      var sUrl = oItem.getBindingContext("app").getProperty("url");
      this._loadFeedContent(sUrl);
    },
    
    onRefresh: function() {
      var oModel = this.getView().getModel("app");
      var sUrl = oModel.getProperty("/selectedFeed");
      if (sUrl) {
        this._loadFeedContent(sUrl);
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
          "Content-Type": "application/json;odata.metadata=minimal",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: sName,
          url: sUrl
        })
      })
      .then(function(response) {
        if (!response.ok) {
          return response.text().then(function(text) {
            console.error("Server error:", text);
            throw new Error(text || "Failed to create feed");
          });
        }
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
      var oButton = oEvent.getSource();
      // Navigate up to find the CustomListItem
      var oItem = oButton.getParent().getParent();
      var oContext = oItem.getBindingContext("app");
      var sId = oContext.getProperty("ID");
      var sName = oContext.getProperty("name");
      
      MessageBox.confirm("Delete feed '" + sName + "'?", {
        title: "Confirm Delete",
        onClose: function(oAction) {
          if (oAction === MessageBox.Action.OK) {
            that._deleteFeed(sId);
          }
        }
      });
    },
    
    _deleteFeed: function(sId) {
      var that = this;
      
      fetch("/api/RssFeeds/" + sId, {
        method: "DELETE"
      })
      .then(function(response) {
        if (!response.ok && response.status !== 204) {
          throw new Error("Failed to delete feed");
        }
        MessageToast.show("Feed deleted");
        that._loadFeeds();
      })
      .catch(function(err) {
        MessageBox.error("Failed to delete feed: " + err.message);
      });
    },
    
    onArticlePress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("app");
      var sLink = oContext.getProperty("link");
      if (sLink) {
        window.open(sLink, "_blank");
      }
    },
    
    _loadFeedContent: function(sUrl) {
      var that = this;
      var oModel = this.getView().getModel("app");
      
      oModel.setProperty("/loading", true);
      oModel.setProperty("/selectedFeed", sUrl);
      oModel.setProperty("/items", []);
      
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
