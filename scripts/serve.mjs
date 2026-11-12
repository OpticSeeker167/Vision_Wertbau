import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.json':'application/json'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const requested=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(requested.endsWith('/')?requested+'index.html':requested));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Acceso denegado');return;}const info=await stat(file);if(!info.isFile())throw new Error('not file');const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Archivo no encontrado');}}).listen(port,'127.0.0.1',()=>console.log('Vision Wertbau: http://localhost:'+port));
