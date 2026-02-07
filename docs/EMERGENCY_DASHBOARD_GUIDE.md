# Emergency Response Dashboard - User Guide

## Overview

The Emergency Response Dashboard is a real-time monitoring interface for OpsTower operators to manage SOS emergency alerts from drivers and passengers. The dashboard provides instant visibility into active emergencies, location tracking, and quick action buttons for emergency response.

**Issue**: #12 - Emergency System Enhancement
**Location**: `/emergency/dashboard`
**Access**: Operators and Admin users only

## Features

### 1. Real-Time Emergency Alerts ✅
- **Auto-refresh**: Updates every 5 seconds automatically
- **Sound alerts**: Plays audio notification when new emergencies arrive
- **Browser notifications**: Desktop notifications for critical alerts
- **Visual indicators**: Red pulsing badges for active emergencies
- **Status tracking**: 7 status levels from triggered to resolved

### 2. Interactive Map View ✅
- **Emergency locations**: Red markers for active, green for resolved
- **Click-to-view**: Click any marker to see full details
- **Auto-center**: Map centers on selected emergency
- **Real-time updates**: Location trail updates automatically
- **Legend**: Clear visual guide for marker types

### 3. Quick Action Buttons ✅
- **View Details**: Opens comprehensive modal with full history
- **Call**: Initiates phone call to reporter or emergency contacts
- **Update Status**: Acknowledge, respond, resolve emergencies
- **Export**: Download CSV report of all alerts

### 4. Advanced Filtering ✅
- **Status filter**: All, Triggered, Processing, Dispatched, Acknowledged, Responding, Resolved, False Alarm
- **Type filter**: Medical, Security, Accident, Fire, Natural Disaster, Kidnapping, Violence, General
- **Reporter filter**: Driver or Passenger
- **Time range**: Last hour, 6 hours, 24 hours, or week
- **Search**: By SOS code, booking ID, user ID, or phone number

### 5. Quick Statistics Panel ✅
- **Active count**: Number of unresolved emergencies
- **Responding count**: Emergencies with responders en route
- **Resolved count**: Total resolved in last 24 hours
- **Avg Response Time**: Average time to first acknowledgment
- **Avg Resolution Time**: Average time from trigger to resolution

### 6. Emergency History Table ✅
- **Sortable columns**: Click column headers to sort
- **Pagination**: 10 alerts per page
- **Quick view**: View details without leaving the page
- **Full data**: All emergency information in one table

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ Emergency Response Dashboard            🔴 3 Active     │
├───────────┬─────────────────────────────────────────────┤
│ FILTERS   │          ACTIVE ALERTS                      │
│ & STATS   │  🚨 SOS-2024-001                            │
│           │     Driver: Juan Dela Cruz                  │
│ Active: 3 │     Makati CBD, Manila                      │
│ Resolved: │     2 min ago                               │
│   45      │     [View] [Call]                           │
│           │                                             │
│ Avg Time: │  🚨 SOS-2024-002                            │
│   2.5min  │     Passenger: Maria Santos                 │
│           │     Quezon City                             │
│ [Filters] │     5 min ago                               │
│           │     [View] [Call]                           │
│ [Export]  ├─────────────────────────────────────────────┤
│           │          MAP VIEW                           │
│           │  ┌─────────────────────────────────────────┐│
│           │  │  [Interactive Leaflet Map]              ││
│           │  │  📍 = Active Emergency (Red)            ││
│           │  │  ✅ = Resolved (Green)                  ││
│           │  │  Metro Manila, Philippines              ││
│           │  └─────────────────────────────────────────┘│
│           ├─────────────────────────────────────────────┤
│           │     EMERGENCY HISTORY (24h)                 │
│           │  Time    | SOS Code  | Type    | Status    │
│           │  10:15am | SOS-002   | Medical | Resolved  │
│           │  09:42am | SOS-001   | Accident| Resolved  │
│           │  [Pagination: 1 2 3 4 5]                    │
└───────────┴─────────────────────────────────────────────┘
```

## Emergency Status Flow

```
triggered → processing → dispatched → acknowledged → responding → resolved
                                                                  ↓
                                                            false_alarm
```

### Status Definitions

1. **Triggered**: SOS button pressed, system processing
2. **Processing**: Alert sent to operators, notifications dispatched
3. **Dispatched**: Emergency services notified
4. **Acknowledged**: Operator has acknowledged the emergency
5. **Responding**: Emergency responders are en route
6. **Resolved**: Emergency successfully resolved
7. **False Alarm**: Confirmed as accidental trigger

## Using the Dashboard

### Responding to New Emergency

1. **Alert arrives**: Dashboard plays sound, shows notification
2. **Review details**: Click "View Details" on the alert card
3. **Assess situation**: Read description, check location, view reporter info
4. **Take action**:
   - Click "Acknowledge" to confirm you're handling it
   - Click "Call" to contact reporter or emergency contacts
   - Update status as responders arrive
5. **Resolve**: Enter resolution notes and mark as resolved

### Emergency Details Modal

The details modal shows complete emergency information:

**Overview Tab**:
- Emergency type and severity
- Reporter information (name, phone, type)
- Location with Google Maps link
- Description from reporter
- Processing and response time metrics

**Timeline Tab**:
- Location trail (breadcrumb history)
- Battery level and speed at each point
- Full location history with timestamps

**Contacts Tab**:
- Emergency contacts notified
- Notification delivery status (SMS, Email, Call)
- All system notifications sent

**Actions Tab**:
- Acknowledge emergency
- Mark as responding
- Resolve with notes
- Mark as false alarm

### Quick Actions

**Call Button**:
- Initiates phone call to reporter's phone number
- Uses system default phone app (mobile) or tel: link (desktop)
- Emergency contacts can also be called from details modal

**Update Status**:
- Acknowledge: Mark that you're handling the emergency
- Responding: Emergency responders are en route
- Resolve: Emergency is resolved (requires notes)
- False Alarm: Accidental trigger

**Export CSV**:
- Downloads full emergency history
- Includes all fields: time, type, location, status, response time
- Filename: `emergency-alerts-YYYY-MM-DD.csv`

## Advanced Features

### Auto-Refresh Control

Toggle auto-refresh ON/OFF in the header:
- **ON**: Refreshes every 5 seconds (recommended)
- **OFF**: Manual refresh only (useful for detailed review)

### Sound Alerts

Toggle sound ON/OFF:
- **ON**: Plays audio when new emergencies arrive
- **OFF**: Silent mode (visual indicators only)

### Map Navigation

- **Zoom**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag to move around
- **Click marker**: Opens popup with emergency details
- **View Details button**: Opens full details modal

### Filtering for Specific Emergencies

**Find medical emergencies in last hour**:
1. Set Status: "All"
2. Set Type: "Medical Emergency"
3. Set Time Range: "Last Hour"
4. Click "Apply Filters"

**Find all active driver emergencies**:
1. Set Status: "Triggered"
2. Set Reporter Type: "Driver"
3. Set Time Range: "Last 24 Hours"

**Search by SOS code**:
1. Enter SOS code in search box (e.g., "SOS-2024-001")
2. Results update automatically

## Performance Targets

### Response Time Targets
- **Processing**: < 5 seconds from trigger to dispatch
- **Response**: < 2.5 minutes to first acknowledgment
- **Resolution**: < 30 minutes average

### Success Metrics
- **Uptime**: 99.9% availability
- **Auto-refresh**: Every 5 seconds
- **Map load**: < 2 seconds
- **Details modal**: < 1 second

## Keyboard Shortcuts

- **R**: Refresh dashboard
- **F**: Toggle filters
- **S**: Toggle sound alerts
- **M**: Focus on map
- **ESC**: Close modal

## Mobile Responsiveness

The dashboard is fully responsive:
- **Desktop**: Full 3-column layout with map
- **Tablet**: 2-column layout, collapsible filters
- **Mobile**: Single column, stacked components
- **Touch-friendly**: Large buttons and tap targets

## Troubleshooting

### Emergency Not Appearing

**Check**:
1. Filters may be too restrictive
2. Time range may be too narrow
3. Auto-refresh may be off
4. Try clicking "Refresh Now"

**Solution**: Reset filters to default

### Map Not Loading

**Check**:
1. Internet connection
2. Browser JavaScript enabled
3. Ad blocker not blocking map tiles

**Solution**: Reload page, check console for errors

### Sound Alerts Not Playing

**Check**:
1. Browser notifications enabled
2. Sound toggle is ON
3. System volume not muted
4. Browser autoplay policy (may require user interaction first)

**Solution**: Click anywhere on page to enable autoplay, toggle sound ON

### Details Modal Not Opening

**Check**:
1. JavaScript errors in console
2. Alert ID is valid
3. API endpoint is accessible

**Solution**: Refresh page, check network tab for errors

## API Endpoints Used

The dashboard uses these backend APIs:

```
GET  /api/emergency/alerts              - List all alerts with filters
GET  /api/emergency/alerts/:id          - Get single alert details
PUT  /api/emergency/alerts/:id          - Update alert status
GET  /api/emergency/contacts            - Get emergency contacts
```

## Browser Compatibility

**Supported Browsers**:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Required Features**:
- JavaScript enabled
- Cookies enabled
- LocalStorage available
- Notification API (optional)

## Security

**Access Control**:
- Operator role required
- Session timeout: 30 minutes
- Auto-logout on inactivity
- Audit trail logged for all actions

**Data Privacy**:
- PII encrypted at rest
- HTTPS required
- No data stored in browser
- Compliant with Philippine DPA

## Best Practices

### For Operators

1. **Keep dashboard open**: Have it visible at all times during shift
2. **Enable sound alerts**: Don't miss critical emergencies
3. **Acknowledge quickly**: Aim for <2 minute response time
4. **Add resolution notes**: Document what happened for records
5. **Call when needed**: Don't hesitate to call reporter for clarification
6. **Check location trail**: Verify movement patterns if suspicious

### For Administrators

1. **Monitor response times**: Track team performance metrics
2. **Review false alarms**: Identify patterns and user training needs
3. **Export reports**: Regular CSV exports for compliance
4. **Test regularly**: Verify all features work correctly
5. **Update procedures**: Keep emergency protocols current

## Related Documentation

- [Emergency System Architecture](./EMERGENCY_SYSTEM_ARCHITECTURE.md)
- [Multi-Channel Alert System](./MULTI_CHANNEL_ALERTS.md)
- [Emergency Contact Management](./EMERGENCY_CONTACTS.md)
- [Location Tracking System](./LOCATION_TRACKING.md)
- [Emergency API Reference](./EMERGENCY_API.md)

## Support

**Issues or Questions?**
- Technical support: support@opstower.ph
- Emergency hotline: +63 2 8888-8888
- Documentation: https://docs.opstower.ph

## Version History

- **v1.0.0** (2026-02-07): Initial release
  - Real-time monitoring dashboard
  - Interactive map with markers
  - Emergency details modal
  - Advanced filtering
  - CSV export
  - Mobile responsive design

---

**OpsTower Emergency Response Dashboard**
*Protecting our drivers and passengers, one alert at a time.*
