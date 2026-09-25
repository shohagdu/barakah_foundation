-- Give every income category a default income account.
-- Creates the missing income accounts (4004–4007) and links categories that have none.
-- Safe to re-run: skips existing account codes and never overwrites a category's chosen account.

INSERT INTO `accounts` (`account_code`, `type`, `category`, `description`)
SELECT seed.code, 'income', seed.name, seed.name_bn FROM (
  SELECT '4004' AS code, 'Donation Income'      AS name, 'দান / অনুদান আয়' AS name_bn UNION ALL
  SELECT '4005',         'Bank Profit',                  'ব্যাংক মুনাফা'           UNION ALL
  SELECT '4006',         'Rent Income',                  'ভাড়া আয়'                UNION ALL
  SELECT '4007',         'Miscellaneous Income',         'বিবিধ আয়'
) seed
WHERE NOT EXISTS (SELECT 1 FROM `accounts` a WHERE a.account_code = seed.code);

UPDATE `income_categories` c
JOIN (
  SELECT 'Donation'          AS name, '4004' AS code UNION ALL
  SELECT 'Investment Profit',         '4001'         UNION ALL
  SELECT 'Late Fee',                  '4002'         UNION ALL
  SELECT 'Bank Profit',               '4005'         UNION ALL
  SELECT 'Rent Income',               '4006'         UNION ALL
  SELECT 'Miscellaneous',             '4007'
) m ON m.name = c.name
JOIN `accounts` a ON a.account_code = m.code AND a.type = 'income'
SET c.account_id = a.id
WHERE c.account_id IS NULL;
