# WEB-01 browser foundation acceptance

Use an ordinary test account and client-safe values from `.env.example`. Never paste a service-role key into the web environment.

## Start and responsive shell

1. Run `npm run web` and open the local address printed by Expo.
2. At desktop width, confirm the left navigation, constrained center column, and empty right-rail placeholders render without horizontal scrolling.
3. Confirm Home, Discover, Events, Messages, Notifications, Profile, Create, and Settings open the expected routes.
4. Narrow the browser below 920 pixels. Confirm the shell switches to the compact top and bottom navigation and content remains usable.

## Authentication and account boundaries

1. Log in with account A, refresh the browser, and confirm A remains logged in with the same profile and content.
2. Open Feed, Messages, Profile, and one event. Log out and confirm the welcome screen appears immediately.
3. While signed out, open a protected route directly and confirm it cannot reveal authenticated content.
4. Log in as account B without closing the tab. Confirm no profile, feed, message preview, notification, saved event, request, or private-event detail from A appears.
5. Refresh again, then log out. Confirm neither action creates a redirect loop.

## Initial shared routes

1. Home: switch between All and Friends, scroll naturally, and test a reaction and inline comment.
2. Discover: switch between All, Friends, and Public; confirm event cards open the correct event.
3. Events: check Upcoming, Going, Hosting, and Past; confirm Create opens the existing event flow.
4. Messages: open an existing conversation, start a new one, send a message, and confirm realtime updates.
5. Profile: confirm the current profile, counts, posts/events, and Settings route render correctly.

## Location privacy

1. As an unauthorized account, open a Request or Private event. Confirm only its approximate area appears and the exact address, exact coordinates, precise marker, and private event photos are absent.
2. Approve that account, refresh, and confirm the authorized details appear.
3. Remove access, refresh or foreground the tab, and confirm protected details disappear again.
4. Confirm Discover's WEB-01 list view never renders coordinates. The interactive browser map is intentionally deferred.

## Mobile regression

Run `TEST_THIS_FIRST.md` and `TEST_V6_3.md` on the same commit. In particular, confirm native maps, push notifications, haptics, media, the free-scrolling Feed, and private-location behavior remain unchanged.
