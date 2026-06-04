import { routeFromNotificationData } from '@/utils/notificationRouting';

describe('routeFromNotificationData', () => {
  it('routes to channel with communityId query param when both are present', () => {
    expect(routeFromNotificationData({ channel_id: 'ch-1', community_id: 'com-1' })).toBe(
      '/channel/ch-1?communityId=com-1',
    );
  });

  it('routes to channel without query param when community_id is absent', () => {
    expect(routeFromNotificationData({ channel_id: 'ch-1' })).toBe('/channel/ch-1');
  });

  it('routes to event when event_id is present', () => {
    expect(routeFromNotificationData({ event_id: 'ev-1' })).toBe('/event/ev-1');
  });

  it('routes to community when community_id is present', () => {
    expect(routeFromNotificationData({ community_id: 'com-1' })).toBe('/community/com-1');
  });

  it('prefers channel_id over event_id and community_id, includes communityId param', () => {
    expect(
      routeFromNotificationData({ channel_id: 'ch-1', event_id: 'ev-1', community_id: 'com-1' }),
    ).toBe('/channel/ch-1?communityId=com-1');
  });

  it('prefers event_id over community_id when channel_id is absent', () => {
    expect(routeFromNotificationData({ event_id: 'ev-1', community_id: 'com-1' })).toBe(
      '/event/ev-1',
    );
  });

  it('returns null for empty data', () => {
    expect(routeFromNotificationData({})).toBeNull();
  });

  it('returns null when id fields are not strings', () => {
    expect(routeFromNotificationData({ channel_id: 123 })).toBeNull();
    expect(routeFromNotificationData({ event_id: null })).toBeNull();
  });
});
