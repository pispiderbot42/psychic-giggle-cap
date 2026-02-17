sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";
  
  return UIComponent.extend("rssreader.Component", {
    metadata: {
      manifest: "json"
    },
    
    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      
      // Initialize feeds model with some default feeds
      var oFeedsModel = new JSONModel({
        feeds: [
          { name: "SAP News", url: "https://news.sap.com/feed/" },
          { name: "Hacker News", url: "https://hnrss.org/frontpage" },
          { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
          { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" }
        ],
        items: [],
        selectedFeed: null,
        loading: false
      });
      this.setModel(oFeedsModel, "app");
    }
  });
});
