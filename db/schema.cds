namespace psychic.giggle;

entity Messages {
  key ID : UUID;
  text   : String(255);
  createdAt : Timestamp @cds.on.insert: $now;
}

entity RssFeeds {
  key ID        : UUID @cds.on.insert: $uuid;
  name          : String(100) @mandatory;
  url           : String(500) @mandatory;
  createdAt     : Timestamp @cds.on.insert: $now;
  modifiedAt    : Timestamp @cds.on.insert: $now @cds.on.update: $now;
}
