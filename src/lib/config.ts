export interface RiskConfig {
  feeBuffer: number
  mmrBuffer: number
  liquidation: {
    chunkSize: number
    cooldownMs: number
  }
  ws: {
    pushRateLimitPerSec: number
  }
}

export const defaultRiskConfig: RiskConfig = {
  feeBuffer: 0.0005,
  mmrBuffer: 0.001,
  liquidation: {
    chunkSize: 0.1, // 10% per chunk
    cooldownMs: 300,
  },
  ws: {
    pushRateLimitPerSec: 5,
  },
}


