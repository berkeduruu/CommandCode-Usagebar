import {
  RawCreditsResponse,
  RawSummaryResponse,
  RawUsageRecord,
} from '../src/api/client';

export const creditsFixture: RawCreditsResponse = {
  credits: {
    belowThreshold: false,
    creditThreshold: 0,
    monthlyCredits: 69.8006538875,
    purchasedCredits: 0,
    premiumMonthlyCredits: 0,
    openSourceMonthlyCredits: 69.8006538875,
  },
  windowLimits: {
    limited: true,
    exceeded: null,
    fiveHour: {
      used: 0.1993461125,
      cap: 14,
      exceeded: false,
      resetAt: 1787523943690,
    },
    weekly: {
      used: 0.1993461125,
      cap: 35,
      exceeded: false,
      resetAt: 1788110743649,
    },
  },
};

export const summaryFixture: RawSummaryResponse = {
  totalCount: 6,
  totalCost: 0.1993461125,
  averageCost: 0.03322435208333333,
  successRate: 100,
  completedCount: 6,
  failedCount: 0,
  totalTokensIn: 146592,
  totalTokensOut: 517,
  totalTokens: 147109,
  totalCredits: 0.1993461125,
  totalFreeCredits: 0,
  totalMonthlyCredits: 0.1993461125,
  periodBasis: 'billing-period',
};

export const usageFixtures: RawUsageRecord[] = [
  {
    id: 'usage-luna',
    createdAt: '2026-08-23T17:54:21.775Z',
    tokensIn: '7',
    tokensOut: '13',
    tokensTotal: '20',
    creditsTotal: '0.000017',
    durationTotal: '727',
    status: 'completed',
    meta: {
      totalCost: 0.000017,
      inputCost: 0.0000014,
      outputCost: 0.0000156,
      cacheCost: 0,
      model: 'gpt-5.6-luna',
      planPoolDraw: 0.0000595,
      planId: 'individual-goat',
      provider: 'openrouter',
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    type: 'api',
    mode: 'api',
  },
  {
    id: 'usage-gemini',
    createdAt: '2026-08-23T17:29:40.861Z',
    tokensIn: '146274',
    tokensOut: '155',
    tokensTotal: '146429',
    creditsTotal: '0.11028675',
    durationTotal: '8604',
    status: 'completed',
    meta: {
      totalCost: 0.11028675,
      inputCost: 0.1097055,
      outputCost: 0.00058125,
      cacheCost: 0,
      model: 'google/gemini-3.7-flash',
      planPoolDraw: 0.1930018125,
      planId: 'individual-goat',
      provider: 'openrouter',
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    type: 'api',
    mode: 'api',
  },
];
