# FOMO V6.2 backend status

The current FOMO Supabase project (`nmkyhzyytowakwmphefc`) has already received the V6.2 database migration. The authenticated `send-fomo-push` Edge Function is also deployed.

**Do not run `FOMO_V6_2_PATCH.sql` on the current project again just to start V6.2.** The patch is included as a source-of-truth/bootstrap file for another environment.

## New V6.2 backend objects

- `user_push_tokens`
- `notification_preferences`
- `user_interests`
- `user_blocks`
- `reports`
- `organizer_profiles`
- `event_social_invites`
- authenticated helper RPCs for blocked-user settings and private-event invitations
- block-aware profile/event/chat authorization

## Push deployment

The server function is `send-fomo-push` and requires a caller JWT. Service-role access remains server-side only. The client cannot submit arbitrary push text; the function checks that a matching recent in-app notification actually exists, builds the destination/text server-side, checks notification preferences, and then uses the recipient's stored push token.

Remote device push additionally requires the mobile app to be linked to an Expo EAS project so a project ID exists in the standalone/development build. This repository intentionally does not invent an EAS project ID.

## Organizer provisioning

Ordinary authenticated clients can read organizer metadata and update their own already-provisioned organizer metadata, but they cannot create/delete organizer records or create verification records. Provision real club/business organizers only through trusted backend/admin operations after the organization actually joins FOMO.
