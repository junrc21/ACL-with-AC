declare global {
  var testUtils: {
    createMockPlatformRequest: (platform: string, storeId?: string) => any;
  };
}

export {};
