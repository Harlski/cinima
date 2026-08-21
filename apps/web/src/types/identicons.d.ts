declare module "@nimiq/identicons/dist/identicons.bundle.min.js" {
  const Identicons: {
    toDataUrl(text: string): Promise<string>;
    svg(text: string): Promise<string>;
    render(text: string, el: Element): Promise<void>;
  };
  export const IdenticonsAssets: string;
  export default Identicons;
}
