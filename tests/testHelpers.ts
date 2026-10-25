export function setToolboxApi(value: object): void {
  Object.defineProperty(window, "toolboxAPI", {
    configurable: true,
    value,
  });
}

export function clearToolboxApi(): void {
  Reflect.deleteProperty(window, "toolboxAPI");
}
