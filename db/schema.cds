namespace psychic.giggle;

entity Messages {
  key ID : UUID;
  text   : String(255);
  createdAt : Timestamp @cds.on.insert: $now;
}
