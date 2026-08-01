-- Reorders the two system lanes so COMPLETED renders immediately after user
-- lanes and DELAYED renders last (system lanes sort by position among
-- themselves; lower position renders first). Per the 2026-08-01 frontend
-- audit: the "trophy shelf" (COMPLETED) should sit closer to active work,
-- the "needs attention" pile (DELAYED) trails behind. Values only, no shape
-- change: both remain below 0 so they continue to sort before all user
-- lanes (position >= 0).

update lanes set position = -2 where system_type = 'completed';
update lanes set position = -1 where system_type = 'delayed';
