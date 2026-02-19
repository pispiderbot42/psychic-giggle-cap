using { psychic.giggle as db } from '../db/schema';

service HelloService @(path: '/api') {
  entity Messages as projection on db.Messages;
  entity RssFeeds as projection on db.RssFeeds;
}
