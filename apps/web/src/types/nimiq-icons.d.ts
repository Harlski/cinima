declare module "nimiq-icons/icons.json" {
  type IconEntry = {
    body: string;
    width?: number;
    height?: number;
  };

  const data: {
    icons: Record<string, IconEntry>;
  };
  export default data;
}
