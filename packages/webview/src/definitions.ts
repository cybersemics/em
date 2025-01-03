export interface WebviewBackgroundPlugin {
  changeBackgroundColor(options: { color: string }): Promise<void>;
}
