declare module '@modelcontextprotocol/sdk/types.js' {
  export interface Tool {
    name: string;
    description?: string;
    inputSchema: any;
    outputSchema: any;
    handler: (params: any) => Promise<any> | any;
    annotations?: any;
  }
}
