import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateModelUsage,
  buildDailyUsage,
  normalizeQuota,
  normalizeUsageRecord as normalizeRecord,
  normalizeUsageRecord,
  summarizeUsageRecords,
} from '../src/api/commandcode';
import { normalizeUsageResponse } from '../src/api/client';
import { formatUsd, timestampMs } from '../src/format';
import { creditsFixture, summaryFixture, usageFixtures } from './fixtures';

test('normalizes rolling windows and monthly GOAT credits', () => {
  const quota = normalizeQuota(creditsFixture, summaryFixture, 1_000);

  assert.equal(quota.fiveHour.used, 0.1993461125);
  assert.equal(quota.fiveHour.cap, 14);
  assert.equal(quota.weekly.cap, 35);
  assert.equal(quota.monthly.used, 0.1993461125);
  assert.equal(quota.monthly.cap, 70);
  assert.equal(quota.monthly.remaining, 69.8006538875);
  assert.ok(Math.abs(quota.monthly.percent - 0.2847801607) < 0.000001);
  assert.equal(quota.fiveHour.resetAt, 1787523943690);
});

test('normalizes usage records and keeps plan draw separate from API cost', () => {
  const record = normalizeUsageRecord(usageFixtures[0]);

  assert.equal(record.model, 'gpt-5.6-luna');
  assert.equal(record.tokensTotal, 20);
  assert.equal(record.actualCost, 0.000017);
  assert.equal(record.planPoolDraw, 0.0000595);
  assert.equal(record.provider, 'openrouter');
});

test('accepts alternate usage envelopes and timestamp field names', () => {
  const response = normalizeUsageResponse({
    data: {
      items: usageFixtures,
      nextCursor: 'next-page',
    },
  });
  const record = normalizeRecord({
    created_at: 1787507661775,
    tokens_in: '2',
    tokens_out: '3',
    meta: {
      modelName: 'example-model',
      plan_pool_draw: 0.5,
    },
  });

  assert.equal(response.usages?.length, 2);
  assert.equal(response.nextCursor, 'next-page');
  assert.equal(record.createdAt, '2026-08-23T17:54:21.775Z');
  assert.equal(record.model, 'example-model');
  assert.equal(record.tokensTotal, 5);
  assert.equal(record.planPoolDraw, 0.5);
});

test('aggregates model requests, tokens and plan spend', () => {
  const records = usageFixtures.map(normalizeUsageRecord);
  const models = aggregateModelUsage(records);
  const gemini = models.find((model) => model.model === 'google/gemini-3.7-flash');

  if (!gemini) {
    throw new Error('Gemini fixture was not aggregated');
  }
  assert.equal(gemini.requests, 1);
  assert.equal(gemini.tokensTotal, 146429);
  assert.equal(gemini.actualCost, 0.11028675);
  assert.equal(gemini.planSpend, 0.1930018125);
  assert.equal(models[0].model, 'google/gemini-3.7-flash');
});

test('builds daily model data inside the selected range', () => {
  const records = usageFixtures.map(normalizeUsageRecord);
  const daily = buildDailyUsage(
    records,
    Date.parse('2026-08-23T00:00:00.000Z'),
    Date.parse('2026-08-23T23:59:59.999Z')
  );

  assert.deepEqual(daily.days, ['2026-08-23']);
  assert.equal(daily.tokensByModel['2026-08-23']['gpt-5.6-luna'], 20);
  assert.equal(
    daily.planSpendByModel['2026-08-23']['google/gemini-3.7-flash'],
    0.1930018125
  );
});

test('derives a fallback summary from loaded records', () => {
  const records = usageFixtures.map(normalizeUsageRecord);
  const summary = summarizeUsageRecords(records);

  assert.equal(summary.totalCount, 2);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.totalTokens, 146449);
  assert.equal(summary.totalMonthlyCredits, 0.1930613125);
});

test('formats ISO timestamps and small USD values safely', () => {
  assert.equal(timestampMs('2026-08-23T17:54:21.775Z'), 1787507661775);
  assert.equal(formatUsd(0.000017), '$0.000017');
  assert.equal(formatUsd(0), '$0.00');
});
