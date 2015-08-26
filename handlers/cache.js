var Dota2 = require("../index"),
    util = require("util");

var cacheTypeIDs = {
  LOBBY: 2004,
  PARTY: 2003,
  PARTY_INVITE: 2006
};

// Handlers
function handleSubscribedType(objType, objData)
{
  switch(objType)
  {
    // Lobby snapshot.
    case cacheTypeIDs.LOBBY:
      var lobby = Dota2.schema.CSODOTALobby.decode(objData);
      if(this.debug) util.log("Received lobby snapshot for lobby ID "+lobby.lobbyId);
      this.emit("practiceLobbyUpdate", lobby);
      this.Lobby = lobby;
      break;
    // Party snapshot.
    case cacheTypeIDs.PARTY:
      var party = Dota2.schema.CSODOTAParty.decode(objData);
      if(this.debug) util.log("Received party snapshot for party ID "+party.partyId);
      this.emit("partyUpdate", party);
      this.Party = party;
      break;
    // Party invite snapshot.
    case cacheTypeIDs.PARTY_INVITE:
      var party = Dota2.schema.CSODOTAPartyInvite.decode(objData);
      if(this.debug) util.log("Received party invite snapshot for group ID "+party.groupId);
      this.emit("partyInviteUpdate", party);
      this.PartyInvite = party;
      break;
    default:
      if(this.debug) util.log("Unknown cache ID: "+objType);
      break;
  }
};

Dota2.Dota2Client.prototype._handleWelcomeCaches = function handleWelcomeCaches(message)
{
  var welcome = Dota2.schema.CMsgClientWelcome.decode(message);
  var _self = this;

  if(welcome.outofdate_subscribed_caches)
    welcome.outofdate_subscribed_caches.forEach(function(cache){
      cache.objects.forEach(function(obj){
        handleSubscribedType.call(_self, obj.typeId, obj.objectData[0]);
      });
    });
};

var handlers = Dota2.Dota2Client.prototype._handlers;


handlers[Dota2.ESOMsg.k_ESOMsg_CacheSubscribed] = function onCacheSubscribed(message) {
  var subscribe = Dota2.schema.CMsgSOCacheSubscribed.decode(message);
  var _self = this;

  if(this.debug){
    util.log("Cache subscribed, type "+subscribe.objects[0].typeId);
  }

  subscribe.objects.forEach(function(obj){
    handleSubscribedType.call(_self, obj.typeId, obj.objectData[0]);
  });
};

handlers[Dota2.ESOMsg.k_ESOMsg_UpdateMultiple] = function onUpdateMultiple(message) {
  var multi = Dota2.schema.CMsgSOMultipleObjects.decode(message);
  var _self = this;

  if(multi.objectsModified)
    multi.objectsModified.forEach(function(obj){
      handleSubscribedType.call(_self, obj.typeId, obj.objectData[0]);
    });
};

handlers[Dota2.ESOMsg.k_ESOMsg_Create] = function onCreate(message) {
  var single = Dota2.schema.CMsgSOSingleObject.decode(message);
  var _self = this;
  
  if(this.debug){
    util.log("Create, type "+single.typeId);
  }
  handleSubscribedType.call(_self, single.typeId, single.objectData);
}

handlers[Dota2.ESOMsg.k_ESOMsg_CacheUnsubscribed] = function onCacheUnsubscribed(message) {
  var unsubscribe = Dota2.schema.CMsgSOCacheUnsubscribed.decode(message);
  var _self = this;

  if(this.debug) util.log("Cache unsubscribed, "+unsubscribe.ownerSoid.id);

  if(this.Lobby && unsubscribe.ownerSoid.id === this.Lobby.lobbyId)
  {
    this.Lobby = null;
    this.emit("practiceLobbyCleared");
  }else if(this.Party && unsubscribe.ownerSoid.id === this.Party.partyId)
  {
    this.Party = null;
    this.emit("partyCleared");
  }else if(this.PartyInvite && unsubscribe.ownerSoid.id === this.PartyInvite.groupId)
  {
    this.PartyInvite = null;
    this.emit("partyInviteCleared");
  }
};

handlers[Dota2.ESOMsg.k_ESOMsg_CacheDestroy] = function onCacheDestroy(message) {
  var destroy = Dota2.schema.CMsgSOSingleObject.decode(message);
  var _self = this;

  if(this.debug) util.log("Cache destroy, "+destroy.typeId);

  if(destroy.type_id === cacheTypeIDs.PARTY_INVITE)
  {
    this.PartyInvite = null;
    this.emit("partyInviteCleared");
  }
};
