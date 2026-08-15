# Proximity-based conversations

Chat in the-crew is spatial: a Conversation forms automatically when inhabitants come within a fixed distance of each other, instead of channel- or room-based chat. Outside range you only see that a conversation is happening; in range you are auto-joined without history unless an existing member allows it.

**Considered options**: room-bounded chat (everyone in a Room shares one stream); global Crew-wide chat; both.

**Why**: proximity is what makes the Map feel like a *place* rather than a UI, and it keeps Agent perception tractable — an Agent only perceives its immediate vicinity. Positions are tracked regardless, so different radius models or channel overlays can be added later without a data-model change.
