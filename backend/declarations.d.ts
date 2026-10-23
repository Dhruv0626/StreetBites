declare module "express" {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;
  export type RequestHandler = any;
  export type Router = any;
  export function Router(): any;
  export interface Express {
    [key: string]: any;
  }
  function express(): any;
  namespace express {
    export type Request = any;
    export type Response = any;
    export type NextFunction = any;
    export type Router = any;
    export function Router(): any;
    export function json(options?: any): any;
    export function urlencoded(options?: any): any;
  }
  export default express;
}

declare module "cookie-parser" {
  const cookieParser: any;
  export default cookieParser;
}

declare module "cors" {
  const cors: any;
  export default cors;
}

declare module "dotenv" {
  export const config: (options?: any) => any;
  const dotenv: {
    config: (options?: any) => any;
  };
  export default dotenv;
}

declare module "jsonwebtoken" {
  export const sign: (payload: any, secretOrPrivateKey: any, options?: any) => string;
  export const verify: (token: string, secretOrPublicKey: any, options?: any) => any;
  export const decode: (token: string, options?: any) => any;
  const jwt: {
    sign: (payload: any, secretOrPrivateKey: any, options?: any) => string;
    verify: (token: string, secretOrPublicKey: any, options?: any) => any;
    decode: (token: string, options?: any) => any;
  };
  export default jwt;
}

declare module "argon2" {
  export const hash: (plain: string | Buffer, options?: any) => Promise<string>;
  export const verify: (hash: string, plain: string | Buffer, options?: any) => Promise<boolean>;
  export const argon2d: number;
  export const argon2i: number;
  export const argon2id: number;
  const argon2: {
    hash: (plain: string | Buffer, options?: any) => Promise<string>;
    verify: (hash: string, plain: string | Buffer, options?: any) => Promise<boolean>;
    argon2d: number;
    argon2i: number;
    argon2id: number;
  };
  export default argon2;
}

declare var process: {
  env: {
    [key: string]: string | undefined;
  };
};

declare module "dns" {
  export function setServers(servers: string[]): void;
}

declare module "node:dns" {
  export function setServers(servers: string[]): void;
}