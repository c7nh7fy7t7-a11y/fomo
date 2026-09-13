# Map menu polish — device checks

Use the existing test accounts and events. This update requires no database
changes or reseeding.

- Open the Discover bottom tab. Switch All, Friends, and Public; verify the
  event count, markers, and list match the selected filter. Check an empty
  Friends list and its Show all events action.
- Tap a pin: its event should be selected and revealed in the list. Tap an
  event's title/thumbnail: the map should center on its permitted location.
  Confirm Details and the existing long press open the correct event.
- Expand the list, scroll to its last event, choose Show map, hide it with X,
  and choose Show list. Verify the privacy notice, list, and bottom navigation
  stay clear of each other on a small phone.
- Check a long title, long date/time, long location, cover image, and missing
  cover. Text must remain readable and photos must not stretch.
- With an unauthorized account, a Request/Private event must show only its
  approximate area and marker. Repeat as an approved attendee: the permitted
  exact location should appear. Revoke access and refresh; selection must not
  keep an old exact address or camera target.
- Enable Reduce Motion and locate an event again. The camera should move
  immediately without an animated pan.
- Repeat on iPhone and Android. Confirm map gestures and list scrolling work,
  and return to Home to check natural Feed scrolling.

Automated validation: TypeScript, Weekly Rotation tests, iOS/Android bundles,
and synthetic component checks for filter actions, event routing, tray sizing,
and authorized/unauthorized/revoked address, marker, and camera outputs.
The synthetic checks do not replace native device or live two-account testing.
