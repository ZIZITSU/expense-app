import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  distDir:'.vercel-next',
  serverExternalPackages:['@libsql/client'],
  webpack(config,{webpack}){
    // Replace before Next's TypeScript path resolver handles the @ alias.
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@\/lib\/(database|runtime)$/,(resource:{request:string})=>{
      resource.request=path.resolve(resource.request.endsWith('/database')?'lib/vercel-database.ts':'lib/vercel-runtime.ts');
    }));
    config.resolve.alias={...config.resolve.alias,
      '@/lib/database':path.resolve('lib/vercel-database.ts'),
      '@/lib/runtime':path.resolve('lib/vercel-runtime.ts'),
    };
    return config;
  },
};

export default nextConfig;
