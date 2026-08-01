-- Tracks the user lane a card was in immediately before it was moved into the
-- DELAYED or COMPLETED system lane, so a manual status change back to
-- TODO/IN_PROGRESS (or dragging the card out) can restore it there instead of
-- stranding it in a system lane. Set alongside status/lane_id in the same
-- setCardStatus update, cleared once the card leaves the system lane.

alter table cards add column pre_system_lane_id uuid references lanes (id) on delete set null;
