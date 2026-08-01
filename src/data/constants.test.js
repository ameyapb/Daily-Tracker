import { describe, it, expect } from 'vitest'
import { CARD_STATUS, SYSTEM_LANE_TYPE, STATUS_TO_SYSTEM_LANE_TYPE } from './constants'

describe('STATUS_TO_SYSTEM_LANE_TYPE', () => {
  it('maps DELAYED status to the delayed system lane type', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.DELAYED]).toBe(SYSTEM_LANE_TYPE.DELAYED)
  })

  it('maps COMPLETED status to the completed system lane type', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.COMPLETED]).toBe(SYSTEM_LANE_TYPE.COMPLETED)
  })

  it('has no mapping for TODO or IN_PROGRESS, which have no system lane', () => {
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.TODO]).toBeUndefined()
    expect(STATUS_TO_SYSTEM_LANE_TYPE[CARD_STATUS.IN_PROGRESS]).toBeUndefined()
  })
})
