import type { FomoEvent } from '@/data/seed';

type LocationEvent = Pick<
  FomoEvent,
  | 'hostId'
  | 'cohostIds'
  | 'attendeeIds'
  | 'location'
  | 'latitude'
  | 'longitude'
  | 'exactLocation'
  | 'exactLatitude'
  | 'exactLongitude'
>;

export const canViewerSeeExactEventLocation = (
  event: LocationEvent,
  viewerId?: string | null,
) => Boolean(
  viewerId
  && (
    event.hostId === viewerId
    || (event.cohostIds ?? []).includes(viewerId)
    || event.attendeeIds.includes(viewerId)
  )
);

export const eventLocationForViewer = (
  event: LocationEvent,
  viewerId?: string | null,
) => {
  const canSeeExact = canViewerSeeExactEventLocation(event, viewerId);
  const exactLatitude = event.exactLatitude;
  const exactLongitude = event.exactLongitude;
  const hasExactCoordinates = typeof exactLatitude === 'number'
    && Number.isFinite(exactLatitude)
    && typeof exactLongitude === 'number'
    && Number.isFinite(exactLongitude);
  const showsExactCoordinates = canSeeExact && hasExactCoordinates;

  return {
    canSeeExact,
    hasExactCoordinates,
    showsExactCoordinates,
    latitude: showsExactCoordinates ? exactLatitude : event.latitude,
    longitude: showsExactCoordinates ? exactLongitude : event.longitude,
    label: canSeeExact ? (event.exactLocation ?? event.location) : event.location,
  };
};
