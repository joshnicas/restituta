-- Question-attempt XP is pending level progress and is only rewarded after
-- passing the level. Remove the legacy immediate attempt credits.
DELETE FROM "user_reward_ledger"
WHERE "sourceType" = 'ATTEMPT';
