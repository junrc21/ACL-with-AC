describe('Basic Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
