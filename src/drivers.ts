export class DriverSessionMap {
  private readonly registrationMap: Map<string, string[]> = new Map<
    string,
    string[]
  >();

  registerDriver(key: string, providerSessionGuid: string): void {
    this.registrationMap.set(key, [
      ...(this.registrationMap.get(key) || []),
      providerSessionGuid,
    ]);
  }

  getDrivers(key: string): string[] {
    console.log('Getitng drivers');
    return this.registrationMap.get(key) || [];
  }

  getKeys(): string[] {
    return Array.from(this.registrationMap.keys());
  }
}
