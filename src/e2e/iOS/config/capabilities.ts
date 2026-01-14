/**
 * Common base capability properties for iOS Safari testing.
 */
export const baseIOSCapability = {
  platformName: 'iOS' as const,
  browserName: 'Safari' as const,
  'appium:automationName': 'XCUITest' as const,
}

/**
 * Creates a base iOS Safari capability with the specified device name.
 * @param deviceName - The device name (default: 'iPhone 15 Plus').
 * @returns Base capability object.
 */
function capabilities(deviceName: string = 'iPhone 15 Plus') {
  return {
    ...baseIOSCapability,
    'appium:deviceName': deviceName,
  }
}

export default capabilities
