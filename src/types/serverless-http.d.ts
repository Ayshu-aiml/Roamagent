declare module 'serverless-http' {
  import { Application } from 'express';
  function serverless(app: Application, opts?: Record<string, any>): any;
  export = serverless;
}
