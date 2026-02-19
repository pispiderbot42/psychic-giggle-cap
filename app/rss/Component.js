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
      
      // Initialize app state model (feeds loaded by controller from backend)
      var oAppModel = new JSONModel({
        feeds: [],
        items: [],
        selectedFeed: null,
        loading: false
      });
      this.setModel(oAppModel, "app");
    }
  });
});
