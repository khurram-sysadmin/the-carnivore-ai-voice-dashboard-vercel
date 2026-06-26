process.env.VERCEL = process.env.VERCEL || "1";

let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = import("../server").then((module) => module.default);
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
